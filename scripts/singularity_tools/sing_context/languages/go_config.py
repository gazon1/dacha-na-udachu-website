"""Go language configuration."""

from ..config import LanguageConfig

GO_CONFIG = LanguageConfig(
    name="Go",
    key="go",
    extensions=[".go"],
    ignore_patterns=[
        "vendor/",
        "Godeps/",
        "*_test.go",
    ],
    always_include_full=[
        "go.mod",
        "go.sum",
    ],
    description="Go applications",
    import_pattern=r'^import\s+(?:\([^)]+\)|"([^"]+)")',
    entry_point_names=["main.go", "cmd/", "internal/"],
    config_names=["go.mod", "go.sum", "Makefile"],
    test_patterns=["*_test.go", "tests/", "test/"],
)
