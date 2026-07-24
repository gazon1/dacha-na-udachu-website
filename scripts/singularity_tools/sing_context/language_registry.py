"""Language registry for sing_context."""

from pathlib import Path
from typing import Dict, List, Optional, Set, Union

from .config import LanguageConfig
from .languages.dart_config import DART_CONFIG
from .languages.rust_config import RUST_CONFIG
from .languages.python_config import PYTHON_CONFIG
from .languages.typescript_config import TYPESCRIPT_CONFIG
from .languages.javascript_config import JAVASCRIPT_CONFIG
from .languages.go_config import GO_CONFIG
from .languages.java_config import JAVA_CONFIG
from .languages.cpp_config import CPP_CONFIG
from .languages.c_config import C_CONFIG
from .languages.csharp_config import CSHARP_CONFIG


LANGUAGE_REGISTRY: Dict[str, LanguageConfig] = {
    "dart": DART_CONFIG,
    "rust": RUST_CONFIG,
    "python": PYTHON_CONFIG,
    "typescript": TYPESCRIPT_CONFIG,
    "javascript": JAVASCRIPT_CONFIG,
    "go": GO_CONFIG,
    "java": JAVA_CONFIG,
    "cpp": CPP_CONFIG,
    "c": C_CONFIG,
    "csharp": CSHARP_CONFIG,
}

# Populate 'all' language with all extensions
_ALL_EXTENSIONS: Set[str] = set()
for config in LANGUAGE_REGISTRY.values():
    _ALL_EXTENSIONS.update(config.extensions)


def get_all_extensions() -> List[str]:
    """Get all extensions from all languages."""
    return list(_ALL_EXTENSIONS)


def create_dynamic_config(lang: str, extensions: List[str]) -> LanguageConfig:
    """
    Create a dynamic language config for an unknown language.

    Args:
        lang: Language name/key (will be used as-is, lowercased for key)
        extensions: List of file extensions (e.g., ['.foo', '.bar'])

    Returns:
        LanguageConfig with minimal settings for the given extensions
    """
    normalized_exts = [ext if ext.startswith(".") else f".{ext}" for ext in extensions]
    return LanguageConfig(
        name=lang.replace("-", "_").replace("_", " ").title(),
        key=lang.lower(),
        extensions=normalized_exts,
        ignore_patterns=[],
        always_include_full=[],
        description=f"Dynamic language config for {', '.join(normalized_exts)}",
    )


def get_language_config(
    lang: str,
    extra_extensions: Optional[List[str]] = None,
) -> LanguageConfig:
    """
    Get language configuration, optionally with extra extensions.

    Args:
        lang: Language name (e.g., 'dart', 'rust', 'all')
        extra_extensions: Additional extensions to include

    Returns:
        LanguageConfig with optionally added extensions

    Raises:
        ValueError: If language is not found and no extra_extensions provided
    """
    lang_lower = lang.lower()

    if lang_lower == "all":
        return LanguageConfig(
            name="All Languages",
            key="all",
            extensions=get_all_extensions(),
            ignore_patterns=[],
            always_include_full=[],
            description="All supported languages combined",
        )

    if lang_lower not in LANGUAGE_REGISTRY:
        if extra_extensions:
            return create_dynamic_config(lang, extra_extensions)
        available = ", ".join(sorted(LANGUAGE_REGISTRY.keys()))
        raise ValueError(
            f"Unknown language '{lang}'. Available: {available}"
        )

    config = LANGUAGE_REGISTRY[lang_lower]

    if extra_extensions:
        all_extensions = list(config.extensions) + extra_extensions
        return LanguageConfig(
            name=config.name,
            key=config.key,
            extensions=all_extensions,
            ignore_patterns=config.ignore_patterns,
            always_include_full=config.always_include_full,
            description=config.description,
        )

    return config


def get_language_configs(
    langs: List[str],
    extra_extensions: Optional[List[str]] = None,
) -> List[LanguageConfig]:
    """
    Get multiple language configurations combined.

    Args:
        langs: List of language names
        extra_extensions: Additional extensions to include for all languages

    Returns:
        List of LanguageConfig, or single config if only one language
    """
    if len(langs) == 0:
        return []

    if len(langs) == 1:
        return [get_language_config(langs[0], extra_extensions)]

    configs = []
    for lang in langs:
        configs.append(get_language_config(lang, extra_extensions))

    return configs


def list_languages() -> List[Dict[str, str]]:
    """List all available languages with their info."""
    result = []
    for lang_key, config in sorted(LANGUAGE_REGISTRY.items()):
        result.append(
            {
                "key": lang_key,
                "name": config.name,
                "extensions": ", ".join(config.extensions),
                "description": config.description,
            }
        )
    result.append(
        {
            "key": "all",
            "name": "All Languages",
            "extensions": ", ".join(sorted(_ALL_EXTENSIONS)),
            "description": "All supported languages combined",
        }
    )
    return result


def detect_language(file_path: Path) -> Optional[LanguageConfig]:
    """
    Detect language configuration based on file extension.

    Args:
        file_path: Path to the file

    Returns:
        Matching LanguageConfig or None if not found
    """
    for config in LANGUAGE_REGISTRY.values():
        if config.matches_file(file_path):
            return config
    return None
