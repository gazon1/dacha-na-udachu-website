#!/usr/bin/env python3
"""
run_batch.py — Удобный запуск батчей эпиков для AI-агентов с поддержкой групп, диапазонов и regex.

Использование:
    $ python run_batch.py "workspace-mma7.1 workspace-mma7.2"
    $ python run_batch.py "epic-1:3"                    # диапазон: epic-1 epic-2 epic-3
    $ python run_batch.py "workspace-mma7{1..5}"        # bash-style: workspace-mma7.1 ... workspace-mma7.5
    $ python run_batch.py "workspace-mma7.*"            # regex: все совпадения
    $ python run_batch.py "epic-1:3 | epic-5:7"         # группы с диапазонами
"""

import click
import subprocess
import sys
import hashlib
import time
import re
import os
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple, Set, Dict
from dataclasses import dataclass, field

from .utils.epic_expander import expand_ranges as util_expand_ranges, expand_regex as util_expand_regex
from pathlib import Path
from typing import List, Optional, Tuple, Set, Dict
from dataclasses import dataclass, field


# 🔷 Конфигурация по умолчанию
DEFAULT_WORKTREES_BASE = Path.home() / "worktrees"
DEFAULT_BRANCH_PREFIX = "agent/"
DEFAULT_MODEL = "opencode-go/minimax-m2.5"
DEFAULT_GROUP_DELIMITER = "|"
BEADS_WORKSPACE = Path("/workspace")


@dataclass
class EpicGroup:
    """Группа эпиков для последовательного выполнения."""
    name: str
    epics: List[str]
    index: int
    status: str = "pending"  # pending, running, completed, failed, skipped
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    errors: List[str] = field(default_factory=list)
    
    @property
    def duration(self) -> Optional[str]:
        if self.started_at and self.completed_at:
            delta = self.completed_at - self.started_at
            return f"{delta.total_seconds():.1f}s"
        return None
    
    @property
    def is_complete(self) -> bool:
        return self.status in ("completed", "failed", "skipped")


@dataclass
class EpicStats:
    """Статистика выполнения эпика."""
    epic_id: str
    title: str
    status: str  # open, done, etc.
    total_tasks: int = 0
    completed_tasks: int = 0
    completion_percentage: float = 0.0
    
    @property
    def completion_bar(self) -> str:
        """Визуальная полоска прогресса."""
        filled = int(self.completion_percentage / 10)
        empty = 10 - filled
        return f"[{'█' * filled}{'░' * empty}]"
    
    @property
    def status_icon(self) -> str:
        if self.status == "done":
            return "✅"
        elif self.completion_percentage >= 100:
            return "🎉"
        elif self.completion_percentage >= 50:
            return "🔄"
        else:
            return "⏳"


def generate_batch_id(epics: List[str], prefix: str = "batch", group_index: Optional[int] = None) -> str:
    """Генерирует уникальный ID батча на основе списка эпиков."""
    epic_hash = hashlib.sha256(":".join(sorted(epics)).encode()).hexdigest()[:12]
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    suffix = f"-g{group_index}" if group_index is not None else ""
    return f"{prefix}-{epic_hash}{suffix}-{timestamp}"


def expand_range_notation(epic_string: str) -> List[str]:
    """
    Расширяет диапазонные обозначения в список эпиков.

    Поддерживаемые форматы:
        - "epic-1:3" → ["epic-1", "epic-2", "epic-3"]
        - "epic-1..3" → ["epic-1", "epic-2", "epic-3"]
        - "workspace-mma7{1..5}" → ["workspace-mma7.1", ..., "workspace-mma7.5"]
        - "workspace-mma7{1..5}.dart" → ["workspace-mma7.1.dart", ..., "workspace-mma7.5.dart"]
    """
    epics, _ = util_expand_ranges(epic_string)
    return epics


def expand_regex_pattern(pattern: str, available_epics: List[str]) -> List[str]:
    """
    Расширяет regex-паттерн до списка совпадающих эпиков.
    """
    epics, _ = util_expand_regex(pattern, available_epics)
    return epics


