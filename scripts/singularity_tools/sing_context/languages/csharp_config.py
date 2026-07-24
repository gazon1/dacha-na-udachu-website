"""C# language configuration."""
from ..config import LanguageConfig

CSHARP_CONFIG = LanguageConfig(
    name="C#",
    key="csharp",
    extensions=[".cs"],
    ignore_patterns=[
        "bin/",
        "obj/",
        "*.Designer.cs",
        "*.g.cs",
        "*.generated.cs",
        "node_modules/",
    ],
    always_include_full=[
        "*.csproj",
        "*.sln",
    ],
    description="C# / .NET applications",
    import_pattern=r"^\s*using\s+([^\s;]+);",
    entry_point_names=["Program.cs", "main.cs", "cli.cs"],
    config_names=["*.csproj", "*.sln", "appsettings.json"],
    test_patterns=["*Test.cs", "*Tests.cs", "tests/", "test/"],
)