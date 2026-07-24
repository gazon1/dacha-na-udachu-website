#!/usr/bin/env python3
"""
bd-close.py — Удобное закрытие эпиков через `bd close` с поддержкой диапазонов и регексов.

Использование:
    $ python bd-close.py workspace-11rj.1 --force
    $ python bd-close.py "workspace-11rj.1:3" --force     # диапазон: 1, 2, 3
    $ python bd-close.py "workspace-11rj{1..5}" --force   # bash-style
    $ python bd-close.py "workspace-11rj.*" --from-beads  # regex + beads
    $ python bd-close.py --dry-run "workspace-11rj.1:3"   # показать команды

Поддерживаемые форматы эпиков:
    • Точное имя:    workspace-11rj.1
    • Диапазон:      workspace-11rj.1:3  →  workspace-11rj.1, workspace-11rj.2, workspace-11rj.3
    • Bash-range:    workspace-11rj{1..5} → workspace-11rj.1 ... workspace-11rj.5
    • Regex:         workspace-11rj.*     → все совпадения из beads
    • Комбинации:    "epic-1:3 workspace-11rj.*"
"""

import click
import subprocess
import sys
import re
from pathlib import Path
from typing import List, Optional, Tuple
from dataclasses import dataclass


# 🔷 Конфигурация
BEADS_WORKSPACE = Path("/workspace")
DEFAULT_BD_COMMAND = "bd"


@dataclass
class CloseResult:
    """Результат закрытия одного эпика."""
    epic_id: str
    success: bool
    error: Optional[str] = None
    output: str = ""


def expand_ranges(epic_string: str) -> List[str]:
    """
    Расширяет диапазоны в строке эпиков.
    
    Поддерживает:
        - "epic-1:3" → ["epic-1", "epic-2", "epic-3"]
        - "epic-1..3" → ["epic-1", "epic-2", "epic-3"]
        - "workspace{1..5}" → ["workspace-1", ..., "workspace-5"]
        - "workspace{1..5}.dart" → ["workspace-1.dart", ..., "workspace-5.dart"]
    """
    epics = []
    
    # Формат 1: prefix-N:M или prefix-N..M
    range_pattern = r'([a-zA-Z0-9_.\-]+?)(\d+):(\d+)'
    for match in re.finditer(range_pattern, epic_string):
        prefix = match.group(1)
        start = int(match.group(2))
        end = int(match.group(3))
        if start > end:
            click.echo(click.style(f"⚠️  Неправильный диапазон: {start} > {end}", fg="yellow"), err=True)
            continue
        for i in range(start, end + 1):
            epics.append(f"{prefix}{i}")
    
    # Формат 2: bash-style {N..M}
    bash_pattern = r'(.*)\{(\d+)\.\.(\d+)\}(.*)'
    for match in re.finditer(bash_pattern, epic_string):
        prefix, start, end, suffix = match.groups()
        start, end = int(start), int(end)
        if start > end:
            click.echo(click.style(f"⚠️  Неправильный диапазон: {start} > {end}", fg="yellow"), err=True)
            continue
        for i in range(start, end + 1):
            epics.append(f"{prefix}{i}{suffix}")
    
    # Если диапазоны найдены — возвращаем
    if epics:
        return epics
    
    # Иначе — просто разбиваем по пробелам
    return [e.strip() for e in epic_string.split() if e.strip()]


def expand_regex(pattern: str, available_epics: List[str]) -> List[str]:
    """Расширяет regex-паттерн до списка совпадающих эпиков."""
    try:
        compiled = re.compile(pattern)
        return [epic for epic in available_epics if compiled.search(epic)]
    except re.error as e:
        click.echo(click.style(f"❌ Ошибка regex '{pattern}': {e}", fg="red"), err=True)
        return []


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
        return list(dict.fromkeys(epics))  # Убираем дубликаты
    except Exception as e:
        click.echo(click.style(f"⚠️  Ошибка запроса к Beads: {e}", fg="yellow"), err=True)
        return []


def parse_epics(
    epic_string: str,
    available_epics: Optional[List[str]] = None,
) -> List[str]:
    """Парсит строку эпиков с поддержкой диапазонов и регексов."""
    if not epic_string.strip():
        return []
    
    # Проверяем на наличие регекс-символов
    if any(c in epic_string for c in ['*', '^', '$', '[', ']']) and not epic_string.startswith('workspace-'):
        if available_epics:
            return expand_regex(epic_string, available_epics)
        else:
            click.echo(click.style(f"⚠️  Regex без доступных эпиков: {epic_string}", fg="yellow"), err=True)
            return [epic_string]
    
    # Расширяем диапазоны
    return expand_ranges(epic_string)


