"""Context extraction logic for sing_context.

Uses tree-sitter for intelligent code analysis when available.
Respects .gitignore files for file filtering.
"""

import re
import subprocess
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

from .config import LanguageConfig
from .ts_analyzer import TreeSitterAnalyzer, AnalysisResult
from .gitignore import GitignoreMatcher
from .language_registry import get_language_config


def get_git_info(search_dir: Path) -> Dict[str, str]:
    """Get git branch and last commit info."""
    info = {"branch": "", "commit": "", "commit_date": ""}

    try:
        # Get branch
        result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=search_dir,
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            info["branch"] = result.stdout.strip()
    except Exception:
        pass

    try:
        # Get last commit hash and date
        result = subprocess.run(
            ["git", "log", "-1", "--format=%H %ai", "--no-merges"],
            cwd=search_dir,
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            parts = result.stdout.strip().split(" ", 1)
            if len(parts) >= 2:
                info["commit"] = parts[0][:12]
                info["commit_date"] = parts[1]
    except Exception:
        pass

    return info


def find_project_config(search_dir: Path) -> Optional[Path]:
    """Find project config files like pyproject.toml, package.json, etc."""
    config_files = ["pyproject.toml", "setup.py", "setup.cfg", "requirements.txt",
                    "package.json", "Cargo.toml", "go.mod"]
    for cfg in config_files:
        p = search_dir / cfg
        if p.exists():
            return p
    return None


# Secret patterns for scanning (analogous to gitleaks)
SECRET_PATTERNS = [
    (r"api[_-]?key\s*=\s*['\"][^'\"]{8,}['\"]", "API_KEY"),
    (r"apikey\s*=\s*['\"][^'\"]{8,}['\"]", "API_KEY"),
    (r"secret[_-]?key\s*=\s*['\"][^'\"]{8,}['\"]", "SECRET_KEY"),
    (r"password\s*=\s*['\"][^'\"]{8,}['\"]", "PASSWORD"),
    (r"passwd\s*=\s*['\"][^'\"]{8,}['\"]", "PASSWORD"),
    (r"token\s*=\s*['\"][^'\"]{8,}['\"]", "TOKEN"),
    (r"access[_-]?token\s*=\s*['\"][^'\"]{8,}['\"]", "ACCESS_TOKEN"),
    (r"private[_-]?key\s*=\s*['\"][^'\"]{8,}['\"]", "PRIVATE_KEY"),
    (r"aws[_-]?access[_-]?key\s*=\s*['\"][^'\"]{8,}['\"]", "AWS_KEY"),
    (r"aws[_-]?secret\s*=\s*['\"][^'\"]{8,}['\"]", "AWS_SECRET"),
]


def scan_secrets(content: str) -> List[Tuple[str, str]]:
    """Scan content for secret patterns. Returns list of (pattern_type, line_preview)."""
    found = []
    for pattern, secret_type in SECRET_PATTERNS:
        try:
            for match in re.finditer(pattern, content, re.IGNORECASE):
                start = max(0, match.start() - 20)
                end = min(len(content), match.end() + 20)
                preview = content[start:end].replace("\n", " ")
                found.append((secret_type, preview))
        except re.error:
            continue
    return found


def generate_system_prompt(search_dir: Path, lang_config, git_info: Dict[str, str], file_count: int) -> str:
    """Generate project summary for LLM."""
    lines = []

    # Project name from directory
    name = search_dir.name if search_dir.name else search_dir.parent.name
    lines.append(f"# Project: {name}")
    lines.append("")

    # Git info
    if git_info.get("branch"):
        lines.append(f"## Git Branch: {git_info['branch']}")
        if git_info.get("commit"):
            lines.append(f"## Last Commit: {git_info['commit']} ({git_info.get('commit_date', '')})")
    lines.append("")

    # Language and tech
    if lang_config:
        lines.append(f"## Language: {lang_config.name}")
    lines.append(f"## Files: {file_count}")
    lines.append("")

    # Config file
    config_file = find_project_config(search_dir)
    if config_file:
        lines.append(f"## Config: {config_file.name}")

    # Subdirectories for structure
    try:
        subdirs = [d.name for d in search_dir.iterdir() if d.is_dir() and not d.name.startswith('.')]
        if subdirs:
            lines.append(f"## Structure: {' / '.join(sorted(subdirs))}")
    except Exception:
        pass

    lines.append("")
    lines.append("## Architecture Notes")
    lines.append("(Edit this section to describe your project architecture)")

    return "\n".join(lines)


@dataclass
class ExtractionResult:
    """Result of context extraction."""

    files: List[Tuple[Path, str]] = field(default_factory=list)
    total_lines: int = 0
    total_files: int = 0
    import_graph: Dict[str, List[str]] = field(default_factory=dict)
    analysis_results: Dict[str, AnalysisResult] = field(default_factory=dict)
    tree_sitter_available: bool = False


def classify_file_importance(file_path: Path, lang_config: LanguageConfig) -> str:
    """
    Classify file importance tier for LLM context using language-specific config.

    Returns:
        - "critical": Entry points (main, cli, __init__) - always full content
        - "high": Configs, interfaces, important modules
        - "medium": Regular source files
        - "low": Tests, generated, vendor files
    """
    name = file_path.name.lower()
    path_str = str(file_path).lower()

    # Critical: entry points from language config
    if name in lang_config.entry_point_names:
        return "critical"

    # High: configs from language config
    if name in lang_config.config_names:
        return "high"

    # Also check always_include_full list
    if name in lang_config.always_include_full:
        return "high"

    # Low: tests, generated, vendor from language config
    for pattern in lang_config.test_patterns:
        if pattern.endswith("/"):
            if pattern[:-1] in path_str:
                return "low"
        elif pattern.endswith("*"):
            prefix = pattern[:-1]
            if name.startswith(prefix) or name.endswith(prefix):
                return "low"
        else:
            if pattern in name or pattern in path_str:
                return "low"

    # Low: common vendor/generated patterns
    if ("_generated" in name or "vendor" in path_str or
        "__pycache__" in path_str or ".venv" in path_str or
        "node_modules" in path_str or "build/" in path_str or
        ".pub-cache" in path_str or ".dart_tool" in path_str):
        return "low"

    return "medium"


def extract_imports(content: str, lang_config: LanguageConfig) -> List[str]:
    """Extract import statements from code using language-specific pattern."""
    imports = []

    pattern = lang_config.import_pattern
    if not pattern:
        return imports

    try:
        for match in re.finditer(pattern, content, re.MULTILINE):
            imp = match.group(1).strip()
            if imp:
                imports.append(imp)
    except re.error:
        pass

    return imports


def compress_code(content: str, aggressive: bool = False) -> str:
    """Compress code by removing comments and extra whitespace."""
    lines = content.split("\n")
    compressed = []
    prev_empty = False

    for line in lines:
        stripped = line.strip()

        # Skip empty lines (but keep one)
        if not stripped:
            if not prev_empty:
                compressed.append("")
                prev_empty = True
            continue
        prev_empty = False

        # Skip comments in aggressive mode
        if aggressive:
            if stripped.startswith("//") or stripped.startswith("#") or stripped.startswith("/*"):
                continue
            # Remove inline // comments only (safe - no string parsing needed)
            if "//" in stripped and not stripped.startswith("//"):
                stripped = stripped.split("//")[0].strip()

        compressed.append(stripped)

    return "\n".join(compressed)


def should_ignore(
    file_path: Path,
    search_dir: Path,
    ignore_patterns: List[str],
) -> bool:
    """Check if path should be ignored based on patterns."""
    try:
        rel_path = file_path.relative_to(search_dir).as_posix()
    except ValueError:
        rel_path = str(file_path)

    filename = file_path.name

    for pattern in ignore_patterns:
        # Directory pattern
        if pattern.endswith("/"):
            dir_name = pattern[:-1]
            if dir_name in rel_path:
                return True
        # Glob pattern
        elif pattern.startswith("*"):
            suffix = pattern[1:]
            if filename.endswith(suffix):
                return True
        elif pattern.endswith("*"):
            prefix = pattern[:-1]
            if filename.startswith(prefix):
                return True
        # Exact match or contains
        else:
            if pattern in rel_path or pattern == filename:
                return True

    return False


def is_always_include_full(file_path: Path, always_include: List[str]) -> bool:
    """Check if file should always be included in full."""
    return file_path.name in always_include


def write_tree(
    out_file,
    root: Path,
    files: List[Path],
    max_depth: int = 4,
) -> None:
    """Write directory tree structure."""
    tree: Dict[str, dict] = {}

    for file_path in files:
        try:
            rel_path = file_path.relative_to(root)
            parts = rel_path.parts

            if len(parts) > max_depth:
                parts = parts[: max_depth - 1] + (
                    "/".join(parts[max_depth - 1:]),
                )

            current = tree
            for i, part in enumerate(parts):
                if i == len(parts) - 1:
                    current[part] = None
                else:
                    if part not in current:
                        current[part] = {}
                    current = current[part]
        except ValueError:
            continue

    def write_node(node: dict, prefix: str = "") -> None:
        items = sorted(node.items())
        for i, (name, children) in enumerate(items):
            is_last = i == len(items) - 1
            connector = "└── " if is_last else "├── "
            out_file.write(f"// {prefix}{connector}{name}\n")
            if children is not None:
                new_prefix = prefix + ("    " if is_last else "│   ")
                write_node(children, new_prefix)

    write_node(tree)


def prioritize_files(
    files: List[Path],
    import_graph: Dict[str, List[str]],
    focus_keywords: Optional[str] = None,
    entry_point: Optional[Path] = None,
) -> List[Path]:
    """
    Prioritize files based on focus keywords or entry point.

    Uses import graph for BFS-style traversal from entry point.
    """
    if not files:
        return files

    # Create filename -> Path mapping
    file_map = {f.name.lower(): f for f in files}

    # Calculate relevance scores
    scores: Dict[Path, float] = {f: 0.0 for f in files}

    # Keyword-based scoring
    if focus_keywords:
        keywords = [k.strip().lower() for k in focus_keywords.split(",") if k.strip()]
        for f in files:
            name_lower = f.name.lower()
            path_lower = str(f).lower()
            for kw in keywords:
                if kw in name_lower or kw in path_lower:
                    scores[f] += 10.0

    # Entry point scoring via import graph (BFS)
    if entry_point:
        entry_name = entry_point.name.lower()
        entry_key = str(entry_point.resolve())

        # Find files that import the entry point
        directly_related = []
        for file_path, imports in import_graph.items():
            for imp in imports:
                if entry_name in imp.lower() or entry_point.name in imp:
                    directly_related.append(file_path)

        # BFS through import graph
        visited = {entry_point.resolve()}
        queue = list(directly_related)
        distance = 1
        max_distance = 5

        while queue and distance <= max_distance:
            next_queue = []
            for rel_path_str in queue:
                for f in files:
                    if f.resolve() not in visited:
                        file_imports = import_graph.get(str(f), [])
                        for imp in file_imports:
                            if rel_path_str.lower() in imp.lower():
                                scores[f] += max(0, 10 - distance * 2)
                                visited.add(f.resolve())
                                next_queue.append(str(f))
            queue = next_queue
            distance += 1

        # Entry point itself gets highest score
        for f in files:
            if f.name.lower() == entry_name:
                scores[f] += 100

    # Sort by score (descending), then by name
    return sorted(files, key=lambda f: (-scores[f], f.name))


def extract_context(
    search_dirs: List[Path],
    lang_config: Union[LanguageConfig, List[LanguageConfig]],
    output: Path,
    agent_md: Optional[Path] = None,
    contextignore_path: Optional[Path] = None,
    api_only: bool = False,
    aggressive: bool = False,
    verbose: bool = False,
    focus_keywords: Optional[str] = None,
    entry_point: Optional[Path] = None,
    ignore_dirs: Optional[str] = None,
) -> ExtractionResult:
    """
    Extract code context from directories/files.

    Args:
        search_dirs: Directories or files to extract context from
        lang_config: Language configuration (single or multiple)
        output: Output file path
        agent_md: Optional path to AGENT.md file
        contextignore_path: Optional path to .contextignore file
        api_only: Extract only public API
        aggressive: Aggressive compression
        verbose: Verbose output

    Returns:
        ExtractionResult with extracted files and metadata
    """
    import click

    # Normalize lang_config to list
    if isinstance(lang_config, LanguageConfig):
        lang_configs = [lang_config]
    else:
        lang_configs = lang_config

    result = ExtractionResult()

    # Validate paths
    for search_dir in search_dirs:
        if not search_dir.exists():
            print(f"❌ Path not found: {search_dir}", file=sys.stderr)
            sys.exit(1)

    # Collect all extensions from all language configs
    all_extensions: Set[str] = set()
    for cfg in lang_configs:
        all_extensions.update(cfg.extensions)

    # Collect all files from all paths
    files_found: List[Path] = []
    for search_dir in search_dirs:
        if search_dir.is_file():
            files_found.append(search_dir)
        else:
            for ext in all_extensions:
                files_found.extend(search_dir.rglob(f"*{ext}"))

    # Deduplicate and filter
    files_found = list(set(files_found))

    # Use first directory as root for gitignore, if any
    gitignore_root = search_dirs[0] if search_dirs[0].is_dir() else search_dirs[0].parent

    # Initialize gitignore matcher
    gitignore_matcher = GitignoreMatcher(gitignore_root)

    # Initialize contextignore matcher if file exists
    contextignore_count = 0
    if contextignore_path is None:
        # Auto-detect .contextignore in first search path
        for search_dir in search_dirs:
            if search_dir.is_dir():
                auto_path = search_dir / ".contextignore"
                if auto_path.exists():
                    contextignore_path = auto_path
                    break

    contextignore_matcher = None
    if contextignore_path and contextignore_path.exists():
        contextignore_matcher = GitignoreMatcher(contextignore_path.parent)

    # Filter ignored files (all language patterns combined)
    all_ignore_patterns: List[str] = []
    for cfg in lang_configs:
        all_ignore_patterns.extend(cfg.ignore_patterns)

    files_filtered = []
    for f in files_found:
        ignored = False
        for search_dir in search_dirs:
            if search_dir.is_dir() and should_ignore(f, search_dir, all_ignore_patterns):
                ignored = True
                break
        if not ignored:
            files_filtered.append(f)

    # Filter gitignored files
    respect_gitignore = any(cfg.respect_gitignore for cfg in lang_configs)
    if respect_gitignore:
        files_before_gitignore = len(files_filtered)
        files_filtered = gitignore_matcher.filter_files(files_filtered)
        gitignored_count = files_before_gitignore - len(files_filtered)
    else:
        gitignored_count = 0

    # Filter contextignored files
    if contextignore_matcher:
        files_before_contextignore = len(files_filtered)
        files_filtered = contextignore_matcher.filter_files(files_filtered)
        contextignore_count = files_before_contextignore - len(files_filtered)

    # Filter by --ignore-dirs CLI option
    ignore_dirs_count = 0
    if ignore_dirs:
        ignore_dir_list = [d.strip() for d in ignore_dirs.split(",") if d.strip()]
        if ignore_dir_list:
            files_before_ignore_dirs = len(files_filtered)
            files_filtered = [
                f for f in files_filtered
                if not any(
                    d in Path(f).parts
                    for d in ignore_dir_list
                )
            ]
            ignore_dirs_count = files_before_ignore_dirs - len(files_filtered)

    if verbose:
        print(
            f"📁 Found {len(files_found)} files, "
            f"{len(files_filtered)} after filtering"
        )
        if gitignored_count > 0:
            print(f"   🚫 Gitignored: {gitignored_count} files")
        if contextignore_count > 0:
            print(f"   🚫 Contextignored: {contextignore_count} files")

    # Process files
    with open(output, "w", encoding="utf-8") as out_file:
        # Get git info and project config for metadata
        tree_root = search_dirs[0] if search_dirs[0].is_dir() else search_dirs[0].parent
        git_info = get_git_info(tree_root)
        config_file = find_project_config(tree_root)

        # Write YAML frontmatter
        out_file.write("---\n")
        out_file.write("llm_context_version: 1.0\n")
        out_file.write(
            f"generated_at: {datetime.now().isoformat()}\n"
        )
        roots = [str(d.resolve()) for d in search_dirs]
        out_file.write(f"source_roots: {roots}\n")
        if git_info["branch"]:
            out_file.write(f"git_branch: {git_info['branch']}\n")
        if git_info["commit"]:
            out_file.write(f"git_commit: {git_info['commit']}\n")
        if git_info["commit_date"]:
            out_file.write(f"git_commit_date: {git_info['commit_date']}\n")
        if config_file:
            out_file.write(f"project_config: {config_file.name}\n")
        out_file.write(f"total_files: {len(files_filtered)}\n")

        # Handle multiple languages in frontmatter
        if len(lang_configs) == 1:
            out_file.write(f"language: {lang_configs[0].name}\n")
            out_file.write(f"extensions: {', '.join(lang_configs[0].extensions)}\n")
            out_file.write(f"gitignore_respected: {lang_configs[0].respect_gitignore}\n")
        else:
            lang_names = ", ".join(c.name for c in lang_configs)
            out_file.write(f"language: {lang_names}\n")
            all_exts = set()
            for cfg in lang_configs:
                all_exts.update(cfg.extensions)
            out_file.write(f"extensions: {', '.join(sorted(all_exts))}\n")
            out_file.write(f"gitignore_respected: {respect_gitignore}\n")

        out_file.write(f"gitignored_files: {gitignored_count}\n")
        if contextignore_count > 0:
            out_file.write(f"contextignored_files: {contextignore_count}\n")
        out_file.write("---\n\n")

        # Write Agent.md if provided
        if agent_md and agent_md.exists():
            out_file.write("---\n// AGENT.md\n---\n")
            with open(agent_md, "r", encoding="utf-8") as agent_file:
                for line in agent_file:
                    safe_line = line.replace("//", "||")
                    out_file.write(f"// {safe_line}")
            out_file.write("\n")

        # Write auto-generated system prompt (use first lang config for system info)
        system_prompt = generate_system_prompt(tree_root, lang_configs[0] if lang_configs else None, git_info, len(files_filtered))
        out_file.write("---\n// PROJECT SUMMARY\n---\n")
        out_file.write(system_prompt)
        out_file.write("\n---\n\n")

        # Write structure map
        out_file.write("---\n// PROJECT STRUCTURE\n// ---\n")
        # Use first root for tree structure
        write_tree(out_file, tree_root, files_filtered, max_depth=4)
        out_file.write("// ---\n\n")

        # Initialize tree-sitter analyzer (use first config's key for backend selection)
        primary_lang_key = lang_configs[0].key if lang_configs else "default"
        analyzer = TreeSitterAnalyzer(primary_lang_key)
        result.tree_sitter_available = analyzer.available

        if verbose:
            if analyzer.available:
                print(f"  🌳 Tree-sitter available: {analyzer.backend} ({analyzer._module_name})")
            else:
                print(f"  ⚠️  Tree-sitter not available, using regex fallback")

        # Write file contents with progress bar
        sorted_files = sorted(files_filtered)

        # Apply focus/entry-point prioritization
        if focus_keywords or entry_point:
            sorted_files = prioritize_files(
                sorted_files, result.import_graph,
                focus_keywords=focus_keywords,
                entry_point=entry_point
            )
            if verbose:
                focus_info = []
                if focus_keywords:
                    focus_info.append(f"keywords: {focus_keywords}")
                if entry_point:
                    focus_info.append(f"entry-point: {entry_point.name}")
                print(f"  🎯 Focus applied ({', '.join(focus_info)})")

        with click.progressbar(
            sorted_files,
            label="📄 Processing files",
            show_pos=True,
            show_eta=verbose,
            length=len(sorted_files),
            file=sys.stderr if not verbose else None,
        ) as progress_files:
            for idx, file_path in enumerate(progress_files, 1):
                try:
                    # Find which search_dir this file belongs to
                    rel_path = None
                    for search_dir in search_dirs:
                        try:
                            if search_dir.is_dir():
                                rel_path = file_path.relative_to(search_dir)
                                break
                            elif file_path == search_dir:
                                rel_path = Path(file_path.name)
                                break
                        except ValueError:
                            continue

                    if rel_path is None:
                        rel_path = Path(file_path.name)

                    content = file_path.read_text(encoding="utf-8")

                    # Scan for secrets
                    secrets_found = scan_secrets(content)
                    if secrets_found and verbose:
                        for secret_type, preview in secrets_found:
                            print(f"  ⚠️  Secret detected in {rel_path}: {secret_type}")

                    # Analyze with tree-sitter
                    analysis = analyzer.analyze(content, file_path)
                    result.analysis_results[str(rel_path)] = analysis

                    # Find which language config matches this file
                    file_lang_config = lang_configs[0]
                    for cfg in lang_configs:
                        if cfg.matches_file(file_path):
                            file_lang_config = cfg
                            break

                    # Use tree-sitter imports if available
                    if analysis.imports:
                        result.import_graph[str(rel_path)] = analysis.imports
                    else:
                        # Fallback to regex
                        imports = extract_imports(content, file_lang_config)
                        if imports:
                            result.import_graph[str(rel_path)] = imports

                    # Classify file importance
                    importance = classify_file_importance(file_path, file_lang_config)

                    # Compress if requested, but not for always-include-full files
                    should_compress = (api_only or aggressive) and not file_lang_config.should_include_full(file_path.name)
                    if should_compress:
                        content = compress_code(content, aggressive=aggressive)

                    lines = content.count("\n") + 1
                    result.total_lines += lines
                    result.total_files += 1
                    result.files.append((rel_path, content))

                    # Write file header with analysis info
                    out_file.write(f"## file: {rel_path} [{idx}/{len(sorted_files)}]\n")
                    out_file.write(f"path: {file_path.resolve()}\n")
                    out_file.write(f"importance: {importance}\n")

                    # Add symbol information if available
                    if analysis.symbols:
                        public_symbols = [s for s in analysis.symbols if s.is_public]
                        if public_symbols:
                            out_file.write(f"symbols: {len(public_symbols)} public, "
                                          f"{len(analysis.classes)} classes, "
                                          f"{len(analysis.functions)} functions\n")

                    out_file.write("\n```" + file_lang_config.name.lower() + "\n")

                    # Write content
                    out_file.write(content)
                    out_file.write("\n```\n\n")

                    # Write file end marker with stats
                    out_file.write(f"// END: {rel_path} ({lines} lines")
                    if analysis.code_lines:
                        out_file.write(f", {analysis.code_lines} code, "
                                      f"{analysis.comment_lines} comments")
                    out_file.write(")\n---\n\n")

                except Exception as e:
                    if verbose:
                        print(
                            f"  ⚠️  Error reading {file_path}: {e}",
                            file=sys.stderr,
                        )
                    continue

        # Write import graph
        if result.import_graph:
            out_file.write("---\n// IMPORT DEPENDENCY GRAPH\n// ---\n")
            for file_path, imports in sorted(result.import_graph.items()):
                out_file.write(f"// [{file_path}] -> {len(imports)} imports\n")
                for imp in imports:
                    out_file.write(f"//   - {imp}\n")
            out_file.write("// ---\n\n")

        # Write code analysis summary
        if result.analysis_results:
            total_symbols = sum(
                len(a.symbols) for a in result.analysis_results.values()
            )
            total_classes = sum(
                len(a.classes) for a in result.analysis_results.values()
            )
            total_functions = sum(
                len(a.functions) for a in result.analysis_results.values()
            )
            total_imports = sum(
                len(a.imports) for a in result.analysis_results.values()
            )

            out_file.write("---\n// CODE ANALYSIS\n// ---\n")
            out_file.write(f"// Analysis backend: {'tree-sitter' if result.tree_sitter_available else 'regex'}\n")
            out_file.write(f"// Total symbols: {total_symbols}\n")
            out_file.write(f"// Classes/Structs: {total_classes}\n")
            out_file.write(f"// Functions: {total_functions}\n")
            out_file.write(f"// Import statements: {total_imports}\n")
            out_file.write("// ---\n\n")

        # Write summary
        out_file.write("---\n// EXTRACTION SUMMARY\n// ---\n")
        out_file.write(f"// Total files: {result.total_files}\n")
        out_file.write(f"// Total lines: {result.total_lines}\n")
        if len(lang_configs) == 1:
            out_file.write(f"// Language: {lang_configs[0].name}\n")
            out_file.write(f"// Extensions: {', '.join(lang_configs[0].extensions)}\n")
        else:
            out_file.write(f"// Languages: {', '.join(c.name for c in lang_configs)}\n")
            all_exts = set()
            for cfg in lang_configs:
                all_exts.update(cfg.extensions)
            out_file.write(f"// Extensions: {', '.join(sorted(all_exts))}\n")
        out_file.write(f"// Tree-sitter: {'available' if result.tree_sitter_available else 'not available (regex fallback)'}\n")
        out_file.write(f"// Gitignore: {'respected' if respect_gitignore else 'ignored'} ({gitignored_count} files ignored)\n")
        out_file.write("// ---\n")

    return result