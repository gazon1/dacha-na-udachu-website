"""C++ language configuration."""

from ..config import LanguageConfig

CPP_CONFIG = LanguageConfig(
    name="C++",
    key="cpp",
    extensions=[".cpp", ".cc", ".cxx", ".hpp", ".h", ".hxx"],
    ignore_patterns=[
        "build/",
        "out/",
        "bin/",
        "*_test.cpp",
        "*_test.cc",
    ],
    always_include_full=[
        "CMakeLists.txt",
        "Makefile",
    ],
    description="C/C++ applications",
    import_pattern=r'^\s*#include\s*[<"]([^>"]+)[>"]',
    entry_point_names=["main.cpp", "main.cc", "main.cxx", "cli.cpp"],
    config_names=["CMakeLists.txt", "Makefile", "CMakeLists.txt", "compile_commands.json"],
    test_patterns=["*_test.cpp", "*_test.cc", "test/", "tests/"],
)
