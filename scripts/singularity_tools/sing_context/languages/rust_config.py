"""Rust language configuration."""

from ..config import LanguageConfig

RUST_CONFIG = LanguageConfig(
    name="Rust",
    key="rust",
    extensions=[".rs"],
    ignore_patterns=[
        "target/",
        "*.pb.rs",
        "*.rs.bk",
        "frb_generated.rs"
    ],
    always_include_full=[
        "Cargo.toml",
        "rust-toolchain.toml",
        "rust-toolchain",
    ],
    description="Rust systems programming",
    import_pattern=r"^use\s+([^;]+);",
    entry_point_names=["main.rs", "lib.rs", "cli.rs"],
    config_names=["Cargo.toml", "Cargo.lock", "rust-toolchain.toml", "rust-toolchain"],
    test_patterns=["*_test.rs", "tests/", "test/"],
)