def get_available_epics_from_beads(limit: int = 100) -> List[str]:
    """Получает список всех доступных эпиков из Beads для regex-матчинга."""
    try:
        result = subprocess.run(
            ["bd", "query", "type=epic", "--limit", str(limit)],
            cwd=BEADS_WORKSPACE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,  # Построчная буферизация
            check=False,
        )
        epics = []
        for line in result.stdout.splitlines():
            matches = re.findall(r"workspace-[a-z0-9]+", line, re.IGNORECASE)
            epics.extend(matches)
        return list(dict.fromkeys(epics))
    except Exception:
        return []


def parse_epic_groups(
    epic_string: str,
    delimiter: str = DEFAULT_GROUP_DELIMITER,
    available_epics: Optional[List[str]] = None,
) -> List[EpicGroup]:
    """
    Парсит строку эпиков в группы с поддержкой диапазонов и regex.
    
    Примеры:
        - "epic-1:3" → одна группа с epic-1, epic-2, epic-3
        - "workspace-mma7.*" → все совпадения из available_epics
        - "epic-1:3 | epic-5:7" → две группы
    """
    if not epic_string.strip():
        return []
    
    # Разбиваем по делимитеру групп
    raw_groups = [g.strip() for g in epic_string.split(delimiter)]
    
    groups = []
    for idx, raw_group in enumerate(raw_groups, 1):
        # Проверяем, есть ли regex-паттерны (содержат .* или ^ или $)
        if any(c in raw_group for c in ['*', '^', '$']) and not raw_group.startswith('workspace-'):
            # Это regex-паттерн
            if available_epics:
                epics = expand_regex_pattern(raw_group, available_epics)
            else:
                click.echo(click.style(f"⚠️  Regex без доступных эпиков: {raw_group}", fg="yellow"), err=True)
                epics = [raw_group]
        else:
            # Расширяем диапазоны
            epics = expand_range_notation(raw_group)
        
        if epics:
            groups.append(EpicGroup(
                name=f"group-{idx}",
                epics=epics,
                index=idx,
            ))
    
    return groups


def get_open_epics_from_beads(limit: int = 5, group_by: Optional[str] = None) -> List[EpicGroup]:
    """Получает список открытых эпиков из Beads с опциональной группировкой."""
    try:
        result = subprocess.run(
            ["bd", "query", "type=epic AND status=open", "--limit", str(limit)],
            cwd=BEADS_WORKSPACE,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,  # Построчная буферизация
            check=False,
        )
        epics = []
        for line in result.stdout.splitlines():
            matches = re.findall(r"workspace-[a-z0-9]+", line, re.IGNORECASE)
            epics.extend(matches)
        
        epics = list(dict.fromkeys(epics))
        
        if group_by and epics:
            groups = []
            for i in range(0, len(epics), 2):
                groups.append(EpicGroup(
                    name=f"{group_by}-group-{i//2 + 1}",
                    epics=epics[i:i+2],
                    index=i//2 + 1,
                ))
            return groups
        
        return [EpicGroup(name="default", epics=epics, index=1)] if epics else []
    
    except Exception as e:
        click.echo(click.style(f"⚠️  Ошибка запроса к Beads: {e}", fg="yellow"), err=True)
        return []


