"""TypeScript language configuration."""

from ..config import LanguageConfig

TYPESCRIPT_CONFIG = LanguageConfig(
    name="TypeScript",
    key="typescript",
    extensions=[".ts", ".tsx"],
    ignore_patterns=[
        "node_modules/",
        "dist/",
        "build/",
        "*.test.ts",
        "*.spec.ts",
        "*.d.ts",
    ],
    always_include_full=[
        "package.json",
        "tsconfig.json",
    ],
    description="TypeScript/React applications",
    import_pattern=r"import\s+['\"]([^'\"]+)['\"]",
    entry_point_names=["main.ts", "index.ts", "cli.ts", "app.ts"],
    config_names=["package.json", "tsconfig.json", "package-lock.json", "yarn.lock"],
    test_patterns=["*.test.ts", "*.spec.ts", "tests/", "test/"],
)
