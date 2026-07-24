# Напиши план в формате чтобы я могу распарсить его на эпики и задачи этим скриптом и записать в bd:
"""
Claude plan → Beads (bd) parser.

Два режима:
  1. Markdown AST (mistune) — для структурированных планов
  2. LLM extraction (Claude API) — для произвольного текста

Использование:
  python plan_parser.py plan.txt              # parse + preview
  python plan_parser.py plan.txt --sync       # parse + write to bd
  python plan_parser.py plan.txt --dry-run    # parse + show bd commands
  cat plan.txt | python plan_parser.py -      # read from stdin
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, TextIO

import click

try:
    import mistune
    HAS_MISTUNE = True
except ImportError:
    HAS_MISTUNE = False


# ──────────────────────────────────────────────────────────────────────────────
# Data model
# ──────────────────────────────────────────────────────────────────────────────

PRIORITY_MAP = {
    # Emoji
    "🔴": "critical", "❗": "high", "🟠": "high",
    "🟡": "medium",   "🟢": "low",  "⚪": "low",
    # Text (case-insensitive)
    "critical": "critical", "высокий": "high",   "high": "high",
    "medium": "medium",     "средний": "medium",
    "low": "low",           "низкий": "low",
}


@dataclass
class Task:
    title: str
    description: str = ""
    priority: str = "medium"
    done: bool = False
    tags: list[str] = field(default_factory=list)
    parent_id: Optional[str] = None  # for subtasks

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "description": self.description,
            "priority": self.priority,
            "done": self.done,
            "tags": self.tags,
            "parent_id": self.parent_id,
        }


@dataclass
class Epic:
    title: str
    description: str = ""
    priority: str = "medium"
    tasks: list[Task] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    epic_id: Optional[str] = None  # filled after creation in bd

    def to_dict(self) -> dict:
        return {
            "title": self.title,
            "description": self.description,
            "priority": self.priority,
            "tasks": [t.to_dict() for t in self.tasks],
            "tags": self.tags,
            "epic_id": self.epic_id,
        }


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _extract_priority(text: str) -> str:
    """Finds the first priority marker in text."""
    text_lower = text.lower()
    for marker, priority in PRIORITY_MAP.items():
        if marker in text or marker.lower() in text_lower:
            return priority
    return "medium"


def _extract_tags(text: str) -> list[str]:
    return re.findall(r"#(\w+)", text)


def _clean(text: str, is_description: bool = False) -> str:
    """Strip priority markers, tags, and extra whitespace.
    
    Args:
        text: Text to clean
        is_description: If True, preserve code blocks and arrows for descriptions
    """
    if is_description:
        # For descriptions: only remove leading arrow markers, keep content
        text = re.sub(r"^\s*→\s*", "", text, flags=re.M)
        return text.strip()
    
    # For titles: remove all markers
    text = re.sub(r"[🔴🟠🟡🟢⚪❗]", "", text)
    text = re.sub(r"\[(CRITICAL|HIGH|MEDIUM|LOW|ВЫСОКИЙ|СРЕДНИЙ|НИЗКИЙ)\]", "", text, flags=re.I)
    text = re.sub(r"#\w+", "", text)
    text = re.sub(r"\[[ xX]\]\s*", "", text)
    return text.strip(" -•▶➤✓\t")


def _is_checkbox_checked(cb: Optional[str]) -> bool:
    """Check if checkbox marker indicates done state."""
    if not cb:
        return False
    cb_lower = cb.lower().strip()
    return cb_lower in ("[x]", "[✓]", "[✔]", "[v]")


# ──────────────────────────────────────────────────────────────────────────────
# Parser 1 — Mistune AST / Line-based tokenizer
# ──────────────────────────────────────────────────────────────────────────────

def parse_with_mistune(text: str) -> list[Epic]:
    """
    Line-based parser that understands ATX headings and GitHub-flavored
    task lists. Works reliably without fighting AST complexity.
    """
    lines = text.replace("\r\n", "\n").split("\n")

    epics: list[Epic] = []
    current: Optional[Epic] = None
    epic_desc_buffer: list[str] = []
    current_task: Optional[Task] = None
    task_desc_buffer: list[str] = []
    
    # Track code block state for descriptions
    in_code_block = False

    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # ── Track code blocks ────────────────────────────────────────────────
        if "```" in stripped:
            in_code_block = not in_code_block
            # Still add code fence to description
            if current_task is not None:
                task_desc_buffer.append(stripped)
            elif current is not None and current_task is None:
                epic_desc_buffer.append(stripped)
            i += 1
            continue

        # ── ATX heading ───────────────────────────────────────────────────────
        m_heading = re.match(r"^(#{1,6})\s+(.+)$", stripped)
        if m_heading and not in_code_block:
            level = len(m_heading.group(1))
            raw_title = m_heading.group(2)

            # Flush task description if any
            if current_task and task_desc_buffer:
                current_task.description = "\n".join(task_desc_buffer).strip()
                task_desc_buffer = []
                current_task = None

            # Flush epic description
            if current and epic_desc_buffer and current_task is None:
                current.description = "\n".join(epic_desc_buffer).strip()
                epic_desc_buffer = []

            if level <= 2:
                # New epic
                if current:
                    epics.append(current)
                current = Epic(
                    title=_clean(raw_title),
                    priority=_extract_priority(raw_title),
                    tags=_extract_tags(raw_title),
                )
            else:
                # h3+ → description for current epic
                if current and current_task is None:
                    epic_desc_buffer.append(_clean(raw_title, is_description=True))

            i += 1
            continue

        # ── Task list item ────────────────────────────────────────────────────
        m_task = re.match(r"^[ \t]*[-*•+]\s+(?:(\[[ xX✓✔v]\])\s*)?(.+)$", stripped, re.I)
        if not m_task:
            m_task = re.match(r"^[ \t]*\d+\.\s+(?:(\[[ xX✓✔v]\])\s*)?(.+)$", stripped, re.I)

        if m_task and current is not None and not in_code_block:
            # Flush previous task description
            if current_task and task_desc_buffer:
                current_task.description = "\n".join(task_desc_buffer).strip()
                task_desc_buffer = []

            cb = m_task.group(1)
            raw_title = m_task.group(2)
            done = _is_checkbox_checked(cb)
            task_title = _clean(raw_title)

            if task_title and len(task_title) >= 2:
                current_task = Task(
                    title=task_title,
                    priority=_extract_priority(raw_title),
                    done=done,
                    tags=_extract_tags(raw_title),
                )
                current.tasks.append(current_task)

            i += 1
            continue

        # ── Description continuation for task ────────────────────────────────
        if current_task and not in_code_block:
            # Lines with indent OR starting with → are task description
            if (line.startswith("  ") or line.startswith("\t") or 
                stripped.startswith("→") or stripped.startswith("→ ")):
                cleaned = _clean(stripped, is_description=True)
                if cleaned:  # Only add non-empty lines
                    task_desc_buffer.append(cleaned)
                i += 1
                continue

        # ── Description continuation for epic ────────────────────────────────
        if current and current_task is None and not in_code_block:
            if stripped and not re.match(r"^(#{1,6}\s|[-*•+\d]\.)", stripped):
                epic_desc_buffer.append(_clean(stripped, is_description=True))

        i += 1

    # Flush final buffers
    if current_task and task_desc_buffer:
        current_task.description = "\n".join(task_desc_buffer).strip()
    if current:
        if not current.description and epic_desc_buffer:
            current.description = "\n".join(epic_desc_buffer).strip()
        epics.append(current)

    return epics


# ──────────────────────────────────────────────────────────────────────────────
# Parser 2 — Regex fallback
# ──────────────────────────────────────────────────────────────────────────────

_EPIC_RE = re.compile(
    r"^(?P<hashes>#{1,2})\s*(?:эпик|epic|фаза|phase|раздел|section)?\s*\d*[.:\s]*(?P<title>.+)$",
    re.I | re.M,
)
_EPIC_EMOJI_RE = re.compile(r"^[🎯📦⚡🚀✨🛠️]+\s+(?P<title>.+)$", re.M)
_TASK_RE = re.compile(
    r"^[ \t]*(?:[-*•]|\d+\.)\s*(?P<cb>\[[ xX✓✔v]\])?\s*(?P<title>.+)$",
    re.M | re.I,
)


def parse_with_regex(text: str) -> list[Epic]:
    epic_positions: list[tuple[int, str, str]] = []

    for m in _EPIC_RE.finditer(text):
        epic_positions.append((m.start(), m.group("title"), m.group(0)))

    for m in _EPIC_EMOJI_RE.finditer(text):
        if not any(abs(p - m.start()) < 2 for p, *_ in epic_positions):
            epic_positions.append((m.start(), m.group("title"), m.group(0)))

    epic_positions.sort(key=lambda x: x[0])

    if not epic_positions:
        epic_positions = [(0, "Plan", "")]

    epics: list[Epic] = []

    for i, (pos, raw_title, _line) in enumerate(epic_positions):
        end = epic_positions[i + 1][0] if i + 1 < len(epic_positions) else len(text)
        section = text[pos:end]

        title = _clean(raw_title)
        epic = Epic(
            title=title,
            priority=_extract_priority(raw_title),
            tags=_extract_tags(raw_title),
        )

        for m in _TASK_RE.finditer(section):
            task_title = _clean(m.group("title"))
            if not task_title or len(task_title) < 2:
                continue
            done = _is_checkbox_checked(m.group("cb"))
            epic.tasks.append(Task(
                title=task_title,
                priority=_extract_priority(m.group("title")),
                done=done,
                tags=_extract_tags(m.group("title")),
            ))

        epics.append(epic)

    return epics


# ──────────────────────────────────────────────────────────────────────────────
# Smart dispatcher
# ──────────────────────────────────────────────────────────────────────────────

def parse(text: str) -> list[Epic]:
    """Parse plan text into epics+tasks."""
    if HAS_MISTUNE:
        try:
            epics = parse_with_mistune(text)
            if epics and any(e.title for e in epics):
                return epics
        except Exception:
            pass  # Fallback to regex

    return parse_with_regex(text)


# ──────────────────────────────────────────────────────────────────────────────
# Beads (bd) integration
# ──────────────────────────────────────────────────────────────────────────────

BD = os.getenv("BD_BIN", "/home/max/.local/bin/bd")


def _bd(*args, check: bool = True, timeout: int = 30) -> tuple[int, str, str]:
    """Run bd command and return (returncode, stdout, stderr)."""
    try:
        result = subprocess.run(
            [BD, *args],
            capture_output=True,
            text=True,
            check=False,
            timeout=timeout,
        )
        return result.returncode, result.stdout.strip(), result.stderr.strip()
    except subprocess.TimeoutExpired:
        return -1, "", f"Command timed out after {timeout}s"
    except FileNotFoundError:
        return -127, "", f"bd not found at {BD}"
    except Exception as e:
        return -1, "", str(e)


def _extract_bd_id(output: str) -> Optional[str]:
    """Extract workspace-xxx or numeric id from bd output."""
    if not output:
        return None

    # Pattern 1: workspace-xxx format
    m = re.search(r"(workspace-[a-z0-9-]+)", output, re.I)
    if m:
        return m.group(1)

    # Pattern 2: BD-XXXX or similar ticket format
    m = re.search(r"\b([A-Z]{2,}-\d+)\b", output)
    if m:
        return m.group(1)

    # Pattern 3: standalone numeric ID (4+ digits)
    m = re.search(r"\b(\d{4,})\b", output)
    if m:
        return m.group(1)

    # Pattern 4: first word that looks like an ID
    words = output.split()
    for word in words:
        if re.match(r"^(workspace-[a-z0-9-]+|[A-Z]+-\d+|\d{4,})$", word, re.I):
            return word

    return None


def _bd_create(item_type: str, title: str, priority: str, parent: Optional[str] = None,
               description: Optional[str] = None) -> tuple[bool, Optional[str], str]:
    """Create item in bd. Returns (success, id_or_none, error_message)."""
    args = ["create", title, "--type", item_type, "--priority", priority]
    if parent:
        args.extend(["--parent", parent])

    code, stdout, stderr = _bd(*args)

    if code != 0:
        return False, None, stderr or stdout or f"Unknown error (code {code})"

    item_id = _extract_bd_id(stdout)
    if not item_id:
        return True, None, f"Created but could not extract ID from: {stdout[:100]}"

    # Update description if provided
    if description and item_id:
        _bd("update", item_id, "--description", description, check=False, timeout=10)

    return True, item_id, ""


def sync_to_beads(epics: list[Epic], dry_run: bool = False) -> list[str]:
    PRIORITY_BD = {"critical": "1", "high": "2", "medium": "3", "low": "4"}
    created_epic_ids: list[str] = []

    for epic_idx, epic in enumerate(epics, 1):
        prio = PRIORITY_BD.get(epic.priority, "3")

        if dry_run:
            desc_arg = f' --description "{epic.description[:200]}"' if epic.description else ""
            click.echo(f'bd create "{epic.title}" --type epic --priority {prio}{desc_arg}')
            for t in epic.tasks:
                tp = PRIORITY_BD.get(t.priority, "3")
                tdesc = t.description[:200] if t.description else ""
                tdesc_arg = f' --description "{tdesc}"' if tdesc else ""
                click.echo(f'  bd create "{t.title}" --type task --priority {tp} --parent <epic_id>{tdesc_arg}')
            click.echo()
            continue

        # Real creation
        click.echo(f"[{epic_idx}/{len(epics)}] 📦  Creating epic: {epic.title}")
        success, epic_id, error = _bd_create("epic", epic.title, prio, description=epic.description)

        if not success:
            click.echo(f"    ❌  Failed: {error}", err=True)
            continue

        epic.epic_id = epic_id
        created_epic_ids.append(epic_id)
        click.echo(f"    ✅  {epic_id}")

        for task_idx, task in enumerate(epic.tasks, 1):
            tp = PRIORITY_BD.get(task.priority, "3")
            prefix = "└─" if task_idx == len(epic.tasks) - 1 else "├─"
            click.echo(f"    {prefix} {task.title}")

            # Truncate description for bd (limit ~500 chars)
            task_desc = None
            if task.description:
                task_desc = task.description
                if len(task_desc) > 497:
                    task_desc = task_desc[:497] + "..."

            success, task_id, error = _bd_create(
                "task", task.title, tp, parent=epic_id,
                description=task_desc
            )

            if not success:
                click.echo(f"        ⚠️  Task failed: {error}", err=True)
                continue

            if task_id and task.done:
                _bd("close", task_id, check=False, timeout=10)

        click.echo()

    return created_epic_ids


# ──────────────────────────────────────────────────────────────────────────────
# Output formatters
# ──────────────────────────────────────────────────────────────────────────────

PRIORITY_ICON = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}


def print_preview(epics: list[Epic]) -> None:
    total_tasks = sum(len(e.tasks) for e in epics)
    click.echo(f"\n📊  {len(epics)} epic(s)  ·  {total_tasks} task(s)\n")
    click.echo("─" * 60)

    for epic_idx, epic in enumerate(epics, 1):
        icon = PRIORITY_ICON.get(epic.priority, "⚪")
        tags = "  " + " ".join(f"#{t}" for t in epic.tags) if epic.tags else ""
        click.echo(f"\n{epic_idx}. {icon}  {epic.title}{tags}")
        if epic.description:
            desc_lines = epic.description.strip().split("\n")
            for line in desc_lines[:2]:  # Show first 2 lines
                click.echo(f"   ℹ️  {line}")
            if len(desc_lines) > 2:
                click.echo(f"   ℹ️  ... ({len(desc_lines) - 2} more lines)")

        for i, task in enumerate(epic.tasks):
            ti = PRIORITY_ICON.get(task.priority, "⚪")
            check = "✅" if task.done else "⬜"
            connector = "└─" if i == len(epic.tasks) - 1 else "├─"
            click.echo(f"   {connector} {check} {ti} {task.title}")
            if task.description:
                desc_lines = task.description.strip().split("\n")
                for line in desc_lines[:1]:  # Show first line of description
                    # Preserve code formatting indicators
                    if line.startswith("```"):
                        click.echo(f"      📋 {line}")
                    else:
                        click.echo(f"      ℹ️  {line}")
                if len(desc_lines) > 1:
                    click.echo(f"      ℹ️  ... ({len(desc_lines) - 1} more lines)")

    click.echo()


def print_json(epics: list[Epic]) -> None:
    click.echo(json.dumps([e.to_dict() for e in epics], ensure_ascii=False, indent=2))


def print_bd_commands(epics: list[Epic]) -> None:
    PRIORITY_BD = {"critical": "1", "high": "2", "medium": "3", "low": "4"}
    click.echo("# ── paste into terminal ──────────────────────────────────\n")
    for epic in epics:
        p = PRIORITY_BD.get(epic.priority, "3")
        click.echo(f'EPIC_ID=$(bd create "{epic.title}" --type epic --priority {p} 2>&1 | grep -oE "workspace-[a-z0-9-]+" | head -1)')
        for task in epic.tasks:
            tp = PRIORITY_BD.get(task.priority, "3")
            desc_arg = f' --description "{task.description[:200]}"' if task.description else ""
            click.echo(f'bd create "{task.title}" --type task --priority {tp} --parent "$EPIC_ID"{desc_arg}')
        click.echo()


# ──────────────────────────────────────────────────────────────────────────────
# CLI with Click
# ──────────────────────────────────────────────────────────────────────────────

@click.command(
    help="Parse a Claude Code plan into epics+tasks, optionally writing to bd.",
    epilog="""\b
