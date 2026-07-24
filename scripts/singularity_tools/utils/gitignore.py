"""Gitignore pattern matcher using pathspec."""
import os
from pathlib import Path
from typing import List, Optional

try:
    import pathspec
    HAS_PATHSPEC = True
except ImportError:
    HAS_PATHSPEC = False

try:
    from loguru import logger
except ImportError:
    import logging
    logger = logging.getLogger(__name__)


class GitignoreMatcher:
    """
    Matches files against .gitignore patterns.
    Supports:
    - Root .gitignore
    - Nested .gitignore files in subdirectories
    - Standard gitignore patterns
    """
    def __init__(self, root_dir: Path, verbose: bool = False):
        """
        Initialize matcher with root directory.
        Args:
            root_dir: Root directory to search for .gitignore files
            verbose: Enable verbose logging
        """
        self.root_dir = root_dir.resolve()
        self._specs: List[tuple] = []  # List of (directory_depth, spec, gitignore_path)
        self._has_pathspec = HAS_PATHSPEC
        self._verbose = verbose

        if self._verbose:
            logger.debug("GitignoreMatcher root: %s", self.root_dir)
            logger.debug("pathspec available: %s", HAS_PATHSPEC)

        if not HAS_PATHSPEC:
            logger.warning("pathspec not installed — gitignore support disabled")
            return

        self._load_gitignore_files()
        if self._verbose:
            logger.debug("Loaded %d .gitignore file(s)", len(self._specs))

    def _load_gitignore_files(self) -> None:
        """Load all .gitignore files from root to leaves."""
        gitignore_files = []

        for gitignore_path in self.root_dir.rglob(".gitignore"):
            try:
                # Calculate directory depth
                rel_dir = gitignore_path.parent.relative_to(self.root_dir)
                depth = len(rel_dir.parts)

                # Read patterns
                with open(gitignore_path, "r", encoding="utf-8") as f:
                    patterns = f.readlines()

                if patterns:
                    spec = pathspec.PathSpec.from_lines("gitwildmatch", patterns)
                    gitignore_files.append((depth, gitignore_path.parent, spec, gitignore_path))
            except Exception:
                # Skip invalid .gitignore files
                continue

        # Sort by depth (root first, then deeper directories)
        gitignore_files.sort(key=lambda x: x[0])
        self._specs = [(depth, parent, spec) for depth, parent, spec, _ in gitignore_files]

    def should_ignore(self, file_path: Path) -> bool:
        """
        Check if file should be ignored based on .gitignore patterns.

        Args:
            file_path: Path to file (absolute or relative)

        Returns:
            True if file should be ignored
        """
        if not self._has_pathspec:
            return False

        if not self._specs:
            return False

        try:
            # Resolve to absolute path
            file_path = file_path.resolve()

            # Check if file is under root
            try:
                rel_path_from_root = file_path.relative_to(self.root_dir)
                rel_path_str = str(rel_path_from_root).replace(os.sep, "/")
            except ValueError:
                return False

            # Find applicable .gitignore files (from root to file's directory)
            file_dir_parts = rel_path_from_root.parent.parts

            for depth, gitignore_dir, spec in self._specs:
                # Check if this .gitignore applies to this file
                # It applies if the file is in the same directory or subdirectory
                if depth <= len(file_dir_parts):
                    try:
                        rel_gitignore_dir = gitignore_dir.relative_to(self.root_dir)

                        # Check if file is under this gitignore's directory
                        if len(rel_gitignore_dir.parts) <= len(file_dir_parts):
                            if file_dir_parts[:len(rel_gitignore_dir.parts)] == rel_gitignore_dir.parts:
                                # This .gitignore applies, check patterns
                                if spec.match_file(rel_path_str):
                                    return True
                    except ValueError:
                        continue

            return False

        except Exception:
            return False

    def filter_files(self, files: List[Path]) -> List[Path]:
        """
        Filter out ignored files.
        Args:
            files: List of file paths
        Returns:
            List of non-ignored files
        """
        return [f for f in files if not self.should_ignore(f)]


def load_gitignore_patterns(root_dir: Path, verbose: bool = False) -> GitignoreMatcher:
    """
    Load .gitignore patterns from directory.
    Args:
        root_dir: Root directory to search
        verbose: Enable verbose logging
    Returns:
        GitignoreMatcher instance
    """
    return GitignoreMatcher(root_dir, verbose=verbose)


def is_gitignored(file_path: Path, root_dir: Optional[Path] = None, verbose: bool = False) -> bool:
    """
    Quick check if a file is gitignored.
    Args:
        file_path: File to check
        root_dir: Root directory (default: file's parent)
        verbose: Enable verbose logging
    Returns:
        True if file is gitignored
    """
    if root_dir is None:
        root_dir = file_path.parent
    matcher = GitignoreMatcher(root_dir, verbose=verbose)
    return matcher.should_ignore(file_path)