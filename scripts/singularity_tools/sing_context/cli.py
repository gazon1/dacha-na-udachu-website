"""CLI for sing_context using Click."""

import sys
from pathlib import Path
from typing import Optional, List, Tuple

import click

from .language_registry import (
    get_language_config,
    get_language_configs,
    list_languages,
)
from .extractor import extract_context


def _list_languages_callback(ctx: click.Context, param: click.Parameter, value: bool) -> None:
    """Callback to list supported languages and exit."""
    if not value or ctx.resilient_parsing:
        return
    
    click.echo("📚 Supported Languages:\n")
    for lang_info in list_languages():
        if lang_info["key"] == "all":
            click.echo(f"\n  {lang_info['key']:12} — {lang_info['name']:15}")
        else:
            click.echo(
                f"  {lang_info['key']:12} — {lang_info['name']:15} "
                f"({lang_info['extensions']})"
            )
    ctx.exit(0)


def _ts_status_callback(ctx: click.Context, param: click.Parameter, value: bool) -> None:
    """Callback to show tree-sitter status and exit."""
    if not value or ctx.resilient_parsing:
        return
    
    from .ts_analyzer import get_status
    status = get_status()
    
    click.echo("🌳 Tree-sitter Status\n")
    click.echo(f"  Core library: {'✓' if status['has_tree_sitter'] else '✗ not installed'}\n")
    
    if status['has_tree_sitter']:
        click.echo("  Language bindings:")
        for lang, info in sorted(status['languages'].items()):
            status_icon = '✓' if info['available'] else '✗'
            backend = info.get('backend', 'N/A')
            module = info.get('module', '')
            module_info = f" ({module})" if module else ""
            
            if info['available']:
                click.echo(f"    {lang:12} {status_icon} {backend}{module_info}")
            else:
                error_msg = info.get('error', 'unknown')
                click.echo(f"    {lang:12} {status_icon} {error_msg}")
    ctx.exit(0)


