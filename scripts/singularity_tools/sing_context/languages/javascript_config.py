"""JavaScript language configuration."""

from ..config import LanguageConfig

JAVASCRIPT_CONFIG = LanguageConfig(
    name="JavaScript",
    key="javascript",
    extensions=[".js", ".jsx", ".mjs"],
    ignore_patterns=[
        "node_modules/",
        "dist/",
        "build/",
        "*.test.js",
        "*.spec.js",
    ],
    always_include_full=[
        "package.json",
    ],
    description="JavaScript applications",
    import_pattern=r"import\s+['\"]([^'\"]+)['\"]",
    entry_point_names=["main.js", "index.js", "cli.js", "app.js"],
    config_names=["package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"],
    test_patterns=["*.test.js", "*.spec.js", "tests/", "test/"],
)