def run_just_pipeline(
    batch_id: str,
    mode: str,
    target_epics: str,
    model: str,
    worktrees_base: Path,
    branch_prefix: str,
    verbose: bool = False,
) -> Tuple[bool, Optional[str]]:
    """Запускает just _run-pipeline с потоковым выводом."""
    env = {**dict(os.environ), "WORKTREES_BASE": str(worktrees_base), "BRANCH_PREFIX": branch_prefix}
    cmd = ["just", "_run-pipeline", batch_id, mode, target_epics, model]
    
    if verbose:
        click.echo(click.style(f"🚀 Запуск: {' '.join(cmd)}", fg="cyan"))
    
    try:
        # ✅ Потоковый вывод с сохранением в переменную
        process = subprocess.Popen(
            cmd,
            cwd=BEADS_WORKSPACE,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,  # Построчная буферизация
        )
        
        output_lines = []
        # Читаем и выводим каждую строку в реальном времени
        for line in process.stdout:
            click.echo(line, nl=False)  # nl=False т.к. в строке уже есть \n
            output_lines.append(line)
        
        process.wait()
        
        if process.returncode != 0:
            return False, "".join(output_lines)
        return True, None
        
    except FileNotFoundError:
        return False, "Команда 'just' не найдена"
    except KeyboardInterrupt:
        return False, "Прервано пользователем"
    except Exception as e:
        return False, str(e)


def print_group_header(group: EpicGroup, total_groups: int) -> None:
    """Печатает заголовок группы."""
    click.echo()
    click.echo(click.style("╔" + "═" * 58 + "╗", fg="bright_blue", bold=True))
    click.echo(click.style(f"║  📦 Группа {group.index}/{total_groups}: {group.name}", fg="bright_blue", bold=True))
    click.echo(click.style(f"║  📋 Эпики: {', '.join(group.epics)}", fg="blue"))
    click.echo(click.style("╚" + "═" * 58 + "╝", fg="bright_blue", bold=True))
    click.echo()


def print_group_result(group: EpicGroup) -> None:
    """Печатает результат выполнения группы."""
    status_icon = {
        "completed": "✅",
        "failed": "❌",
        "skipped": "⏭️",
        "running": "🔄",
        "pending": "⏳",
    }.get(group.status, "❓")
    
    status_color = {
        "completed": "green",
        "failed": "red",
        "skipped": "yellow",
        "running": "cyan",
        "pending": "dim",
    }.get(group.status, "white")
    
    duration_str = f" ({group.duration})" if group.duration else ""
    
    click.echo(click.style(f"{status_icon} Группа {group.index}: {group.status.upper()}{duration_str}", fg=status_color, bold=True))
    
    if group.errors:
        click.echo(click.style("   Ошибки:", fg="red"))
        for err in group.errors[:3]:
            click.echo(click.style(f"     • {err[:100]}{'...' if len(err) > 100 else ''}", fg="red", dim=True))
        if len(group.errors) > 3:
            click.echo(click.style(f"     ... и ещё {len(group.errors) - 3} ошибок", fg="red", dim=True))
    
    click.echo()


def get_epic_stats(epic_ids: List[str]) -> List[EpicStats]:
    """
    Получает статистику выполнения для каждого эпика через bd query.
    
    Для каждого эпика:
    1. Получает информацию об эпике (статус, название)
    2. Подсчитывает общее количество задач
    3. Подсчитывает количество закрытых задач
    4. Вычисляет процент выполнения
    """
    stats = []
    
    for epic_id in epic_ids:
        try:
            # Получаем информацию об эпике
            result = subprocess.run(
                ["bd", "show", epic_id],
                cwd=BEADS_WORKSPACE,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,  # Построчная буферизация
                check=False,
                timeout=30,
            )
            
            if result.returncode != 0:
                stats.append(EpicStats(
                    epic_id=epic_id,
                    title="Unknown",
                    status="error",
                ))
                continue
            
            output = result.stdout
            
            # Парсим название эпика
            title_match = re.search(r'·\s*(?:EPIC:)?\s*(.+?)\s*\[', output)
            title = title_match.group(1).strip() if title_match else epic_id
            
            # Парсим статус эпика
            status_match = re.search(r'\[.*?\s*·\s*(OPEN|DONE|CLOSED)\]', output, re.IGNORECASE)
            status = status_match.group(1).lower() if status_match else "unknown"
            
            # Получаем список задач эпика
            tasks_result = subprocess.run(
                ["bd", "query", f"parent={epic_id}"],
                cwd=BEADS_WORKSPACE,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,  # Построчная буферизация
                check=False,
                timeout=30,
            )
            
            total_tasks = 0
            completed_tasks = 0
            
            if tasks_result.returncode == 0:
                for line in tasks_result.stdout.splitlines():
                    if line.strip():
                        total_tasks += 1
                        # Проверяем, закрыта ли задача (ищем [● DONE] или аналогичный маркер)
                        if '[●' in line and ('DONE' in line.upper() or 'CLOSED' in line.upper()):
                            completed_tasks += 1
                        elif '[○' in line and ('DONE' in line.upper() or 'CLOSED' in line.upper()):
                            completed_tasks += 1
            
            # Вычисляем процент
            completion_percentage = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0
            
            stats.append(EpicStats(
                epic_id=epic_id,
                title=title,
                status=status,
                total_tasks=total_tasks,
                completed_tasks=completed_tasks,
                completion_percentage=completion_percentage,
            ))
            
        except subprocess.TimeoutExpired:
            stats.append(EpicStats(
                epic_id=epic_id,
                title="Timeout",
                status="error",
            ))
        except Exception as e:
            stats.append(EpicStats(
                epic_id=epic_id,
                title=f"Error: {str(e)[:30]}",
                status="error",
            ))
    
    return stats


