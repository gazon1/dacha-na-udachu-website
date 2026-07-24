#!/usr/bin/env python3
"""
compile-docs.py — Компиляция документации из Markdown файлов в HTML/PDF.

Собирает все .md файлы из указанной директории (рекурсивно) в единый
HTML-документ с настроенными внутренними ссылками, и опционально конвертирует в PDF.
"""

from __future__ import annotations

import logging
import os
import re
import subprocess
import time
from pathlib import Path
from typing import Optional

import click
import markdown
from bs4 import BeautifulSoup
from tqdm import tqdm


# ── HTML-шаблон ───────────────────────────────────────────────────────────────

HEAD_TEMPLATE = """<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
    <style>
        @page {{
            size: A4;
            margin: 20mm 15mm;
            @bottom-right {{
                content: counter(page);
                font-size: 9pt;
                font-family: Arial, sans-serif;
            }}
        }}
        body {{
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            font-size: 10pt;
        }}
        .pdf-section {{
            break-before: page;
        }}
        h1, h2, h3, h4 {{
            color: #02569B;
            break-after: avoid-page;
        }}
        pre, code {{
            font-family: 'Courier New', Courier, monospace;
            background-color: #f5f5f5;
            font-size: 9pt;
        }}
        pre {{
            padding: 10px;
            border-left: 3px solid #0175C2;
            white-space: pre-wrap;
            word-wrap: break-word;
            break-inside: avoid-page;
        }}
        a {{
            color: #0175C2;
            text-decoration: none;
        }}
    </style>
</head>
<body>
"""

COVER_PAGE_TEMPLATE = """    <div id="cover-page" style="page-break-after: always; text-align: center; padding-top: 100px;">
        <h1 style="font-size: 36pt; color: #02569B; margin-bottom: 10px;">{title}</h1>
        <p style="font-size: 18pt; color: #666;">Скомпилированная документация</p>
    </div>
"""

# Полный шаблон (обложка + стили) — используется для единого HTML-документа
# и для обычного (не батчевого) режима генерации PDF.
HTML_TEMPLATE = HEAD_TEMPLATE + COVER_PAGE_TEMPLATE



# ── Вспомогательные функции ───────────────────────────────────────────────────

def get_anchor_id(file_path: Path, content_dir: Path) -> str:
    """Генерирует уникальный ID (якорь) для секции на основе относительного пути к файлу."""
    try:
        relative_path = file_path.relative_to(content_dir)
    except ValueError:
        relative_path = file_path

    clean_path = relative_path.with_suffix("").as_posix()
    clean_id = re.sub(r'[^a-zA-Z0-9\-]', '_', clean_path)
    return f"doc_{clean_id}"


def build_path_to_anchor_map(md_files: list[Path], content_dir: Path) -> dict[str, str]:
    """Создаёт карту соответствия относительных путей файлов к их HTML-якорям."""
    path_to_anchor_map: dict[str, str] = {}
    for file_path in md_files:
        rel_key = file_path.relative_to(content_dir).with_suffix("").as_posix()
        path_to_anchor_map[rel_key] = get_anchor_id(file_path, content_dir)
    return path_to_anchor_map


def resolve_asset_path(src: str, file_path: Path, content_dir: Path) -> Optional[Path]:
    """
    Пытается найти реальный файл картинки на диске для относительного/корневого
    пути из Markdown (например '/assets/images/x.png' или '../img/x.png').

    Такие пути обычно "корневые" относительно исходного сайта документации
    (напр. https://docs.flutter.dev/assets/...), а не относительно файловой
    системы — поэтому их нельзя использовать как есть.

    Пробуем по очереди:
      1. content_dir / src (без ведущего слэша) — картинки лежат рядом с доками
      2. путь относительно директории самого md-файла
      3. поиск файла по имени во всём content_dir (на случай нестандартной раскладки)
    """
    clean_src = src.lstrip("/")
    content_dir = content_dir.resolve()

    candidates = [
        (content_dir / clean_src).resolve(),
        (file_path.parent / src).resolve(),
    ]

    for candidate in candidates:
        if candidate.exists():
            return candidate

    # Фолбэк: ищем файл с таким же именем где-нибудь внутри content_dir
    filename = Path(clean_src).name
    if filename:
        matches = list(content_dir.rglob(filename))
        if matches:
            return matches[0]

    return None


