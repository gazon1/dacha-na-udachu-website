"""Language configuration for sing_context."""

from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional


@dataclass
class LanguageConfig:
    """
    Configuration for a programming language in sing_context.

    Defines language-specific rules for:
    - File matching (extensions)
    - Filtering (ignore patterns)
    - Always include full files
    """

    # Identity
    name: str
    key: str
    extensions: List[str]
    description: str = ""

    # Filtering
    ignore_patterns: List[str] = field(default_factory=list)
    always_include_full: List[str] = field(default_factory=list)

    # Gitignore support
    respect_gitignore: bool = True

    # Import parsing
    import_pattern: Optional[str] = None  # Regex pattern for extracting imports

    # File importance tiers
    entry_point_names: List[str] = field(default_factory=list)  # e.g., main.py, cli.py
    config_names: List[str] = field(default_factory=list)  # e.g., pyproject.toml, pubspec.yaml
    test_patterns: List[str] = field(default_factory=list)  # e.g., *_test.py, *_test.dart

    def matches_file(self, file_path: Path) -> bool:
        """Check if file matches this language's extensions."""
        return any(file_path.suffix == ext for ext in self.extensions)

    def matches_ignore_pattern(self, rel_path: str, filename: str) -> bool:
        """Check if file matches any ignore pattern."""
        for pattern in self.ignore_patterns:
            # Directory pattern
            if pattern.endswith("/"):
                dir_name = pattern[:-1]
                if dir_name in rel_path:
                    return True
            # Glob pattern
            elif pattern.startswith("*"):
                suffix = pattern[1:]
                if filename.endswith(suffix):
                    return True
            elif pattern.endswith("*"):
                prefix = pattern[:-1]
                if filename.startswith(prefix):
                    return True
            # Exact match or contains
            else:
                if pattern in rel_path or pattern == filename:
                    return True
        return False

    def should_include_full(self, filename: str) -> bool:
        """Check if file should always be included in full."""
        return filename in self.always_include_full