def print_epic_statistics(stats: List[EpicStats], executed_epics: List[str]) -> None:
    """Печатает красивую статистику выполнения эпиков."""
    if not stats:
        return
    
    click.echo()
    click.echo(click.style("═" * 70, bold=True))
    click.echo(click.style("📊 СТАТИСТИКА ВЫПОЛНЕНИЯ ЭПИКОВ", fg="bright_cyan", bold=True))
    click.echo(click.style("═" * 70, bold=True))
    click.echo()
    
    # Фильтруем только выполненные эпики
    executed_stats = [s for s in stats if s.epic_id in executed_epics]
    
    if not executed_stats:
        click.echo(click.style("  ℹ️  Нет данных о выполненных эпиках", fg="yellow"))
        return
    
    # Считаем общую статистику
    total_tasks_all = sum(s.total_tasks for s in executed_stats)
    completed_tasks_all = sum(s.completed_tasks for s in executed_stats)
    overall_percentage = (completed_tasks_all / total_tasks_all * 100) if total_tasks_all > 0 else 0.0
    
    # Выводим статистику по каждому эпику
    for stat in executed_stats:
        status_color = {
            "done": "green",
            "open": "yellow",
            "error": "red",
        }.get(stat.status, "white")
        
        click.echo(click.style(f"  {stat.status_icon} {stat.epic_id}", fg="cyan", bold=True))
        click.echo(click.style(f"     {stat.title}"))
        click.echo()
        click.echo(f"     Прогресс: {stat.completion_bar} {stat.completion_percentage:.1f}%")
        click.echo(f"     Задачи: {stat.completed_tasks}/{stat.total_tasks}")
        click.echo(f"     Статус эпика: {click.style(stat.status.upper(), fg=status_color, bold=True)}")
        click.echo()
    
    # Общая статистика
    click.echo(click.style("─" * 70))
    click.echo()
    click.echo(click.style(f"  📈 ОБЩИЙ ПРОГРЕСС: {overall_percentage:.1f}%", fg="bright_green", bold=True))
    click.echo(click.style(f"     Всего задач: {total_tasks_all}"))
    click.echo(click.style(f"     Выполнено: {completed_tasks_all}"))
    click.echo(click.style(f"     Осталось: {total_tasks_all - completed_tasks_all}"))
    click.echo()
    click.echo(click.style("═" * 70, bold=True))
    click.echo()


