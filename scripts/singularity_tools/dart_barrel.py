#!/usr/bin/env python3
"""
dart_barrel.py — Generates hierarchical `export.dart` barrel files for Dart/Flutter projects.

Uses bottom-up directory traversal so parent directories automatically re-export
child `export.dart` files. Designed for safe, deterministic, and idempotent execution.

Usage:
    python dart_barrel.py lib/
    python dart_barrel.py lib/ --dry-run
    python dart_barrel.py lib/ --overwrite --log-level DEBUG
    python dart_barrel.py src/ --ext .dart --ext .g.dart --ignore-dir gen
"""

import os
import sys
from pathlib import Path
from typing import List, Set, Dict, Tuple, Optional

import click
from loguru import logger
import pathspec

# ============================================================================
# Gitignore Support — Reuses patterns from sing_context/gitignore.py
# ============================================================================

class HierarchicalGitignoreMatcher:
    """
    Matches files against hierarchical .gitignore patterns.
    Loads all .gitignore files from root to each directory and applies
    patterns based on directory depth (parent .gitignore affects children).
    """
    
    def __init__(self, root_dir: Path):
        self.root_dir = root_dir.resolve()
        self._specs: Dict[Path, pathspec.PathSpec] = {}
        self._load_all_gitignores()
        logger.debug(f"📁 Loaded {len(self._specs)} .gitignore file(s) under {self.root_dir}")
    
    def _load_all_gitignores(self) -> None:
        """Load all .gitignore files from root to leaves, keyed by their directory."""
        for gitignore_path in self.root_dir.rglob(".gitignore"):
            try:
                gitignore_dir = gitignore_path.parent
                with open(gitignore_path, "r", encoding="utf-8") as f:
                    patterns = [line.strip() for line in f if line.strip() and not line.startswith("#")]
                if patterns:
                    spec = pathspec.PathSpec.from_lines("gitwildmatch", patterns)
                    self._specs[gitignore_dir] = spec
                    logger.debug(f"  📄 Loaded: {gitignore_path} ({len(patterns)} patterns)")
            except Exception as e:
                logger.warning(f"⚠️  Failed to load {gitignore_path}: {e}")
    
    def _get_applicable_specs(self, target_dir: Path) -> List[Tuple[Path, pathspec.PathSpec]]:
        """
        Get all .gitignore specs that apply to target_dir.
        Returns list of (gitignore_dir, spec) sorted by depth (shallowest first).
        """
        try:
            rel_target = target_dir.relative_to(self.root_dir)
            target_parts = rel_target.parts
        except ValueError:
            # target_dir is outside root_dir
            return []
        
        applicable = []
        for spec_dir, spec in self._specs.items():
            try:
                rel_spec_dir = spec_dir.relative_to(self.root_dir)
                spec_parts = rel_spec_dir.parts
                # spec_dir applies if it's a parent (or same) as target_dir
                if len(spec_parts) <= len(target_parts) and target_parts[:len(spec_parts)] == spec_parts:
                    applicable.append((spec_dir, spec))
            except ValueError:
                continue
        
        # Sort by depth (shallowest first) so parent patterns apply before child
        applicable.sort(key=lambda x: len(x[0].relative_to(self.root_dir).parts))
        return applicable
    
    def should_ignore(self, file_path: Path, current_dir: Path) -> bool:
        """
        Check if file_path should be ignored based on all applicable .gitignore files.
        current_dir is the directory being processed (for relative path calculation).
        """
        try:
            # Use path relative to current_dir for pattern matching (git behavior)
            rel_path = file_path.relative_to(current_dir).as_posix()
        except ValueError:
            try:
                rel_path = file_path.relative_to(self.root_dir).as_posix()
            except ValueError:
                rel_path = file_path.name
        
        filename = file_path.name
        
        # Check all applicable specs
        for spec_dir, spec in self._get_applicable_specs(current_dir):
            if spec.match_file(rel_path) or spec.match_file(filename):
                logger.debug(f"  🚫 Ignored by {spec_dir / '.gitignore'}: {rel_path}")
                return True
        return False


# ============================================================================
# CLI & Main Logic
# ============================================================================

# Configure loguru with structured output
logger.remove()  # Remove default handler
logger.add(
    sys.stderr,
    format="<green>{time:HH:mm:ss}</green> [<level>{level}</level>] {message}",
    level="INFO",
    colorize=True,
)

# Standard Flutter/Dart directories to ignore (in addition to .gitignore)
DEFAULT_IGNORE_DIRS: Set[str] = {
    "build", ".dart_tool", ".pub-cache", "packages",
    "test", "ios", "android", "macos", "windows", "linux", "web",
    ".idea", ".vscode", "node_modules",
}


def is_ignored_dir(dirname: str, extra_ignore: Set[str]) -> bool:
    """Check if a directory name should be skipped (hard-coded ignores)."""
    return dirname in DEFAULT_IGNORE_DIRS or dirname in extra_ignore


