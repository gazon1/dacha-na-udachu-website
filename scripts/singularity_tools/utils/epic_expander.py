"""Epic pattern expansion utilities.

Provides functions for expanding epic names with ranges and regex patterns.
Used by bd_close, bd_update, and run_batch scripts.
"""
import re
from typing import List, Tuple


class EpicExpanderError(Exception):
    """Error during epic expansion."""
    pass


def expand_ranges(epic_string: str) -> Tuple[List[str], List[str]]:
    """
    Expands ranges in epic string.

    Returns (epics, errors) where errors are warning messages.

    Supports:
        - "epic-1:3" → ["epic-1", "epic-2", "epic-3"]
        - "epic-1..3" → ["epic-1", "epic-2", "epic-3"]
        - "workspace{1..5}" → ["workspace-1", ..., "workspace-5"]
        - "workspace{1..5}.dart" → ["workspace-1.dart", ..., "workspace-5.dart"]
    """
    epics = []
    errors = []

    # Format 1: prefix-N:M or prefix-N..M
    range_pattern = r'([a-zA-Z0-9_.\-]+?)(\d+):(\d+)'
    for match in re.finditer(range_pattern, epic_string):
        prefix = match.group(1)
        start = int(match.group(2))
        end = int(match.group(3))
        if start > end:
            errors.append(f"Invalid range: {start} > {end}")
            continue
        for i in range(start, end + 1):
            epics.append(f"{prefix}{i}")

    # Format 2: bash-style {N..M}
    bash_pattern = r'(.*)\{(\d+)\.\.(\d+)\}(.*)'
    for match in re.finditer(bash_pattern, epic_string):
        prefix, start, end, suffix = match.groups()
        start, end = int(start), int(end)
        if start > end:
            errors.append(f"Invalid range: {start} > {end}")
            continue
        for i in range(start, end + 1):
            epics.append(f"{prefix}{i}{suffix}")

    # If ranges found — return
    if epics:
        return epics, errors

    # Otherwise — split by whitespace
    return [e.strip() for e in epic_string.split() if e.strip()], errors


def expand_regex(pattern: str, available_epics: List[str]) -> Tuple[List[str], List[str]]:
    """
    Expands regex pattern to list of matching epics.

    Returns (matching_epics, errors).
    """
    errors = []
    try:
        compiled = re.compile(pattern)
        return [epic for epic in available_epics if compiled.search(epic)], errors
    except re.error as e:
        return [], [f"Regex error: {e}"]