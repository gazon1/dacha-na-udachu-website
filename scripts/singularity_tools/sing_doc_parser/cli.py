"""CLI for sing_doc_parser using Click."""

import sys
from pathlib import Path
from typing import List, Optional
from urllib.parse import urlparse

import click


@click.command(name="doc-parser")
@click.argument("url", type=str, required=True)
@click.option(
    "-o", "--output",
    type=click.Path(path_type=Path),
    default=None,
    help="Output file path (default: tmp/doc_parser_output.md)",
)
@click.option(
    "--format",
    "output_format",
    type=click.Choice(["markdown", "text"], case_sensitive=False),
    default="markdown",
    help="Output format (default: markdown)",
)
@click.option(
    "--max-pages",
    type=click.IntRange(1, 10000),
    default=50,
    show_default=True,
    help="Maximum pages to scrape",
)
@click.option(
    "--max-depth",
    type=click.IntRange(0, 10),
    default=3,
    show_default=True,
    help="Maximum link crawling depth from start URL",
)
@click.option(
    "--min-content-length",
    type=click.IntRange(0, 100000),
    default=100,
    show_default=True,
    help="Skip pages with content shorter than N characters",
)
@click.option(
    "--domain-only/--multi-domain",
    "domain_only",
    default=True,
    show_default=True,
    help="Restrict scraping to the same domain as base URL",
)
@click.option(
    "--include-path",
    "include_paths",
    multiple=True,
    metavar="PREFIX",
    help="Allowed path prefix (repeatable). Default: path of base URL. "
         "Example: --include-path /handbook/flutter",
)
@click.option(
    "--exclude",
    "exclude_patterns",
    multiple=True,
    metavar="REGEX",
    help="Regex pattern to exclude URLs (repeatable). Example: --exclude '.*pdf$'",
)
@click.option(
    "--respect-robots/--no-robots",
    "respect_robots",
    default=True,
    show_default=True,
    help="Respect robots.txt restrictions (default: --respect-robots)",
)
@click.option(
    "--delay",
    type=click.FloatRange(0, 60),
    default=1.0,
    show_default=True,
    help="Delay between requests in seconds",
)
@click.option(
    "--user-agent",
    type=str,
    default="ContextMerger/1.0",
    show_default=True,
    help="Custom User-Agent string",
)
@click.option(
    "--no-code-blocks",
    "extract_code_blocks",
    flag_value=False,
    default=None,
    help="Don't extract/format code blocks",
)
@click.option(
    "--extract-code-blocks/--no-code-blocks",
    "extract_code_blocks",
    default=True,
    show_default=True,
    help="Extract and format code blocks in output",
)
@click.option(
    "--no-sitemap",
    "use_sitemap",
    flag_value=False,
    default=None,
    help="Skip attempting to parse sitemap.xml",
)
@click.option(
    "--use-sitemap/--no-sitemap",
    "use_sitemap",
    default=True,
    show_default=True,
    help="Try to discover and parse sitemap.xml for initial URLs",
)
@click.option(
    "-v", "--verbose",
    is_flag=True,
    help="Verbose output with per-page details",
)
@click.option(
    "-q", "--quiet",
    is_flag=True,
    help="Quiet mode: suppress progress output, show only errors",
)
@click.pass_context
def cli(
    ctx: click.Context,
    url: str,
    output: Optional[Path],
    output_format: str,
    max_pages: int,
    max_depth: int,
    min_content_length: int,
    domain_only: bool,
    include_paths: tuple[str, ...],
    exclude_patterns: tuple[str, ...],
    respect_robots: Optional[bool],
    delay: float,
    user_agent: str,
    extract_code_blocks: Optional[bool],
    use_sitemap: Optional[bool],
    verbose: bool,
    quiet: bool,
) -> None:
    """
    🌐 Download and merge documentation from websites for LLM consumption.

    \b
    🔐 Anti-bot features:
      • Browser fingerprinting via curl-cffi (Chrome/Firefox impersonation)
      • Automatic retries with exponential backoff
      • Respects robots.txt and rate limiting by default

    \b
    🧹 Content cleaning:
      • Removes nav, footer, ads, cookie banners
      • Extracts main content using semantic selectors
      • Converts HTML to clean Markdown (code blocks preserved)

    \b
    📋 Examples:
      # Parse Flutter handbook (only /handbook/flutter/* pages)
      sing doc-parser https://education.yandex.ru/handbook/flutter -o flutter.md

      # Parse Python docs with depth limit
      sing doc-parser https://docs.python.org/3 --max-pages 100 --max-depth 2

      # Allow multiple path prefixes
      sing doc-parser https://example.com \\
          --include-path /docs/ --include-path /guides/ \\
          -o output.md

      # Ignore robots.txt and be verbose
      sing doc-parser https://internal.docs --no-robots --verbose
    """
    # Default output path
    if output is None:
        output = Path("tmp/doc_parser_output.md")

    # Validate and normalize URL
    parsed_url = urlparse(url)
    if not parsed_url.scheme or not parsed_url.netloc:
        click.echo(f"❌ Invalid URL: {url}", err=True)
        ctx.exit(1)

    normalized_url = url
    if not normalized_url.startswith(("http://", "https://")):
        normalized_url = f"https://{normalized_url}"

    # Prepare path prefixes: CLI args or default to base URL path
    allowed_path_prefixes = list(include_paths) if include_paths else None

    # Handle optional boolean flags (None = use default from parser)
    if respect_robots is None:
        respect_robots = True
    if extract_code_blocks is None:
        extract_code_blocks = True
    if use_sitemap is None:
        use_sitemap = True

    if not quiet:
        _print_header(
            url=normalized_url,
            output=output,
            max_pages=max_pages,
            max_depth=max_depth,
            domain_only=domain_only,
            path_prefixes=allowed_path_prefixes,
            respect_robots=respect_robots,
            output_format=output_format,
            delay=delay,
        )

    # Import here to avoid circular imports
    from .parser import parse_documentation

    try:
        stats = parse_documentation(
            base_url=normalized_url,
            output=output,
            max_pages=max_pages,
            max_depth=max_depth,
            allowed_domains=[parsed_url.netloc] if domain_only else [],
            allowed_path_prefixes=allowed_path_prefixes,
            exclude_patterns=list(exclude_patterns),
            respect_robots=respect_robots,
            delay=delay,
            user_agent=user_agent,
            min_content_length=min_content_length,
            extract_code_blocks=extract_code_blocks,
            output_format=output_format,
            verbose=verbose,
            use_sitemap=use_sitemap,
        )

        if stats["pages_scraped"] == 0:
            click.echo("⚠️  No pages scraped", err=True)
            click.echo("   Possible reasons:", err=True)
            click.echo("   • Site blocks requests (try --user-agent or check firewall)", err=True)
            click.echo("   • robots.txt denies access (try --no-robots)", err=True)
            click.echo("   • Path prefix too restrictive (check --include-path)", err=True)
            click.echo("   • Invalid URL or site structure", err=True)
            ctx.exit(1)

        if not quiet:
            _print_summary(stats)

        ctx.exit(0)

    except KeyboardInterrupt:
        click.echo("\n⚠️  Interrupted by user", err=True)
        ctx.exit(130)
    except (click.exceptions.Exit, click.exceptions.Abort):  # ← добавь это
        raise
    except Exception as e:
        if verbose:
            import traceback
            traceback.print_exc()
        click.echo(f"❌ Error: {e}", err=True)
        ctx.exit(1)