def close_epic(
    epic_id: str,
    force: bool = False,
    dry_run: bool = False,
    verbose: bool = False,
) -> CloseResult:
    """Выполняет `bd close` для одного эпика."""
    cmd = [DEFAULT_BD_COMMAND, "close", epic_id]
    if force:
        cmd.append("--force")
    
    if dry_run or verbose:
        click.echo(click.style(f"🔧 Команда: {' '.join(cmd)}", fg="cyan", dim=True))
    
    if dry_run:
        return CloseResult(epic_id=epic_id, success=True, output="(dry-run)")
    
    try:
        result = subprocess.run(
            cmd,
            cwd=BEADS_WORKSPACE,
            capture_output=True,
            text=True,
            check=False,
            timeout=120,
        )
        return CloseResult(
            epic_id=epic_id,
            success=result.returncode == 0,
            error=result.stderr.strip() if result.returncode != 0 else None,
            output=result.stdout.strip(),
        )
    except subprocess.TimeoutExpired:
        return CloseResult(epic_id=epic_id, success=False, error="Timeout")
    except FileNotFoundError:
        return CloseResult(epic_id=epic_id, success=False, error="Команда 'bd' не найдена")
    except Exception as e:
        return CloseResult(epic_id=epic_id, success=False, error=str(e))


@click.command(context_settings=dict(help_option_names=["-h", "--help"]))
@click.argument("epics", nargs=-1, required=True)
@click.option(
    "-f", "--force",
    is_flag=True,
    help="🔨 Принудительное закрытие (передаёт --force в bd close)",
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
def bd_close(
    epics: Tuple[str, ...],
    force: bool,
    use_beads: bool,
    limit: int,
    dry_run: bool,
    verbose: bool,
    quiet: bool,
    continue_on_error: bool,
) -> None:
    """
    🔗 Закрывает эпики через `bd close` с поддержкой диапазонов и регексов.
    
    EPICS — список эпиков или паттернов.
    
    🔹 Поддерживаемые форматы:
      • Точное имя:    workspace-11rj.1
      • Диапазон:      workspace-11rj.1:3  →  1, 2, 3
      • Bash-range:    workspace-11rj{1..5}
      • Regex:         workspace-11rj.*     (требует --from-beads)
    
    Примеры:
      $ bd-close.py workspace-11rj.1 --force
      $ bd-close.py "workspace-11rj.1:3" --force
      $ bd-close.py "workspace-11rj{1..5}" -f
      $ bd-close.py "workspace-11rj.*" --from-beads -v
      $ bd-close.py --dry-run "epic-1:3"  # показать команды
    """
    # 1. Собираем список эпиков
    epic_string = " ".join(epics)
    available_epics = get_available_epics_from_beads(limit) if (use_beads or verbose) else []
    
    expanded_epics = parse_epics(epic_string, available_epics if use_beads else None)
    
    if not expanded_epics:
        click.echo(click.style("❌ Не указано ни одного эпика.", fg="red"))
        click.echo(click.style("💡 Пример: bd-close.py workspace-11rj.1:3 --force", fg="yellow"))
        sys.exit(1)
    
    # 2. Dry-run или выполнение
    if dry_run:
        click.echo(click.style("🧪 DRY-RUN: запланированные команды:", fg="yellow"))
        for epic in expanded_epics:
            cmd = f"{DEFAULT_BD_COMMAND} close {epic}{' --force' if force else ''}"
            click.echo(f"   $ {cmd}")
        return
    
    # 3. Заголовок
    if not quiet:
        click.echo()
        click.echo(click.style("═" * 60, bold=True))
        click.echo(click.style(f"🔗 Закрытие эпиков: {len(expanded_epics)} шт.", bold=True))
        click.echo(click.style("═" * 60, bold=True))
        if verbose:
            for i, epic in enumerate(expanded_epics, 1):
                click.echo(click.style(f"  {i}. {epic}", fg="cyan"))
        click.echo(click.style("═" * 60, bold=True))
        click.echo()
    
    # 4. Обработка эпиков
    results: List[CloseResult] = []
    failed: List[CloseResult] = []
    
    for idx, epic in enumerate(expanded_epics, 1):
        if not quiet:
            prefix = f"[{idx}/{len(expanded_epics)}]"
            click.echo(click.style(f"🔄 {prefix} Закрываю: {epic}", fg="blue"))
        
        result = close_epic(epic, force=force, dry_run=dry_run, verbose=verbose)
        results.append(result)
        
        if result.success:
            if not quiet:
                click.echo(click.style(f"✅ {epic}", fg="green"))
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
            click.echo(click.style("✅ ВСЕ ЭПИКИ УСПЕШНО ЗАКРЫТЫ", fg="green", bold=True))
        elif failed:
            click.echo(click.style(f"❌ ЗАВЕРШЕНО С ОШИБКАМИ: {len(failed)} эпик(ов)", fg="red", bold=True))
        click.echo(click.style("═" * 60, bold=True))
        
        # Детали ошибок
        if failed and verbose:
            click.echo(click.style("\n📋 Ошибки:", fg="red", bold=True))
            for res in failed:
                click.echo(click.style(f"  • {res.epic_id}: {res.error}", fg="red", dim=True))
    
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    bd_close()