def print_completed_epics_query(epic_ids: List[str]) -> None:
    """Выводит результат bd query для всех выполненных эпиков."""
    if not epic_ids:
        return
    
    click.echo()
    click.echo(click.style("═" * 70, bold=True))
    click.echo(click.style("📋 ВЫПОЛНЕННЫЕ ЭПИКИ (bd query)", fg="bright_magenta", bold=True))
    click.echo(click.style("═" * 70, bold=True))
    click.echo()
    
    # Формируем запрос для всех эпиков
    for epic_id in epic_ids:
        try:
            result = subprocess.run(
                ["bd", "show", epic_id],
                cwd=BEADS_WORKSPACE,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,  # Построчная буферизация
                check=False,
                timeout=30,
            )
            
            if result.returncode == 0:
                # Выводим краткую информацию
                output = result.stdout
                lines = output.splitlines()
                
                # Первая строка обычно содержит название и статус
                if lines:
                    first_line = lines[0].strip()
                    status_match = re.search(r'\[(.*?)\]', first_line)
                    status = status_match.group(1) if status_match else "UNKNOWN"
                    
                    status_color = {
                        "DONE": "green",
                        "OPEN": "yellow",
                        "CLOSED": "green",
                    }.get(status.upper().split()[-1] if status else "", "white")
                    
                    click.echo(click.style(f"  ● {epic_id}", fg="cyan"))
                    click.echo(click.style(f"    {first_line}"))
                    click.echo(click.style(f"    Статус: [{status}]", fg=status_color))
                    click.echo()
                    
        except Exception as e:
            click.echo(click.style(f"  ❌ {epic_id}: {str(e)}", fg="red"))
    
    click.echo(click.style("═" * 70, bold=True))
    click.echo()


