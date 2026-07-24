"""C language configuration."""

from ..config import LanguageConfig

C_CONFIG = LanguageConfig(
    name="C",
    key="c",
    extensions=[".c", ".h"],
    ignore_patterns=[
        "build/",
        "out/",
        "bin/",
        "*_test.c",
    ],
    always_include_full=[
        "Makefile",
        "CMakeLists.txt",
    ],
    description="C applications",
    import_pattern=r'^\s*#include\s*[<"]([^>"]+)[>"]',
    entry_point_names=["main.c", "cli.c"],
    config_names=["Makefile", "CMakeLists.txt", "compile_commands.json"],
    test_patterns=["*_test.c", "test/", "tests/"],
)
