"""Singularity Documentation Parser — Parse and extract documentation."""

from .parser import parse_documentation
from .config import ParserConfig

__all__ = [
    "parse_documentation",
    "ParserConfig",
]