def convert_md_to_html(
    md_content: str,
    file_path: Path,
    content_dir: Path,
    path_to_anchor_map: dict[str, str],
    logger: Optional[logging.Logger] = None,
) -> str:
    """Конвертирует Markdown в HTML с исправлением внутренних ссылок и картинок."""
    md_parser = markdown.Markdown(extensions=['extra', 'codehilite'])
    raw_html = md_parser.convert(md_content)
    soup = BeautifulSoup(raw_html, "html.parser")

    section_id = get_anchor_id(file_path, content_dir)
    log = logger or logging.getLogger("compile_docs")

    # Корректируем внутренние ссылки
    for link in soup.find_all("a", href=True):
        href = link["href"]

        if not href.startswith(("http://", "https://", "mailto:", "#")):
            clean_href = href.split("#")[0].strip("/")
            hash_part = href.split("#")[1] if "#" in href else ""

            normalized_href = os.path.normpath(clean_href).replace("\\", "/")

            if normalized_href in path_to_anchor_map:
                target_anchor = path_to_anchor_map[normalized_href]
                link["href"] = f"#{target_anchor}" + (f"_{hash_part}" if hash_part else "")
            elif clean_href == "" and hash_part:
                link["href"] = f"#{section_id}_{hash_part}"

    # Корректируем пути к картинкам: превращаем "корневые" пути документации
    # (/assets/...) и относительные пути в реальные пути на файловой системе,
    # понятные WeasyPrint (file:// или относительно итогового HTML).
    for img in soup.find_all("img", src=True):
        src = img["src"]

        if src.startswith(("http://", "https://", "data:")):
            continue

        resolved = resolve_asset_path(src, file_path, content_dir)
        if resolved is not None:
            img["src"] = resolved.as_uri()
        else:
            log.warning(
                "Не найдена картинка '%s', указанная в %s — оставляю как есть",
                src, file_path,
            )

    return str(soup)


def render_pdf_batched(
    section_fragments: list[str],
    title: str,
    batch_size: int,
    output_pdf: Path,
    cache: Optional[dict] = None,
    logger: Optional[logging.Logger] = None,
) -> None:
    """
    Рендерит секции группами по `batch_size` в отдельные временные PDF и
    склеивает их через pypdf.

    Почему это быстрее: WeasyPrint пересчитывает пагинацию по всему документу
    целиком, поэтому время рендера растёт быстрее, чем линейно, с ростом числа
    страниц. Нарезка на независимые куски превращает эту зависимость обратно
    в линейную ценой временных файлов на диске и финального шага склейки.
    """
    from weasyprint import HTML
    from pypdf import PdfWriter

    log = logger or logging.getLogger("compile_docs.pdf")
    batches = [
        section_fragments[i:i + batch_size]
        for i in range(0, len(section_fragments), batch_size)
    ]

    tmp_dir = output_pdf.parent / f".{output_pdf.stem}_batches_tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    batch_files: list[Path] = []

    try:
        for i, batch in enumerate(tqdm(batches, desc="  HTML → PDF (батчи)", unit="batch"), start=1):
            cover = COVER_PAGE_TEMPLATE.format(title=title) if i == 1 else ""
            batch_html = HEAD_TEMPLATE.format(title=title) + cover + "".join(batch) + "</body>\n</html>"
            batch_pdf = tmp_dir / f"batch_{i:04d}.pdf"
            write_kwargs = {"cache": cache} if cache is not None else {}
            HTML(string=batch_html, base_url=str(tmp_dir)).write_pdf(str(batch_pdf), **write_kwargs)
            batch_files.append(batch_pdf)
            log.info("Батч %d/%d готов: %s", i, len(batches), batch_pdf)

        with PdfWriter() as writer:
            for batch_pdf in batch_files:
                writer.append(str(batch_pdf))
            writer.write(str(output_pdf))
    finally:
        for batch_pdf in batch_files:
            batch_pdf.unlink(missing_ok=True)
        try:
            tmp_dir.rmdir()
        except OSError:
            pass


# ── Click CLI ─────────────────────────────────────────────────────────────────