@click.command(name="run-batch", context_settings=dict(help_option_names=["-h", "--help"]))
@click.argument("epics", required=False, nargs=-1)
@click.option(
    "-m", "--model", default=DEFAULT_MODEL, show_default=True, help="🤖 Модель AI"
)
@click.option(
    "--from-beads", "use_beads", is_flag=True, help="🔍 Взять эпики из Beads"
)
@click.option(
    "-l", "--limit", type=int, default=5, show_default=True, help="📊 Лимит эпиков из Beads"
)
@click.option(
    "--group-by", type=str, help="🔗 Группировать эпики из Beads по полю"
)
@click.option(
    "-d", "--delimiter", default=DEFAULT_GROUP_DELIMITER, show_default=True,
    help=f"🔀 Делимитер групп (по умолчанию: '{DEFAULT_GROUP_DELIMITER}')"
)
@click.option(
    "--sequential", "-s", is_flag=True, default=True,
    help="▶️  Запускать группы последовательно (по умолчанию: включено)"
)
@click.option(
    "--no-sequential", is_flag=True, help="⚡ Запускать все эпики параллельно"
)
@click.option(
    "--stop-on-error", is_flag=True, default=True,
    help="🛑 Останавливать при ошибке в группе"
)
@click.option(
    "--continue-on-error", is_flag=True, help="➡️  Продолжать даже при ошибке"
)
@click.option(
    "--worktrees", type=click.Path(path_type=Path), default=DEFAULT_WORKTREES_BASE,
    show_default=True, help="📁 Базовая директория для git worktrees"
)
@click.option(
    "--branch-prefix", default=DEFAULT_BRANCH_PREFIX, show_default=True, help="🌿 Префикс веток"
)
@click.option(
    "-n", "--dry-run", is_flag=True, help="🧪 Показать команды без выполнения"
)
@click.option(
    "-v", "--verbose", is_flag=True, help="🔍 Подробный вывод"
)
@click.option(
    "--list-epics", is_flag=True, help="📋 Показать доступные эпики из Beads и выйти"
)
@click.option(
    "--expand-only", is_flag=True, help="🔍 Показать расширенные эпики без запуска"
)
@click.option(
    "--no-stats", is_flag=True, help="🚫 Не показывать статистику после выполнения"
)
def run_batch(
    epics: tuple[str, ...],
    model: str,
    use_beads: bool,
    limit: int,
    group_by: Optional[str],
    delimiter: str,
    sequential: bool,
    no_sequential: bool,
    stop_on_error: bool,
    continue_on_error: bool,
    worktrees: Path,
    branch_prefix: str,
    dry_run: bool,
    verbose: bool,
    list_epics: bool,
    expand_only: bool,
    no_stats: bool,
) -> None:
    """
    🔗 Запускает батч эпиков с поддержкой диапазонов и regex.
    
    EPICS — список эпиков. Поддерживаются форматы:
    
    🔹 Диапазоны:
      - epic-1:3          → epic-1, epic-2, epic-3
      - epic-1..3         → epic-1, epic-2, epic-3
      - workspace{1..5}   → workspace-1, workspace-2, ..., workspace-5
    
    🔹 Regex:
      - workspace-mma7.*  → все совпадения
      - epic-(1|2|3)      → epic-1, epic-2, epic-3
    
    🔹 Группы (через |):
      - "epic-1:3 | epic-5:7"  → две последовательные группы
    
    Примеры:
      $ run_batch.py epic-1:3
      $ run_batch.py "workspace-mma7{1..5}"
      $ run_batch.py "workspace-mma7.*" --from-beads
      $ run_batch.py "epic-1:3 | epic-5:7" --stop-on-error
      $ run_batch.py --list-epics  # показать доступные
      $ run_batch.py epic-1:3 --expand-only  # показать расширенные
    """
    # Определяем режим выполнения
    if no_sequential:
        sequential = False
    if continue_on_error:
        stop_on_error = False
    
    # 🔷 Получаем доступные эпики для regex-матчинга
    available_epics = get_available_epics_from_beads(limit=100) if (list_epics or expand_only) else []
    
    # 🔷 Режим: показать доступные эпики
    if list_epics:
        click.echo(click.style("📋 Доступные эпики из Beads:", fg="cyan", bold=True))
        if available_epics:
            for i, epic in enumerate(available_epics, 1):
                click.echo(f"  {i}. {epic}")
            click.echo(click.style(f"\nВсего: {len(available_epics)}", fg="green"))
        else:
            click.echo(click.style("  (нет эпиков или Beads недоступен)", fg="yellow"))
        return
    
    # 1. Собираем список эпиков/групп
    epic_string = " ".join(epics) if epics else ""
    epic_groups: List[EpicGroup] = []
    
    if use_beads:
        if verbose:
            click.echo(click.style(f"🔍 Запрос эпиков из Beads (limit={limit}, group_by={group_by})...", fg="blue"))
        epic_groups = get_open_epics_from_beads(limit, group_by)
        if not epic_groups:
            click.echo(click.style("✅ Нет открытых эпиков в Beads", fg="green"))
            return
    elif epic_string:
        epic_groups = parse_epic_groups(epic_string, delimiter, available_epics)
    
    if not epic_groups:
        click.echo(click.style("❌ Не указано ни одного эпика.", fg="red"))
        click.echo(click.style("💡 Примеры:", fg="yellow"))
        click.echo(click.style("  run_batch.py epic-1:3", fg="yellow", dim=True))
        click.echo(click.style("  run_batch.py \"workspace-mma7{1..5}\"", fg="yellow", dim=True))
        click.echo(click.style("  run_batch.py \"workspace-mma7.*\" --from-beads", fg="yellow", dim=True))
        sys.exit(1)
    
    # 🔷 Режим: показать расширенные эпики
    if expand_only:
        click.echo(click.style("🔍 Расширенные эпики:", fg="cyan", bold=True))
        for group in epic_groups:
            click.echo(click.style(f"\nГруппа {group.index}:", fg="blue"))
            for epic in group.epics:
                click.echo(f"  • {epic}")
        click.echo(click.style(f"\nВсего эпиков: {sum(len(g.epics) for g in epic_groups)}", fg="green"))
        return
    
    # 2. Dry-run или выполнение
    if dry_run:
        click.echo(click.style("🧪 DRY-RUN: запланированные группы:", fg="yellow"))
        for group in epic_groups:
            batch_id = generate_batch_id(group.epics, group_index=group.index)
            formatted_epics = ",".join(group.epics)
            click.echo(f"   Группа {group.index}: {group.name}")
            click.echo(f"     📦 Эпики: {formatted_epics}")
            click.echo(f"     🆔 Batch: {batch_id}")
            click.echo(f"     🤖 Модель: {model}")
            click.echo()
        return
    
    # 3. Запуск групп
    click.echo()
    click.echo(click.style("═" * 60, bold=True))
    click.echo(click.style(f"🚀 Запуск батча: {len(epic_groups)} групп(ы)", bold=True))
    click.echo(click.style("═" * 60, bold=True))
    click.echo(f"   🤖 Модель: {model}")
    click.echo(f"   🔗 Режим: {'последовательный' if sequential else 'параллельный'}")
    click.echo(f"   🛑 Остановка при ошибке: {'вкл' if stop_on_error else 'выкл'}")
    click.echo(click.style("═" * 60, bold=True))
    
    overall_success = True
    failed_groups: List[EpicGroup] = []
    executed_epics: List[str] = []  # Список выполненных эпиков
    
    for group_idx, group in enumerate(epic_groups, 1):
        # Проверка: если предыдущая группа упала и stop_on_error — пропускаем
        if sequential and group_idx > 1 and failed_groups and stop_on_error:
            group.status = "skipped"
            click.echo(click.style(f"⏭️  Группа {group.index} пропущена (ошибка в предыдущей группе)", fg="yellow"))
            continue
        
        print_group_header(group, len(epic_groups))
        group.status = "running"
        group.started_at = datetime.now()
        
        formatted_epics = ",".join(group.epics)
        batch_id = generate_batch_id(group.epics, group_index=group.index)
        
        success, error = run_just_pipeline(
            batch_id=batch_id,
            mode="batch",
            target_epics=formatted_epics,
            model=model,
            worktrees_base=worktrees,
            branch_prefix=branch_prefix,
            verbose=verbose,
        )
        
        group.completed_at = datetime.now()
        
        if success:
            group.status = "completed"
            executed_epics.extend(group.epics)  # Добавляем выполненные эпики
            click.echo(click.style(f"✅ Группа {group.index} завершена успешно", fg="green"))
        else:
            group.status = "failed"
            group.errors.append(error or "Unknown error")
            overall_success = False
            failed_groups.append(group)
            click.echo(click.style(f"❌ Группа {group.index} завершилась с ошибкой", fg="red"))
            if verbose:
                click.echo(click.style(f"   Ошибка: {error}", fg="red", dim=True))
        
        print_group_result(group)
        
        if not sequential and group_idx < len(epic_groups):
            click.echo(click.style("   ⏱️  Переход к следующей группе..."))
    
    # 4. Итоговый отчёт
    click.echo()
    click.echo(click.style("═" * 60, bold=True))
    if overall_success and not failed_groups:
        click.echo(click.style("✅ ВСЕ ГРУППЫ УСПЕШНО ЗАВЕРШЕНЫ", fg="green", bold=True))
    elif failed_groups:
        click.echo(click.style(f"❌ ЗАВЕРШЕНО С ОШИБКАМИ: {len(failed_groups)} групп(ы)", fg="red", bold=True))
    else:
        click.echo(click.style("⚠️  ВЫПОЛНЕНИЕ ПРЕРВАНО", fg="yellow", bold=True))
    click.echo(click.style("═" * 60, bold=True))
    
    for group in epic_groups:
        icon = {"completed": "✅", "failed": "❌", "skipped": "⏭️"}.get(group.status, "❓")
        duration = f" ({group.duration})" if group.duration else ""
        click.echo(f"  {icon} Группа {group.index}: {group.status}{duration}")
    
    click.echo()
    
    # 5. 📊 Статистика выполнения (если не отключено)
    if not no_stats and executed_epics:
        # Получаем статистику по выполненным эпикам
        stats = get_epic_stats(executed_epics)
        print_epic_statistics(stats, executed_epics)
        
        # Выводим результат bd query для выполненных эпиков
        print_completed_epics_query(executed_epics)
    
    if not overall_success:
        sys.exit(1)


if __name__ == "__main__":
    run_batch()