Examples:
  python plan_parser.py plan.txt              # parse + preview
  python plan_parser.py plan.txt --sync       # parse + write to bd
  python plan_parser.py plan.txt --dry-run    # parse + show bd commands
  cat plan.txt | python plan_parser.py -      # read from stdin
""",
)
@click.argument(
    "input",
    type=click.File("r", encoding="utf-8"),
    default="-",
    required=False,
)
@click.option(
    "--sync",
    is_flag=True,
    help="Write parsed epics/tasks to Beads (bd).",
)
@click.option(
    "--dry-run",
    is_flag=True,
    help="Print bd commands without executing them.",
)
@click.option(
    "--json",
    "output_json",
    is_flag=True,
    help="Output parsed data as raw JSON.",
)
@click.option(
    "--bd",
    "output_bd",
    is_flag=True,
    help="Output shell commands for bd (implies --dry-run).",
)
@click.option(
    "--bd-bin",
    type=str,
    default=None,
    help="Path to bd binary (overrides BD_BIN env var).",
)
@click.version_option(version="1.0.0")
def cli(
    input: TextIO,
    sync: bool,
    dry_run: bool,
    output_json: bool,
    output_bd: bool,
    bd_bin: Optional[str],
) -> None:
    """Main entry point for the plan parser CLI."""
    global BD
    if bd_bin:
        BD = bd_bin

    # ── Read input ────────────────────────────────────────────────────────────
    try:
        text = input.read()
    except Exception as e:
        click.echo(f"❌  Error reading input: {e}", err=True)
        raise click.Abort()

    if not text.strip():
        click.echo("❌  Empty input", err=True)
        raise click.Abort()

    # Close stdin if we opened it
    if input is not sys.stdin:
        input.close()

    # ── Parse ─────────────────────────────────────────────────────────────────
    try:
        epics = parse(text)
    except Exception as e:
        click.echo(f"❌  Parse error: {e}", err=True)
        raise click.Abort()

    if not epics:
        click.echo("⚠️  No epics found in plan.", err=True)
        return

    # ── Output ────────────────────────────────────────────────────────────────
    if output_json:
        print_json(epics)
    elif output_bd or dry_run:
        print_preview(epics)
        print_bd_commands(epics)
    else:
        print_preview(epics)

    # ── Sync ──────────────────────────────────────────────────────────────────
    if sync:
        created_ids = sync_to_beads(epics, dry_run=False)
        if created_ids:
            click.echo("\n" + "─" * 60)
            click.echo(f"✅ Created epics: {' '.join(created_ids)}")
    elif dry_run:
        pass  # commands already printed above


# ──────────────────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    cli()