@click.command(name="context")
@click.argument(
    "paths",
    type=click.Path(exists=True, file_okay=True, dir_okay=True, path_type=Path),
    nargs=-1,
    required=False,
)
@click.option(
    "-o", "--output",
    "output",
    type=click.Path(path_type=Path),
    required=True,
    help="Output file path",
)
@click.option(
    "--lang", "-l",
    type=str,
    multiple=True,
    default=("dart",),
    show_default=True,
    help="Programming language (can be specified multiple times, e.g., --lang dart --lang rust)",
)
@click.option(
    "--ext", "-e",
    type=str,
    default="",
    help="Additional file extensions (comma-separated, e.g., .toml,.md)",
)
@click.option(
    "--agent-md",
    type=click.Path(exists=True, file_okay=True, dir_okay=False, path_type=Path),
    default=None,
    help="Path to AGENT.md file to include",
)
@click.option(
    "--no-agent-md",
    "auto_agent_md",
    flag_value=False,
    default=True,
    help="Disable auto-detection of AGENT.md",
)
@click.option(
    "--contextignore",
    type=click.Path(exists=True, file_okay=True, dir_okay=False, path_type=Path),
    default=None,
    help="Path to .contextignore file (default: .contextignore in first search path)",
)
@click.option(
    "--api-only",
    is_flag=True,
    help="Extract only public API (classes, functions)",
)
@click.option(
    "--aggressive",
    is_flag=True,
    help="Aggressive compression (remove comments, whitespace)",
)
@click.option(
    "-v", "--verbose",
    is_flag=True,
    help="Verbose output",
)
@click.option(
    "--list-langs",
    is_flag=True,
    is_eager=True,
    expose_value=False,
    callback=_list_languages_callback,
    help="List all supported languages and exit",
)
@click.option(
    "--ts-status",
    is_flag=True,
    is_eager=True,
    expose_value=False,
    callback=_ts_status_callback,
    help="Show tree-sitter availability status",
)
@click.option(
    "--no-gitignore",
    "respect_gitignore",
    flag_value=False,
    default=None,
    help="Ignore .gitignore files",
)
@click.option(
    "--respect-gitignore/--no-gitignore",
    "respect_gitignore",
    default=True,
    show_default=True,
    help="Respect .gitignore files during extraction",
)
@click.option(
    "--focus",
    "focus_keywords",
    type=str,
    default=None,
    help="Focus on files containing these keywords (comma-separated)",
)
@click.option(
    "--entry-point",
    "entry_point",
    type=click.Path(exists=True, file_okay=True, dir_okay=False, path_type=Path),
    default=None,
    help="Entry point file - prioritize files related to this (via import graph)",
)
@click.option(
    "--ignore-dirs",
    "ignore_dirs",
    type=str,
    default=None,
    help="Comma-separated list of directory names to ignore (e.g., build,.dart_tool,vendor)",
)
@click.pass_context
def cli(
    ctx: click.Context,
    paths: Tuple[Path, ...],
    output: Path,
    lang: Tuple[str, ...],
    ext: str,
    agent_md: Optional[Path],
    auto_agent_md: bool,
    contextignore: Optional[Path],
    api_only: bool,
    aggressive: bool,
    verbose: bool,
    respect_gitignore: Optional[bool],
    focus_keywords: Optional[str],
    entry_point: Optional[Path],
    ignore_dirs: Optional[str],
) -> None:
    """
    Extract code context for AI assistants.

    PATH is one or more directories or files to extract context from.
    Multiple paths are merged into a single output file.

    \b
    📋 Examples:
      sing context lib/ -o tmp/dart.txt --lang dart
      sing context rust/ -o tmp/rust.txt --lang rust --ext .toml,.md
      sing context src/ tests/ -o tmp/both.txt --lang python
      sing context lib/ -o tmp/compressed.txt --lang dart --aggressive
      sing context lib/ -o tmp/multi.txt --lang dart --lang rust --lang python
      sing context lib/ -o tmp/custom.txt --lang mylang --ext .foo,.bar

    \b
    🗣️  Supported languages:
      dart, rust, python, typescript, javascript, go, java, cpp, c, all
      Unknown languages are supported via --ext for file extensions
    """
    # Handle optional boolean flag
    if respect_gitignore is None:
        respect_gitignore = True

    # Parse extra extensions
    extra_extensions: List[str] = []
    if ext:
        extra_extensions = [e.strip() for e in ext.split(",") if e.strip()]
        if extra_extensions and verbose:
            click.echo(f"🔧 Extra extensions: {extra_extensions}", err=True)

    # Get language configs (supports multiple languages and dynamic configs)
    lang_list = list(lang) if lang else ["dart"]
    try:
        lang_configs = get_language_configs(lang_list, extra_extensions)

        # Override gitignore setting from CLI
        for cfg in lang_configs:
            cfg.respect_gitignore = respect_gitignore

        if verbose:
            lang_names = ", ".join(c.name for c in lang_configs)
            click.echo(f"📐 Languages: {lang_names}", err=True)
            all_exts = set()
            for cfg in lang_configs:
                all_exts.update(cfg.extensions)
            click.echo(f"📎 Extensions: {', '.join(sorted(all_exts))}", err=True)

    except ValueError as e:
        click.echo(f"❌ {e}", err=True)
        ctx.exit(1)

    # Default to current directory if no paths provided
    search_paths = list(paths) if paths else [Path(".")]

    # Auto-detect AGENT.md if enabled
    if auto_agent_md and agent_md is None:
        for search_path in search_paths:
            agent_md_path = search_path / "AGENT.md"
            if agent_md_path.exists():
                agent_md = agent_md_path
                if verbose:
                    click.echo(f"📄 Auto-detected AGENT.md: {agent_md}", err=True)
                break

    # Create output directory
    output.parent.mkdir(parents=True, exist_ok=True)

    # Extract context
    if verbose:
        for p in search_paths:
            click.echo(f"📁 Extracting from: {p.resolve()}", err=True)
        click.echo(f"📄 Output: {output.resolve()}\n", err=True)

    result = extract_context(
        search_dirs=search_paths,
        lang_config=lang_configs,
        output=output,
        agent_md=agent_md,
        contextignore_path=contextignore,
        api_only=api_only,
        aggressive=aggressive,
        verbose=verbose,
        focus_keywords=focus_keywords,
        entry_point=entry_point,
        ignore_dirs=ignore_dirs,
    )

    # Print summary
    click.echo(f"\n✅ Context extracted successfully!")
    click.echo(f"   📊 Files: {result.total_files}")
    click.echo(f"   📏 Lines: {result.total_lines}")
    click.echo(f"   💾 Output: {output.resolve()}")
    click.echo(f"   🌳 Tree-sitter: {'✓' if result.tree_sitter_available else '✗ (regex fallback)'}")

    if result.import_graph:
        click.echo(
            f"   🔗 Import graph: {len(result.import_graph)} files with imports"
        )

    if result.analysis_results:
        total_symbols = sum(len(a.symbols) for a in result.analysis_results.values())
        total_classes = sum(len(a.classes) for a in result.analysis_results.values())
        total_functions = sum(len(a.functions) for a in result.analysis_results.values())
        if total_symbols:
            click.echo(f"   📈 Code analysis: {total_symbols} symbols, "
                      f"{total_classes} classes, {total_functions} functions")


# Entry point for dispatcher (sing_cli.py)
def main(args: Optional[List[str]] = None) -> int:
    """
    Entry point for CLI dispatcher.
    
    Called with standalone_mode=False to allow error handling by parent.
    """
    try:
        cli(args=args, standalone_mode=False)
        return 0
    except click.ClickException as e:
        e.show()
        return e.exit_code
    except SystemExit as e:
        # Propagate exit codes from callbacks (--list-langs, --ts-status)
        return e.code if isinstance(e.code, int) else (0 if e.code is None else 1)


if __name__ == "__main__":
    # Direct execution: use standalone_mode=True (default)
    cli()