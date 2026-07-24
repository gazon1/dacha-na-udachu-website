#!/usr/bin/env python3
"""
bd-update.py — Удобное обновление эпиков через `bd update` с поддержкой диапазонов и регексов.
"""

import click
import subprocess
import sys
import re
from pathlib import Path
from typing import List, Optional, Tuple, Dict
from dataclasses import dataclass

from .utils.epic_expander import expand_ranges, expand_regex

# 🔷 Конфигурация
BEADS_WORKSPACE = Path("/workspace")
DEFAULT_BD_COMMAND = "bd"

@dataclass
class UpdateResult:
    epic_id: str
    success: bool
    error: Optional[str] = None
    output: str = ""

def get_available_epics_from_beads(limit: int = 100) -> List[str]:
    """Получает список эпиков из Beads для regex-матчинга."""
    try:
        result = subprocess.run(
            [DEFAULT_BD_COMMAND, "query", "type=epic", "--limit", str(limit)],
            cwd=BEADS_WORKSPACE,
            capture_output=True,
            text=True,
            check=False,
            timeout=30,
        )
        epics = []
        for line in result.stdout.splitlines():
            matches = re.findall(r"workspace-[a-z0-9.]+", line, re.IGNORECASE)
            epics.extend(matches)
        return list(dict.fromkeys(epics))
    except Exception as e:
        click.echo(click.style(f"⚠️  Ошибка запроса к Beads: {e}", fg="yellow"), err=True)
        return []

def parse_epics(
    epic_string: str,
    available_epics: Optional[List[str]] = None,
    require_beads_for_regex: bool = True,
) -> List[str]:
    """Парсит строку эпиков с поддержкой диапазонов и регексов."""
    if not epic_string.strip():
        return []

    # Проверяем на наличие регекс-символов
    regex_chars = ['*', '^', '$', '[', ']']
    has_regex = any(c in epic_string for c in regex_chars)

    if has_regex:
        if require_beads_for_regex and not available_epics:
            click.echo(click.style("❌ Regex-паттерны требуют --from-beads", fg="red"))
            click.echo(click.style("💡 Пример: bd-update 'workspace-y8nt.*' --from-beads --type epic", fg="yellow"))
            sys.exit(1)
        if available_epics:
            epics, _ = expand_regex(epic_string, available_epics)
            return epics
        return [epic_string]

    epics, errors = expand_ranges(epic_string)
    for err in errors:
        click.echo(click.style(f"⚠️  {err}", fg="yellow"), err=True)
    return epics

def build_bd_update_command(
    epic_id: str,
    type_value: Optional[str] = None,
    status_value: Optional[str] = None,
    set_fields: Optional[Dict[str, str]] = None,
    additional_args: Optional[List[str]] = None,
) -> List[str]:
    """Строит команду `bd update` с указанными параметрами."""
    cmd = [DEFAULT_BD_COMMAND, "update", epic_id]
    
    if type_value:
        cmd.extend(["--type", type_value])
    
    if status_value:
        cmd.extend(["--status", status_value])
    
    if set_fields:
        for key, value in set_fields.items():
            cmd.extend(["--set", f"{key}={value}"])
    
    if additional_args:
        cmd.extend(additional_args)
    
    return cmd

def update_epic(
    epic_id: str,
    type_value: Optional[str] = None,
    status_value: Optional[str] = None,
    set_fields: Optional[Dict[str, str]] = None,
    additional_args: Optional[List[str]] = None,
    dry_run: bool = False,
    verbose: bool = False,
) -> UpdateResult:
    """Выполняет `bd update` для одного эпика."""
    cmd = build_bd_update_command(
        epic_id=epic_id,
        type_value=type_value,
        status_value=status_value,
        set_fields=set_fields,
        additional_args=additional_args,
    )
    
    if dry_run or verbose:
        click.echo(click.style(f"🔧 Команда: {' '.join(cmd)}", fg="cyan", dim=True))
    
    if dry_run:
        return UpdateResult(epic_id=epic_id, success=True, output="(dry-run)")
    
    try:
        result = subprocess.run(
            cmd,
            cwd=BEADS_WORKSPACE,
            capture_output=True,
            text=True,
            check=False,
            timeout=120,
        )
        return UpdateResult(
            epic_id=epic_id,
            success=result.returncode == 0,
            error=result.stderr.strip() if result.returncode != 0 else None,
            output=result.stdout.strip(),
        )
    except subprocess.TimeoutExpired:
        return UpdateResult(epic_id=epic_id, success=False, error="Timeout")
    except FileNotFoundError:
        return UpdateResult(epic_id=epic_id, success=False, error="Команда 'bd' не найдена")
    except Exception as e:
        return UpdateResult(epic_id=epic_id, success=False, error=str(e))