@click.command()
@click.argument(
    "root_dir",
    type=click.Path(exists=True, file_okay=False, path_type=Path),
    default=Path("."),
)
@click.option(
    "--output-name", default="export.dart", show_default=True,
    help="Name of the barrel file to generate.",
)
@click.option(
    "--ext", multiple=True, default=[".dart"], show_default=True,
    help="File extensions to include (repeatable).",
)
@click.option(
    "--ignore-dir", multiple=True,
    help="Additional directories to ignore (repeatable, in addition to .gitignore).",
)
@click.option(
    "--dry-run", is_flag=True,
    help="Print planned actions without writing files.",
)
@click.option(
    "--overwrite", is_flag=True,
    help="Overwrite existing barrel files even if content matches.",
)
@click.option(
    "--no-header", is_flag=True,
    help="Skip the auto-generated header comment.",
)
@click.option(
    "--no-gitignore", is_flag=True,
    help="Disable .gitignore pattern matching.",
)
@click.option(
    "--log-level",
    type=click.Choice(["DEBUG", "INFO", "WARNING", "ERROR"], case_sensitive=False),
    default="INFO", show_default=True,
    help="Logging verbosity level.",
)
@click.version_option("1.0.0", "--version", "-V", message="%(prog)s %(version)s")
def cli(
    root_dir: Path,
    output_name: str,
    ext: tuple,
    ignore_dir: tuple,
    dry_run: bool,
    overwrite: bool,
    no_header: bool,
    no_gitignore: bool,
    log_level: str,
) -> None:
    """
    Generate hierarchical export.dart barrel files using bottom-up traversal.
    
    Automatically creates `export.dart` in directories containing source files,
    and re-exports child barrels in parent directories.
    
    Respects all .gitignore files hierarchically (parent patterns apply to children).
    """
    # Configure loguru level
    logger.level(log_level.upper())
    
    extra_ignore = set(ignore_dir)
    extensions = set(ext)
    root_dir = root_dir.resolve()

    logger.info(f"📂 Scanning: {root_dir}")
    logger.info(f"📄 Extensions: {extensions}")
    logger.info(f"🚫 Hard-coded ignores: {DEFAULT_IGNORE_DIRS | extra_ignore}")
    
    # Initialize gitignore matcher if enabled
    gitignore_matcher: Optional[HierarchicalGitignoreMatcher] = None
    if not no_gitignore:
        gitignore_matcher = HierarchicalGitignoreMatcher(root_dir)
        logger.info(f"🔍 Gitignore matching: enabled ({len(gitignore_matcher._specs)} .gitignore files loaded)")
    else:
        logger.info("🔍 Gitignore matching: disabled (--no-gitignore)")

    created_count = 0
    skipped_count = 0
    updated_count = 0
    gitignored_count = 0

    # os.walk(topdown=False) yields directories from deepest to shallowest
    for dirpath, dirnames, filenames in os.walk(root_dir, topdown=False):
        dir_path = Path(dirpath)

        # Prune ignored directories (modifies in-place for os.walk consistency)
        dirnames[:] = [d for d in dirnames if not is_ignored_dir(d, extra_ignore)]

        # Skip if the directory itself is hard-coded ignored
        if dir_path.name in extra_ignore or dir_path.name in DEFAULT_IGNORE_DIRS:
            continue

        # 1. Collect source files in the current directory
        dart_files = [
            dir_path / f 
            for f in filenames 
            if Path(f).suffix in extensions and f != output_name
        ]

        # 2. Filter by .gitignore if enabled
        if gitignore_matcher:
            before_count = len(dart_files)
            dart_files = [
                f for f in dart_files 
                if not gitignore_matcher.should_ignore(f, dir_path)
            ]
            gitignored_count += before_count - len(dart_files)

        # 3. Collect child barrel files that were created in previous iterations
        child_exports = [
            dir_path / d / output_name
            for d in dirnames
            if (dir_path / d / output_name).exists()
        ]

        # Skip empty directories (nothing to export)
        if not dart_files and not child_exports:
            continue

        # 4. Generate deterministic barrel content
        lines = []
        if not no_header:
            rel_dir = dir_path.relative_to(root_dir).as_posix()
            lines.append(f"// Auto-generated barrel file for {rel_dir or '.'}")
            lines.append("// DO NOT MODIFY MANUALLY")
            lines.append("")

        # Sort alphabetically for stable git diffs
        sorted_dart = sorted(dart_files, key=lambda p: p.name)
        sorted_exports = sorted(child_exports, key=lambda p: p.name)

        for fp in sorted_dart:
            lines.append(f"export '{fp.name}';")

        for fp in sorted_exports:
            rel_path = fp.relative_to(dir_path).as_posix()
            lines.append(f"export '{rel_path}';")

        content = "\n".join(lines) + "\n"

        # 5. Write file (idempotent check)
        barrel_path = dir_path / output_name
        if barrel_path.exists():
            existing = barrel_path.read_text(encoding="utf-8")
            if existing.strip() == content.strip():
                logger.debug(f"✅ Up-to-date: {barrel_path.relative_to(root_dir)}")
                skipped_count += 1
                continue
            if not overwrite:
                logger.warning(f"⚠️  Existing differs: {barrel_path.relative_to(root_dir)} (use --overwrite)")
                skipped_count += 1
                continue

        if dry_run:
            logger.info(f"🧪 [DRY RUN] Would create: {barrel_path.relative_to(root_dir)}")
            logger.debug(f"   Content:\n{content}")
        else:
            barrel_path.write_text(content, encoding="utf-8")
            updated_count += 1
            logger.info(f"✨ Generated: {barrel_path.relative_to(root_dir)} ({len(dart_files)} files, {len(child_exports)} child exports)")

    # Summary
    logger.info("=" * 60)
    if dry_run:
        logger.info("🧪 Dry run complete. No files were modified.")
    else:
        logger.info(f"✅ Finished! Updated/Created: {updated_count}, Skipped (up-to-date): {skipped_count}")
        if gitignored_count > 0:
            logger.info(f"🚫 Files ignored by .gitignore: {gitignored_count}")
    logger.info("=" * 60)


if __name__ == "__main__":
    cli()