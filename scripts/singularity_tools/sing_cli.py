#!/usr/bin/env python3
# ── sing_cli.py ────────────────────────────────────────────────────────────
"""Singularity Tools — CLI dispatcher.

All subcommands are registered lazily (imported only when invoked) so the
CLI starts fast even if optional heavy dependencies are missing.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import NoReturn

import click


# ── Root group ────────────────────────────────────────────────────────────────

@click.group(
    context_settings={"help_option_names": ["-h", "--help"]},
    help="🔗 Singularity Tools — Utilities for LLM context creation",
    epilog="""
\b
📋 Available subcommands:
  sing context           Extract source code files into LLM-ready context
  sing doc-parser        Download and merge web documentation
  sing run-batch         Run AI agent batches on epics
  sing bd-close          Close Beads epics (supports ranges/regex)
  sing bd-update         Update Beads epics (supports ranges/regex)
  sing bd-parse          Parse Claude plan.md → Beads epics/tasks
  sing catalog-selector  Interactive Wildberries category picker (NiceGUI)
  sing yadisk-upload     Upload files to Yandex Disk
  sing load-catalog      Load selected categories from YAML to PostgreSQL
  sing compile-docs      Compile Markdown docs to HTML/PDF

\b
💡 Tip: Use `sing <subcommand> --help` for subcommand-specific options.
    """,
)
@click.version_option("2.0.0", "--version", "-V", message="sing %(version)s")
def cli() -> None:
    pass


# ── Lazy-registration helper ──────────────────────────────────────────────────

def _register(import_path: str, attr: str, name: str) -> None:
    """
    Register a Click command/group lazily.

    Errors during import are surfaced as a disabled command that prints a
    helpful message instead of crashing the whole CLI at startup.
    """
    try:
        import importlib
        module = importlib.import_module(import_path, package=__package__)
        cmd = getattr(module, attr)
        cli.add_command(cmd, name=name)
    except Exception as exc:  # noqa: BLE001
        # Capture at definition time via default args — avoids late-binding
        _exc: BaseException = exc
        _name: str = name

        @cli.command(name=name, hidden=False)
        def _stub_cmd(  # type: ignore[return]
            exc: BaseException = _exc,
            cmd_name: str = _name,
        ) -> NoReturn:
            click.echo(
                click.style(
                    f"❌  '{cmd_name}' is unavailable: {exc}\n"
                    f"   Check that all dependencies are installed.",
                    fg="red",
                ),
                err=True,
            )
            sys.exit(1)


# ── context ───────────────────────────────────────────────────────────────────
_register(".sing_context.cli", "cli", "context")


# ── doc-parser ────────────────────────────────────────────────────────────────
_register(".sing_doc_parser.cli", "cli", "doc-parser")


# ── run-batch ─────────────────────────────────────────────────────────────────
_register(".run_batch", "run_batch", "run-batch")


# ── bd-close ──────────────────────────────────────────────────────────────────
_register(".bd_close", "bd_close", "bd-close")


# ── bd-update ─────────────────────────────────────────────────────────────────
_register(".bd_update", "bd_update", "bd-update")


# ── bd-parse (Claude plan → Beads) ────────────────────────────────────────────
_register(".claude_plan_md_parser", "cli", "bd-parse")


# ── catalog-selector (NiceGUI WB category picker) ────────────────────────────
_register(".catalog_selector", "catalog_selector_cmd", "catalog-selector")


# ── yadisk-upload ─────────────────────────────────────────────────────────────
_register(".yadisk_upload", "upload_file", "yadisk-upload")


# ── dart-barrel ───────────────────────────────────────────────────────────────
_register(".dart_barrel", "cli", "dart-barrel")


# ── load-catalog (YAML → PostgreSQL) ─────────────────────────────────────────
_register(".load_catalog_to_pg", "load_catalog_to_pg", "load-catalog")


# ── compile-docs (Markdown docs → HTML/PDF) ───────────────────────────────────
_register(".compile_docs.compile_docs", "compile_docs", "compile-docs")


# ── Entry points ──────────────────────────────────────────────────────────────

def main() -> None:
    cli()


if __name__ == "__main__":
    main()