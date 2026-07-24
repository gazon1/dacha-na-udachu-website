"""Java language configuration."""

from ..config import LanguageConfig

JAVA_CONFIG = LanguageConfig(
    name="Java",
    key="java",
    extensions=[".java"],
    ignore_patterns=[
        "target/",
        "build/",
        ".gradle/",
        "*Test.java",
        "*Tests.java",
    ],
    always_include_full=[
        "pom.xml",
        "build.gradle",
        "build.gradle.kts",
    ],
    description="Java applications",
    import_pattern=r"^import\s+([^\s;]+);",
    entry_point_names=["main.java", "Main.java", "cli.java"],
    config_names=["pom.xml", "build.gradle", "build.gradle.kts", "settings.gradle"],
    test_patterns=["*Test.java", "*Tests.java", "test/", "tests/"],
)
