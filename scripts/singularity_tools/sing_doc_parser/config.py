"""Configuration for documentation parser."""

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class ParserConfig:
    """
    Configuration for documentation parsing.
    
    Path filtering behavior:
    - If allowed_path_prefixes is empty, defaults to base_url path
    - All scraped pages must start with one of the allowed prefixes
    - Example: base_url="/handbook/flutter" → only /handbook/flutter/* pages
    """

    # ===== Target =====
    base_url: str = ""
    max_pages: int = 50
    max_depth: int = 3

    # ===== Filtering =====
    allowed_domains: List[str] = field(default_factory=list)
    """If empty, only the base_url domain is allowed"""
    
    allowed_path_prefixes: List[str] = field(default_factory=list)
    """
    List of path prefixes to allow. 
    If empty, defaults to the path component of base_url.
    Example: ["/handbook/flutter"] → only URLs starting with /handbook/flutter/
    """
    
    exclude_patterns: List[str] = field(default_factory=list)
    """Regex patterns to exclude URLs (applied after prefix filtering)"""

    # ===== Content extraction =====
    extract_code_blocks: bool = True
    extract_headings: bool = True
    min_content_length: int = 100
    """Skip pages with content shorter than this (characters)"""

    # ===== Politeness & anti-detection =====
    delay_between_requests: float = 1.0
    """Seconds to wait between requests"""
    
    user_agent: str = "ContextMerger/1.0"
    """User-Agent header for requests"""
    
    respect_robots_txt: bool = True
    """Whether to check and respect robots.txt rules"""

    # ===== Output =====
    output_format: str = "markdown"
    """Output format: 'markdown' or 'text'"""
    
    include_url_in_output: bool = True
    """Include source URL as HTML comment in output"""
    
    include_metadata: bool = True
    """Include meta description and OG tags in output"""

    # ===== Sitemap =====
    use_sitemap: bool = True
    """Try to discover and parse sitemap.xml for initial URLs"""

    def get_effective_path_prefixes(self) -> List[str]:
        """Return effective path prefixes with consistent trailing slash handling."""
        if self.allowed_path_prefixes:
            # Normalize: ensure prefixes end with / for consistent startsWith matching
            return [p if p.endswith("/") else f"{p}/" for p in self.allowed_path_prefixes]
        
        from urllib.parse import urlparse
        parsed = urlparse(self.base_url)
        prefix = parsed.path
        # Keep trailing slash if base URL has one, otherwise add for matching
        if not prefix.endswith("/"):
            prefix = prefix + "/" if prefix != "/" else prefix
        return [prefix if prefix else "/"]

    def __post_init__(self):
        """Validate and normalize configuration."""
        # Ensure path prefixes start with /
        self.allowed_path_prefixes = [
            p if p.startswith("/") else f"/{p}" 
            for p in self.allowed_path_prefixes
        ]