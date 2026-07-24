#!/usr/bin/env python3
"""
Загружает категории из YAML (catalog_selector) в таблицу crawl_targets PostgreSQL.
Использование:
$ python load_catalog_to_pg.py config.yaml --db-name mydb --db-user postgres --db-password pass
$ python load_catalog_to_pg.py config.yaml --dry-run
$ python load_catalog_to_pg.py config.yaml --field-selectors '{"title":"h1","price":".price"}' --max-depth 3
"""
from __future__ import annotations

import json
import uuid
import yaml
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Tuple, Optional
import click
import psycopg2
from psycopg2.extras import execute_values

def validate_json(ctx: click.Context, param: click.Parameter, value: str) -> dict | list | None:
    """Callback для валидации JSON-строк из CLI."""
    if value is None:
        return None
    try:
        return json.loads(value)
    except json.JSONDecodeError as e:
        raise click.BadParameter(f"Невалидный JSON: {e}")

def load_yaml_pages(yaml_path: Path) -> List[dict]:
    """Загружает и валидирует список страниц из YAML."""
    with open(yaml_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    
    if not data or "pages" not in data:
        raise click.ClickException("YAML файл должен содержать ключ 'pages' со списком категорий.")
    
    pages = data["pages"]
    if not isinstance(pages, list):
        raise click.ClickException("Ключ 'pages' должен быть списком.")
        
    # Базовая валидация обязательных полей
    for i, page in enumerate(pages):
        if not page.get("name") or not page.get("url"):
            raise click.ClickException(f"Страница #{i+1} отсутствует 'name' или 'url'.")
            
    return pages

@click.command(context_settings=dict(help_option_names=["-h", "--help"]))
@click.argument("yaml_path", type=click.Path(exists=True, file_okay=True, dir_okay=False, path_type=Path))
# ── Подключение к БД ──
@click.option("--db-host", default="localhost", help="Хост PostgreSQL")
@click.option("--db-port", default=5432, type=int, help="Порт PostgreSQL")
@click.option("--db-name", required=True, help="Имя базы данных")
@click.option("--db-user", required=True, help="Пользователь БД")
@click.option("--db-password", required=True, help="Пароль пользователя БД")
# ── Настройки парсинга (дефолты для NULL/отсутствующих полей) ──
@click.option("--max-depth", default=2, type=int, show_default=True, help="Значение для колонки MaxDepth")
@click.option(
    "--allowed-domains",
    callback=validate_json,
    default='["wildberries.ru", "www.wildberries.ru"]',
    help="JSON массив доменов (AllowedDomains)"
)
@click.option(
    "--field-selectors",
    callback=validate_json,
    default='{"title": ".product-card__name", "price": ".price__block-value", "image": ".product-card__photo img"}',
    help="JSON объект для ParsingRules_FieldSelectors"
)
@click.option("--item-container", default=".product-card", help="CSS селектор контейнера товара")
@click.option(
    "--attribute-map", callback=validate_json, default=None,
    help="JSON для ParsingRules_AttributeMap (по умолчанию NULL)"
)
@click.option(
    "--follow-link-selectors", callback=validate_json, default=None,
    help="JSON для ParsingRules_FollowLinkSelectors (по умолчанию NULL)"
)
@click.option("--pagination-selector", default=None, help="Селектор пагинации (по умолчанию NULL)")
@click.option("--antibot-blocked", default=None, help="Селектор блокировки (по умолчанию NULL)")
@click.option("--antibot-waiting", default=None, help="Селектор ожидания (по умолчанию NULL)")
# ── Опции выполнения ──
@click.option("--batch-size", default=100, type=int, show_default=True, help="Размер пакета INSERT")
@click.option("--dry-run", is_flag=True, help="🧪 Показать сгенерированные данные без вставки в БД")
@click.option("-v", "--verbose", is_flag=True, help="Подробный вывод")
def load_catalog_to_pg(
    yaml_path: Path,
    db_host: str,
    db_port: int,
    db_name: str,
    db_user: str,
    db_password: str,
    max_depth: int,
    allowed_domains: list | None,
    field_selectors: dict | None,
    item_container: str,
    attribute_map: dict | None,
    follow_link_selectors: list | None,
    pagination_selector: str | None,
    antibot_blocked: str | None,
    antibot_waiting: str | None,
    batch_size: int,
    dry_run: bool,
    verbose: bool,
) -> None:
    """
    📦 Загружает Wildberries категории из YAML в таблицу crawl_targets.
    \b
    YAML ожидается в формате:
    pages:
      - id: "12345"
        name: "Одежда"
        url: "https://www.wildberries.ru/catalog/12345"
        parent_catalog_id: null
    """
    pages = load_yaml_pages(yaml_path)
    click.echo(f"📖 Загружено {len(pages)} категорий из {yaml_path}")

    # Подготовка данных для вставки
    now = datetime.now(timezone.utc)
    rows: List[Tuple] = []
    
    for page in pages:
        rows.append((
            str(uuid.uuid4()),                      # Id (UUID v4)
            page["name"],                           # Name
            page["url"],                            # StartUrl
            json.dumps(allowed_domains),            # AllowedDomains (JSONB)
            max_depth,                              # MaxDepth
            item_container,                         # ParsingRules_ItemContainerSelector
            json.dumps(field_selectors),            # ParsingRules_FieldSelectors (JSONB)
            json.dumps(attribute_map) if attribute_map else None,  # ParsingRules_AttributeMap (JSONB)
            json.dumps(follow_link_selectors) if follow_link_selectors else None,  # ParsingRules_FollowLinkSelectors (JSONB)
            pagination_selector,                    # ParsingRules_PaginationSelector
            True,                                   # IsActive
            now,                                    # CreatedAt
            antibot_blocked,                        # ParsingRules_Antibot_BlockedSelector
            antibot_waiting,                        # ParsingRules_Antibot_WaitingSelector
        ))

    if dry_run:
        click.echo("\n🧪 DRY-RUN: первые 3 записи:")
        for r in rows[:3]:
            click.echo(f"  • {r[1]} | {r[2]} | Depth: {r[4]} | Active: {r[10]}")
        click.echo(f"\n✅ Всего подготовлено: {len(rows)} записей. Для реальной вставки уберите --dry-run")
        return

    # Подключение и батчевая вставка
    sql_template = """(
        %s, %s, %s, %s::jsonb, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb,
        %s, %s, %s, %s, %s
    )"""
    
    insert_query = f"""
    INSERT INTO crawl_targets (
        "Id", "Name", "StartUrl", "AllowedDomains", "MaxDepth",
        "ParsingRules_ItemContainerSelector", "ParsingRules_FieldSelectors",
        "ParsingRules_AttributeMap", "ParsingRules_FollowLinkSelectors",
        "ParsingRules_PaginationSelector", "IsActive", "CreatedAt",
        "ParsingRules_Antibot_BlockedSelector", "ParsingRules_Antibot_WaitingSelector"
    ) VALUES %s
    """

    conn = None
    try:
        click.echo(f"🔌 Подключение к {db_host}:{db_port}/{db_name}...")
        conn = psycopg2.connect(
            host=db_host, port=db_port, dbname=db_name,
            user=db_user, password=db_password
        )
        conn.autocommit = False
        cur = conn.cursor()
        
        click.echo("🚀 Вставка данных...")
        with click.progressbar(
            length=len(rows),
            label="📝 Обработка",
            show_pos=True,
            width=50
        ) as bar:
            for i in range(0, len(rows), batch_size):
                batch = rows[i:i + batch_size]
                execute_values(cur, insert_query, batch, template=sql_template)
                bar.update(len(batch))
                
        conn.commit()
        click.echo(f"\n✅ Успешно вставлено {len(rows)} категорий в crawl_targets.")
        
    except psycopg2.Error as e:
        if conn:
            conn.rollback()
        click.echo(f"\n❌ Ошибка БД: {e}", err=True)
        raise click.Abort()
    except Exception as e:
        click.echo(f"\n❌ Критическая ошибка: {e}", err=True)
        raise click.Abort()
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    load_catalog_to_pg()