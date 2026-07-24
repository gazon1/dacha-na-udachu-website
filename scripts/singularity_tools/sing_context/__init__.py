"""Singularity Context Extractor — Extract code context for AI assistants.

Features:
- Multi-language support with automatic extension detection
- Tree-sitter integration for intelligent code analysis
- Gitignore support for respecting .gitignore files
- Import graph extraction
- Code compression modes
"""

from .extractor import extract_context
from .config import LanguageConfig
from .language_registry import LANGUAGE_REGISTRY, get_language_config
from .gitignore import GitignoreMatcher, load_gitignore_patterns

__all__ = [
    "extract_context",
    "LanguageConfig",
    "LANGUAGE_REGISTRY",
    "get_language_config",
    "GitignoreMatcher",
    "load_gitignore_patterns",
]