def _print_header(
    url: str,
    output: Path,
    max_pages: int,
    max_depth: int,
    domain_only: bool,
    path_prefixes: Optional[List[str]],
    respect_robots: bool,
    output_format: str,
    delay: float,
) -> None:
    """Print formatted header with configuration."""
    click.echo("🌐 Web Documentation Parser")
    click.echo("═" * 60)
    click.echo(f"  🎯 URL:              {url}")
    click.echo(f"  📄 Max pages:        {max_pages}")
    click.echo(f"  🔗 Max depth:        {max_depth}")
    click.echo(f"  🌍 Domain only:      {domain_only}")
    
    prefix_display = path_prefixes if path_prefixes else "[auto: base URL path]"
    click.echo(f"  📁 Path prefixes:    {prefix_display}")
    
    click.echo(f"  🤖 Respect robots:   {respect_robots}")
    click.echo(f"  📝 Output format:    {output_format}")
    click.echo(f"  💾 Output file:      {output.resolve()}")
    click.echo(f"  ⏱  Request delay:    {delay}s")
    click.echo("═" * 60)
    click.echo()


def _print_summary(stats: dict) -> None:
    """Print formatted summary after parsing."""
    click.echo()
    click.echo("═" * 60)
    click.echo("✅ PARSING COMPLETE")
    click.echo("═" * 60)
    click.echo(f"  📁 Output:           {stats['output_file']}")
    click.echo(f"  📊 Pages scraped:    {stats['pages_scraped']}")
    click.echo(f"  📝 Total words:      {stats['total_words']:,}")
    click.echo(f"  🎯 Est. tokens:      {stats['estimated_tokens']:,}")
    
    if stats.get("sitemap_used"):
        click.echo(f"  🗺️  Sitemap used:    Yes ({stats['sitemap_urls_found']} URLs found)")
    if stats.get("path_prefixes_used"):
        click.echo(f"  📁 Path filter:      {stats['path_prefixes_used']}")
    if stats["errors"] > 0:
        click.echo(f"  ⚠️  Errors:          {stats['errors']}")
    if stats["not_found"] > 0:
        click.echo(f"  🔍 404 Not Found:   {stats['not_found']}")
    if stats["skipped"] > 0:
        click.echo(f"  ⊘ Skipped:          {stats['skipped']}")
    click.echo("═" * 60)


# Entry point for setup.py / pyproject.toml
def main() -> None:
    """Entry point for the CLI."""
    cli(obj={})


if __name__ == "__main__":
    main()