def parse_set_fields(set_values: Tuple[str, ...]) -> Dict[str, str]:
    """Парсит значения --set в формате key=value."""
    fields = {}
    for item in set_values:
        if '=' not in item:
            click.echo(click.style(f"⚠️  Неправильный формат --set: {item} (ожидалось key=value)", fg="yellow"), err=True)
            continue
        key, value = item.split('=', 1)
        fields[key.strip()] = value.strip()
    return fields

@click.command(context_settings=dict(help_option_names=["-h", "--help"]))
@click.argument("epics", nargs=-1, required=True)
@click.option(
    "--type", "type_value",
    type=str,
    help="🏷️ Тип сущности (например: epic, task, project)",
)
@click.option(
    "--status", "status_value",
    type=str,
    help="📊 Статус (например: open, done, in-progress)",
)
@click.option(
    "--set", "set_fields",
    multiple=True,
    help="🔧 Установить поле в формате key=value (можно указывать несколько раз)",
)
@click.option(
    "--from-beads",
    "use_beads",
    is_flag=True,
    help="🔍 Использовать Beads для разрешения регекс-паттернов",
)
@click.option(
    "-l", "--limit",
    type=int,
    default=100,
    show_default=True,
    help="📊 Лимит эпиков из Beads (при --from-beads)",
)
@click.option(
    "-n", "--dry-run",
    is_flag=True,
    help="🧪 Показать команды без выполнения",
)
@click.option(
    "-v", "--verbose",
    is_flag=True,
    help="🔍 Подробный вывод",
)
@click.option(
    "-q", "--quiet",
    is_flag=True,
    help="🤫 Тихий режим — только ошибки и итог",
)
@click.option(
    "--continue-on-error",
    is_flag=True,
    help="➡️  Продолжать обработку следующих эпиков при ошибке",
)
@click.option(
    "--additional", "additional_args",
    multiple=True,
    help="🔽 Дополнительные аргументы для bd update",
)
def bd_update(
    epics: Tuple[str, ...],
    type_value: Optional[str],
    status_value: Optional[str],
    set_fields: Tuple[str, ...],
    use_beads: bool,
    limit: int,
    dry_run: bool,
    verbose: bool,
    quiet: bool,
    continue_on_error: bool,
    additional_args: Tuple[str, ...],
) -> None:
    """
    🔗 Обновляет эпики через `bd update` с поддержкой диапазонов и регексов.
    
    EPICS — список эпиков или паттернов.
    
    🔹 Поддерживаемые форматы:
      • Точное имя:    workspace-y8nt
      • Диапазон:      workspace-y8nt.1:3  →  1, 2, 3
      • Bash-range:    workspace-y8nt{1..5}
      • Regex:         workspace-y8nt.*     (требует --from-beads)
    
    Примеры:
      $ bd-update workspace-y8nt --type epic
      $ bd-update "workspace-y8nt.1:3" --type epic --set status=done
      $ bd-update "workspace-y8nt{1..5}" --type epic --set priority=high
      $ bd-update "workspace-y8nt.*" --from-beads --type epic  # ← важно!
      $ bd-update --dry-run "epic-1:3" --type epic
    """
    # 1. Собираем список эпиков
    epic_string = " ".join(epics)
    available_epics = get_available_epics_from_beads(limit) if (use_beads or verbose) else []
    
    expanded_epics = parse_epics(
        epic_string,
        available_epics if use_beads else None,
        require_beads_for_regex=True,
    )
    
    # Парсим --set поля
    parsed_set_fields = parse_set_fields(set_fields) if set_fields else None
    
    # Проверка: хотя бы одно поле для обновления
    if not type_value and not status_value and not parsed_set_fields:
        click.echo(click.style("❌ Не указано ни одного поля для обновления.", fg="red"))
        click.echo(click.style("💡 Используйте --type, --status или --set key=value", fg="yellow"))
        sys.exit(1)
    
    if not expanded_epics:
        click.echo(click.style("❌ Не указано ни одного эпика.", fg="red"))
        sys.exit(1)
    
    # 2. Dry-run или выполнение
    if dry_run:
        click.echo(click.style("🧪 DRY-RUN: запланированные команды:", fg="yellow"))
        for epic in expanded_epics:
            cmd = build_bd_update_command(
                epic_id=epic,
                type_value=type_value,
                status_value=status_value,
                set_fields=parsed_set_fields,
                additional_args=list(additional_args) if additional_args else None,
            )
            click.echo(f"   $ {' '.join(cmd)}")
        return
    
    # 3. Заголовок
    if not quiet:
        click.echo()
        click.echo(click.style("═" * 60, bold=True))
        click.echo(click.style(f"🔗 Обновление эпиков: {len(expanded_epics)} шт.", bold=True))
        click.echo(click.style("═" * 60, bold=True))
        
        updates = []
        if type_value:
            updates.append(f"type={type_value}")
        if status_value:
            updates.append(f"status={status_value}")
        if parsed_set_fields:
            for k, v in parsed_set_fields.items():
                updates.append(f"{k}={v}")
        
        click.echo(click.style(f"   📝 Параметры: {', '.join(updates)}", fg="cyan"))
        
        if verbose:
            click.echo(click.style("   📋 Эпики:", fg="cyan"))
            for i, epic in enumerate(expanded_epics, 1):
                click.echo(click.style(f"     {i}. {epic}", fg="dim"))
        
        click.echo(click.style("═" * 60, bold=True))
        click.echo()
    
    # 4. Обработка эпиков
    results: List[UpdateResult] = []
    failed: List[UpdateResult] = []
    
    for idx, epic in enumerate(expanded_epics, 1):
        if not quiet:
            prefix = f"[{idx}/{len(expanded_epics)}]"
            click.echo(click.style(f"🔄 {prefix} Обновляю: {epic}", fg="blue"))
        
        result = update_epic(
            epic_id=epic,
            type_value=type_value,
            status_value=status_value,
            set_fields=parsed_set_fields,
            additional_args=list(additional_args) if additional_args else None,
            dry_run=dry_run,
            verbose=verbose,
        )
        results.append(result)
        
        if result.success:
            if not quiet:
                click.echo(click.style(f"✅ {epic}", fg="green"))
                if verbose and result.output:
                    click.echo(click.style(f"   {result.output}", fg="dim"))
        else:
            failed.append(result)
            if not quiet:
                click.echo(click.style(f"❌ {epic}: {result.error}", fg="red"))
            if not continue_on_error:
                click.echo(click.style("🛑 Остановка из-за ошибки (добавьте --continue-on-error для продолжения)", fg="yellow"))
                break
    
    # 5. Итоговый отчёт
    if not quiet:
        click.echo()
        click.echo(click.style("═" * 60, bold=True))
        if not failed:
            click.echo(click.style("✅ ВСЕ ЭПИКИ УСПЕШНО ОБНОВЛЕНЫ", fg="green", bold=True))
        elif failed:
            click.echo(click.style(f"❌ ЗАВЕРШЕНО С ОШИБКАМИ: {len(failed)} эпик(ов)", fg="red", bold=True))
        click.echo(click.style("═" * 60, bold=True))
        
        if failed and verbose:
            click.echo(click.style("\n📋 Ошибки:", fg="red", bold=True))
            for res in failed:
                click.echo(click.style(f"  • {res.epic_id}: {res.error}", fg="red", dim=True))
    
    if failed:
        sys.exit(1)

if __name__ == "__main__":
    bd_update()