@click.command(context_settings=dict(help_option_names=["-h", "--help"]))
@click.argument(
    "docs_path",
    type=click.Path(exists=True, file_okay=False, dir_okay=True, path_type=Path),
)
@click.option(
    "--output-html",
    "-o",
    type=click.Path(dir_okay=False, path_type=Path),
    default=None,
    help="Путь к выходному HTML файлу (по умолчанию: <docs_path>/compiled_docs.html)",
)
@click.option(
    "--output-pdf",
    "-p",
    type=click.Path(dir_okay=False, path_type=Path),
    default=None,
    help="Путь к выходному PDF файлу (по умолчанию: <docs_path>/compiled_docs.pdf)",
)
@click.option(
    "--title",
    "-t",
    type=str,
    default="Documentation",
    show_default=True,
    help="Заголовок документа (отображается на титульной странице)",
)
@click.option(
    "--no-pdf",
    is_flag=True,
    help="Пропустить генерацию PDF (только HTML)",
)
@click.option(
    "-v", "--verbose",
    is_flag=True,
    help="Подробный вывод",
)
@click.option(
    "--batch-size",
    type=int,
    default=None,
    help=(
        "Рендерить PDF по частям (N md-файлов на часть) и склеивать через pypdf. "
        "Ускоряет генерацию на больших наборах файлов (WeasyPrint пересчитывает "
        "пагинацию глобально, поэтому один большой документ растёт нелинейно). "
        "По умолчанию — рендер одним куском. Рекомендуется для 100+ файлов, "
        "например --batch-size 50."
    ),
)
@click.option(
    "--debug",
    is_flag=True,
    help="Включить DEBUG-логирование WeasyPrint (для отладки зависаний).",
)
def compile_docs(
    docs_path: Path,
    output_html: Optional[Path],
    output_pdf: Optional[Path],
    title: str,
    no_pdf: bool,
    verbose: bool,
    batch_size: Optional[int],
    debug: bool,
) -> None:
    """
    📚 Компилирует Markdown документацию в HTML/PDF.

    Собирает все .md файлы из DOCS_PATH (рекурсивно) в единый HTML-документ
    с настроенными внутренними ссылками, и опционально конвертирует в PDF.

    Примеры:

        $ sing compile-docs ./docs

        $ sing compile-docs ./flutter-docs --title "Flutter Docs" -o docs.html -p docs.pdf

        $ sing compile-docs ./docs --no-pdf
    """
    # Определяем пути вывода
    if output_html is None:
        output_html = docs_path / "compiled_docs.html"
    if output_pdf is None:
        output_pdf = docs_path / "compiled_docs.pdf"

    # Настраиваем логирование: --debug включает DEBUG-уровень для WeasyPrint,
    # --verbose — INFO; по умолчанию только WARNING.
    log_level = logging.DEBUG if debug else (logging.INFO if verbose else logging.WARNING)
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s.%(msecs)03d [%(levelname)s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )
    # Прогресс WeasyPrint приходит через logging.getLogger('weasyprint')
    # с уровнем PROGRESS (его маппим в INFO) — без шума в обычном режиме.
    if not debug:
        logging.getLogger("weasyprint").setLevel(logging.WARNING)

    # 1. Находим все Markdown файлы
    if verbose:
        click.echo(click.style("🔍 Поиск файлов документации...", fg="cyan"))

    md_files = sorted(list(docs_path.rglob("*.md")))
    if not md_files:
        click.echo(click.style(f"❌ Не найдено ни одного .md файла в '{docs_path}'", fg="red"))
        raise click.Abort()

    if verbose:
        click.echo(click.style(f"   Найдено файлов: {len(md_files)}", dim=True))

    # 2. Строим карту путей → якорей
    path_to_anchor_map = build_path_to_anchor_map(md_files, docs_path)

    # 3. Собираем HTML
    if verbose:
        click.echo(click.style("🧹 Конвертация Markdown...", fg="cyan"))

    html_buffer: list[str] = []
    html_buffer.append(HTML_TEMPLATE.format(title=title))

    # Каждый элемент — готовый HTML-фрагмент одной секции (используется и
    # для полного HTML, и, при --batch-size, для нарезки на PDF-партии.
    section_fragments: list[str] = []

    for file_path in tqdm(md_files, desc="  Markdown → HTML", unit="file"):
        section_id = get_anchor_id(file_path, docs_path)

        with open(file_path, "r", encoding="utf-8") as f:
            md_content = f.read()

        soup_html = convert_md_to_html(
            md_content, file_path, docs_path, path_to_anchor_map,
            logger=logging.getLogger("compile_docs.assets"),
        )

        fragment = f'<div id="{section_id}" class="pdf-section">{soup_html}</div>\n'
        section_fragments.append(fragment)
        html_buffer.append(fragment)

    html_buffer.append("</body>\n</html>")

    # 4. Сохраняем HTML
    output_html = output_html.resolve()
    with open(output_html, "w", encoding="utf-8") as f:
        f.write("".join(html_buffer))

    click.echo(click.style(f"✔ HTML сохранён: {output_html}", fg="green"))

    # 5. Генерируем PDF (если не отключено)
    if no_pdf:
        return

    if verbose:
        click.echo(click.style("🎨 Генерация PDF (WeasyPrint)...", fg="cyan"))

    pdf_logger = logging.getLogger("compile_docs.pdf")
    pdf_logger.info("Старт рендеринга PDF из %s", output_html)
    pdf_start = time.monotonic()

    # ── Режим батчинга: рендерим группами и склеиваем ──────────────────
    if batch_size:
        click.echo(
            click.style(
                f"⚠️  Внутренние ссылки (#doc_...) между разными md-файлами "
                f"не будут работать в PDF при --batch-size (только в HTML-версии), "
                f"так как каждая партия из {batch_size} файлов рендерится как "
                f"отдельный PDF-документ.",
                fg="yellow",
            )
        )
        try:
            import pypdf  # noqa: F401  (проверяем наличие заранее, с понятной ошибкой)
        except ImportError:
            click.echo(
                click.style(
                    "❌ Для --batch-size нужен пакет pypdf. Установите: pip install pypdf",
                    fg="red",
                )
            )
            raise click.Abort()

        try:
            render_pdf_batched(
                section_fragments,
                title=title,
                batch_size=batch_size,
                output_pdf=output_pdf,
                cache={},
                logger=pdf_logger,
            )
            pdf_logger.info("PDF готов (батчами) за %.1fs: %s", time.monotonic() - pdf_start, output_pdf)
            click.echo(click.style(f"🎉 PDF сохранён: {output_pdf}", fg="green"))
        except Exception as exc:
            pdf_logger.exception("Ошибка при батч-генерации PDF после %.1fs: %s", time.monotonic() - pdf_start, exc)
            click.echo(
                click.style(
                    f"❌ Не удалось сгенерировать PDF (батч-режим): {exc}\n"
                    f"   Запусти с --debug для подробного лога WeasyPrint.",
                    fg="red",
                )
            )
        return

    # ── Обычный режим: один вызов WeasyPrint на весь документ ──────────
    try:
        from weasyprint import HTML
        pbar = tqdm(total=100, desc="  HTML → PDF", unit="%", leave=False)

        def progress_log(value: float) -> None:
            # WeasyPrint может слать value с плавающей точкой, а между фазами
            # значение иногда "откатывается" — защищаемся от отрицательной дельты,
            # иначе tqdm молча падает.
            delta = int(value) - pbar.n
            if delta > 0:
                pbar.update(delta)
            elapsed = time.monotonic() - pdf_start
            pdf_logger.info("WeasyPrint: %.1f%% [+%.1fs]", value, elapsed)

        import inspect
        supports_progress = "progress_callback" in inspect.signature(HTML.write_pdf).parameters
        supports_cache = "cache" in inspect.signature(HTML.write_pdf).parameters

        write_pdf_kwargs = {}
        if supports_cache:
            # Общий кэш картинок: если один и тот же ассет (логотип, иконка)
            # используется в нескольких md-файлах, он декодируется и
            # оптимизируется только один раз, а не при каждом упоминании.
            write_pdf_kwargs["cache"] = {}

        try:
            if supports_progress:
                HTML(str(output_html)).write_pdf(
                    str(output_pdf), progress_callback=progress_log, **write_pdf_kwargs
                )
            else:
                # В новых версиях WeasyPrint (69+) параметр progress_callback
                # убран — рендерим без пошагового прогресса, чтобы не засорять
                # лог предупреждениями "Unknown rendering option".
                pdf_logger.info(
                    "Текущая версия WeasyPrint не поддерживает progress_callback, "
                    "рендерим без пошагового прогресса"
                )
                HTML(str(output_html)).write_pdf(str(output_pdf), **write_pdf_kwargs)
                pbar.update(100 - pbar.n)
        finally:
            pbar.close()

        pdf_logger.info("PDF готов за %.1fs: %s", time.monotonic() - pdf_start, output_pdf)
        click.echo(click.style(f"🎉 PDF сохранён: {output_pdf}", fg="green"))
    except ImportError:
        if verbose:
            click.echo(click.style("   WeasyPrint Python library not found, using CLI fallback...", dim=True))
        try:
            with tqdm(total=100, desc="  HTML → PDF (CLI)", unit="%", leave=False) as pbar:
                pbar.update(10)
                subprocess.run(
                    ["weasyprint", str(output_html), str(output_pdf)],
                    check=True,
                    capture_output=True,
                )
                pbar.update(90)
            pdf_logger.info("PDF готов (CLI) за %.1fs: %s", time.monotonic() - pdf_start, output_pdf)
            click.echo(click.style(f"🎉 PDF сохранён (через CLI): {output_pdf}", fg="green"))
        except FileNotFoundError:
            pdf_logger.warning("WeasyPrint CLI не найден, PDF пропущен")
            click.echo(
                click.style(
                    "⚠️  WeasyPrint не найден — пропускаем PDF.\n"
                    "   Установите: pip install weasyprint или sudo apt install weasyprint",
                    fg="yellow",
                )
            )
    except Exception as exc:
        # Не даём зависшему рендеру утащить за собой весь процесс — логируем и
        # продолжаем. Если хочешь всё-таки упасть — поменяй на raise.
        pdf_logger.exception("Ошибка при генерации PDF после %.1fs: %s", time.monotonic() - pdf_start, exc)
        click.echo(
            click.style(
                f"❌ Не удалось сгенерировать PDF: {exc}\n"
                f"   Запусти с --debug для подробного лога WeasyPrint.",
                fg="red",
            )
        )


if __name__ == "__main__":
    compile_docs()