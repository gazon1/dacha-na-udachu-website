"""Dart language configuration for sing_context."""

from ..config import LanguageConfig

DART_CONFIG = LanguageConfig(
    name="Dart",
    key="dart",
    extensions=[".dart"],
    ignore_patterns=[
        # === Generated code ===
        "*.g.dart",
        "*.g.part",
        "*.freezed.dart",
        "*.mapper.dart",
        "*.config.dart",
        "*.gr.dart",
        "*.mocks.dart",

        # === Build outputs ===
        "build/",
        ".dart_tool/",
        ".packages",
        ".flutter-plugins",
        ".flutter-plugins-dependencies",

        # === Test coverage ===
        "test/.test_coverage",
        "coverage/",

        # === Test files ===
        "*_test.dart",
        "test/*_test.dart",

        # === Environment ===
        ".env",
        "*.log",
        "*.tmp",

        # === IDE ===
        ".idea/",
        "*.iml",
        "*.ipr",
        "*.iws",
        ".vscode/",
        "*.code-workspace",

        # === OS ===
        ".DS_Store",
        "Thumbs.db",
        "*~",
    ],
    always_include_full=[
        "pubspec.yaml",
        "pubspec.lock",
    ],
    description="Flutter/Dart applications",
    import_pattern=r"import\s+['\"]([^'\"]+)['\"]",
    entry_point_names=["main.dart", "lib/main.dart", "cli.dart"],
    config_names=["pubspec.yaml", "pubspec.lock", "analysis_options.yaml"],
    test_patterns=["*_test.dart", "test_*.dart", "tests/", "test/"],
)
