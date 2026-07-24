"""Python language configuration."""

from ..config import LanguageConfig

PYTHON_CONFIG = LanguageConfig(
    name="Python",
    key="python",
    extensions=[".py", ".pyi"],
    ignore_patterns=[
        "__pycache__/",
        "*.pyc",
        "*.pyo",
        ".venv/",
        "venv/",
        "env/",
        "*_test.py",
        "test_*.py",
    ],
    always_include_full=[
        "requirements.txt",
        "pyproject.toml",
        "setup.py",
        "setup.cfg",
    ],
    description="Python applications",
    import_pattern=r"^(?:import|from)\s+([^\s;]+)",
    entry_point_names=["__init__.py", "__main__.py", "main.py", "cli.py", "app.py"],
    config_names=["pyproject.toml", "setup.py", "setup.cfg", "requirements.txt", "Pipfile", "poetry.lock"],
    test_patterns=["*_test.py", "test_*.py", "tests/", "test/"],
)
