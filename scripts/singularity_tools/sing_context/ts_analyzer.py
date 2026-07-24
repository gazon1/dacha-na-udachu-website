"""Tree-sitter analyzer for intelligent code understanding.

Provides AST-based code analysis with graceful fallback to regex.
Automatically detects and uses installed tree-sitter bindings.
"""

import importlib
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple


try:
    from tree_sitter import Language, Parser
    HAS_TREE_SITTER = True
except ImportError:
    HAS_TREE_SITTER = False


@dataclass
class CodeSymbol:
    type: str
    name: str
    start_line: int
    end_line: int
    start_col: int
    end_col: int
    is_public: bool = True
    is_async: bool = False
    docstring: str = ""
    parameters: List[str] = field(default_factory=list)
    return_type: str = ""
    source_text: str = ""


@dataclass
class AnalysisResult:
    symbols: List[CodeSymbol] = field(default_factory=list)
    imports: List[str] = field(default_factory=list)
    classes: List[CodeSymbol] = field(default_factory=list)
    functions: List[CodeSymbol] = field(default_factory=list)
    methods: List[CodeSymbol] = field(default_factory=list)
    constants: List[str] = field(default_factory=list)
    total_lines: int = 0
    code_lines: int = 0
    comment_lines: int = 0
    blank_lines: int = 0


@dataclass
class LanguageConfig:
    """Configuration for a single language."""
    ts_modules: List[str]
    extensions: List[str]

    # Tree-sitter node types
    class_node: str = ""
    function_node: str = ""
    method_node: str = ""
    import_node: str = ""
    constant_node: str = ""
    interface_node: str = ""
    enum_node: str = ""
    struct_node: str = ""
    type_node: str = ""

    # Import extraction
    import_string_child: str = "string_literal"  # Dart: string_literal, TS/JS: string
    import_module_child: str = "dotted_name"    # Python: dotted_name

    # Public symbol check
    private_prefix: str = "_"       # Dart, Python
    export_keyword: str = "export "  # TS/JS
    pub_keyword: str = "pub "       # Rust

    # Constant naming convention (Python: UPPER_CASE)
    constant_pattern: str = ""

    # Comment style
    line_comment: str = "//"
    block_comment_start: str = "/*"
    block_comment_end: str = "*/"
    docstring_markers: Tuple[str, ...] = ()

    # Regex patterns for fallback
    class_regex: str = ""
    func_regex: str = ""
    import_regex: str = ""


# Language configurations — add new languages here
LANGUAGES: Dict[str, LanguageConfig] = {
    "dart": LanguageConfig(
        ts_modules=["tree_sitter_dart", "tree_sitter_dart_orchard"],
        extensions=[".dart"],
        class_node="class_definition",
        function_node="function_signature",
        method_node="method_signature",
        import_node="import_specification",
        constant_node="variable_declaration",
        import_string_child="string_literal",
        private_prefix="_",
    ),

    "python": LanguageConfig(
        ts_modules=["tree_sitter_python"],
        extensions=[".py", ".pyi"],
        class_node="class_definition",
        function_node="function_definition",
        import_node="import_statement",
        constant_node="assignment",
        import_module_child="dotted_name",
        private_prefix="_",
        constant_pattern=r"^[A-Z][A-Z0-9_]*$",
        docstring_markers=('"""', "'''"),
    ),

    "typescript": LanguageConfig(
        ts_modules=["tree_sitter_typescript"],
        extensions=[".ts", ".tsx"],
        class_node="class_declaration",
        function_node="function_declaration",
        import_node="import_statement",
        interface_node="interface_declaration",
        type_node="type_alias_declaration",
        import_string_child="string",
        export_keyword="export ",
    ),

    "javascript": LanguageConfig(
        ts_modules=["tree_sitter_javascript"],
        extensions=[".js", ".jsx", ".mjs"],
        class_node="class_declaration",
        function_node="function_declaration",
        import_node="import_statement",
        import_string_child="string",
        export_keyword="export ",
    ),

    "rust": LanguageConfig(
        ts_modules=["tree_sitter_rust"],
        extensions=[".rs"],
        class_node="struct_item",
        struct_node="struct_item",
        enum_node="enum_item",
        function_node="function_item",
        import_node="use_declaration",
        constant_node="const_item",
        pub_keyword="pub ",
    ),

    "go": LanguageConfig(
        ts_modules=["tree_sitter_go"],
        extensions=[".go"],
        class_node="type_specifier",  # for structs
        function_node="function_declaration",
        import_node="import_declaration",
    ),

    "java": LanguageConfig(
        ts_modules=["tree_sitter_java"],
        extensions=[".java"],
        class_node="class_declaration",
        function_node="method_declaration",
        import_node="import_declaration",
    ),

    "cpp": LanguageConfig(
        ts_modules=["tree_sitter_cpp"],
        extensions=[".cpp", ".cc", ".cxx", ".hpp", ".h", ".hxx"],
        class_node="class_specifier",
        function_node="function_definition",
        method_node="function_declaration",
        import_node="preproc_include",
    ),

    "c": LanguageConfig(
        ts_modules=["tree_sitter_c"],
        extensions=[".c", ".h"],
        class_node="type_specifier",
        function_node="function_definition",
        import_node="preproc_include",
    ),

    "csharp": LanguageConfig(
        ts_modules=["tree_sitter_csharp"],
        extensions=[".cs"],
        class_node="class_declaration",
        function_node="method_declaration",
        import_node="using_directive",
    ),
}


class TreeSitterAnalyzer:
    def __init__(self, language: str):
        self.language = language.lower()
        self._parser: Optional[Parser] = None
        self._ts_language: Optional[Language] = None
        self._available = False
        self._error: Optional[str] = None
        self._module_name: Optional[str] = None
        self._config: Optional[LanguageConfig] = LANGUAGES.get(self.language)

        self._initialize_parser()

    def _initialize_parser(self) -> None:
        if not HAS_TREE_SITTER:
            self._error = "tree-sitter package not installed"
            return

        if not self._config:
            self._error = f"No config for {self.language}"
            return

        for module_name in self._config.ts_modules:
            try:
                ts_module = importlib.import_module(module_name)
                self._parser = Parser()
                self._ts_language = Language(ts_module.language())

                if hasattr(self._parser, 'language'):
                    self._parser.language = self._ts_language
                else:
                    self._parser.set_language(self._ts_language)

                self._available = True
                self._module_name = module_name
                return
            except ImportError:
                continue
            except Exception as e:
                self._error = f"Error loading {module_name}: {e}"
                continue

        self._error = f"No tree-sitter bindings for {self.language}"

    @property
    def available(self) -> bool:
        return self._available

    @property
    def error(self) -> Optional[str]:
        return self._error

    @property
    def backend(self) -> str:
        return "tree-sitter" if self._available else "regex"

    def analyze(self, content: str, file_path: Optional[Path] = None) -> AnalysisResult:
        result = AnalysisResult()

        lines = content.split("\n")
        result.total_lines = len(lines)
        result.blank_lines = sum(1 for line in lines if not line.strip())
        result.comment_lines = self._count_comment_lines(lines)
        result.code_lines = result.total_lines - result.blank_lines - result.comment_lines

        if self._available and self._parser:
            try:
                tree = self._parser.parse(bytes(content, "utf8"))
                self._analyze_tree(tree.root_node, content, result)
            except Exception:
                self._analyze_with_regex(content, result)
        else:
            self._analyze_with_regex(content, result)

        return result

    def _analyze_tree(self, node: Any, source: str, result: AnalysisResult) -> None:
        config = self._config
        if not config:
            return

        def walk(n: Any):
            ntype = n.type

            # Class-like (class, struct, interface, enum, type)
            if ntype in (config.class_node, config.struct_node, config.interface_node,
                         config.enum_node, config.type_node):
                symbol = self._create_symbol_from_node(n, source, _type_from_node(ntype, config))
                if symbol:
                    result.classes.append(symbol)
                    result.symbols.append(symbol)

            # Function
            elif ntype == config.function_node:
                symbol = self._create_symbol_from_node(n, source, "function")
                if symbol:
                    # Method detection
                    if _is_method(n, config):
                        result.methods.append(symbol)
                    else:
                        result.functions.append(symbol)
                    result.symbols.append(symbol)

            # Import
            elif ntype == config.import_node:
                self._extract_import(n, source, result, config)

            # Constant
            elif ntype == config.constant_node:
                self._extract_constant(n, source, result, config)

            for child in n.children:
                walk(child)

        walk(node)

    def _create_symbol_from_node(
        self, node: Any, source: str, symbol_type: str
    ) -> Optional[CodeSymbol]:
        try:
            start_point = node.start_point
            end_point = node.end_point
            source_text = source[node.start_byte:node.end_byte]

            name_node = node.child_by_field_name("name")
            if not name_node:
                for child in node.children:
                    if "identifier" in child.type or "name" in child.type:
                        name_node = child
                        break

            if not name_node:
                return None

            name = source[name_node.start_byte:name_node.end_byte]

            return CodeSymbol(
                type=symbol_type,
                name=name,
                start_line=start_point[0] + 1,
                end_line=end_point[0] + 1,
                start_col=start_point[1],
                end_col=end_point[1],
                is_public=self._is_public_symbol(name, source_text),
                parameters=self._extract_parameters(node, source),
                source_text=source_text,
            )
        except Exception:
            return None

    def _is_public_symbol(self, name: str, source_text: str) -> bool:
        config = self._config
        if not config:
            return True

        if config.private_prefix and name.startswith(config.private_prefix):
            return False
        if config.export_keyword and config.export_keyword in source_text[:50]:
            return True
        if config.pub_keyword and config.pub_keyword in source_text[:50]:
            return True

        # Default: public
        return True

    def _extract_parameters(self, node: Any, source: str) -> List[str]:
        parameters = []
        params_node = None
        for child in node.children:
            if "parameters" in child.type or "parameter_list" in child.type:
                params_node = child
                break

        if not params_node:
            return parameters

        for child in params_node.children:
            if "parameter" in child.type or "identifier" in child.type:
                name_node = child.child_by_field_name("name") or child
                if name_node.type == "identifier":
                    parameters.append(source[name_node.start_byte:name_node.end_byte])

        return parameters

    def _extract_import(self, node: Any, source: str, result: AnalysisResult, config: LanguageConfig) -> None:
        if config.import_string_child:
            for child in node.children:
                if child.type == config.import_string_child:
                    path = source[child.start_byte:child.end_byte].strip('"\'')
                    result.imports.append(path)
                    return

        if config.import_module_child:
            for child in node.children:
                if child.type == config.import_module_child:
                    result.imports.append(source[child.start_byte:child.end_byte])
                    return

    def _extract_constant(self, node: Any, source: str, result: AnalysisResult, config: LanguageConfig) -> None:
        name_node = node.child_by_field_name("name") or node.child_by_field_name("left")
        if not name_node and node.children:
            for child in node.children:
                if child.type == "identifier":
                    name_node = child
                    break

        if not name_node:
            return

        name = source[name_node.start_byte:name_node.end_byte]

        if config.constant_pattern:
            if re.match(config.constant_pattern, name):
                result.constants.append(name)
        elif config.pub_keyword:
            # Rust style: const/static at top level
            if node.parent and node.parent.type in ("source_file", "compilation_unit"):
                result.constants.append(name)
        elif config.private_prefix:
            # Python style: UPPER_CASE
            if name.isupper():
                result.constants.append(name)

    def _count_comment_lines(self, lines: List[str]) -> int:
        config = self._config
        if not config:
            return 0

        count = 0
        in_block = False

        for line in lines:
            stripped = line.strip()

            if in_block:
                count += 1
                if config.block_comment_end in stripped:
                    in_block = False
            elif stripped.startswith(config.line_comment):
                count += 1
            elif stripped.startswith(config.block_comment_start):
                count += 1
                if config.block_comment_end not in stripped:
                    in_block = True

        if config.docstring_markers:
            in_docstring = False
            for line in lines:
                stripped = line.strip()
                if stripped.startswith(config.docstring_markers[0]):
                    count += 1
                    if stripped.count(config.docstring_markers[0]) == 2:
                        pass  # single-line docstring
                    else:
                        in_docstring = True
                elif in_docstring:
                    count += 1
                    if config.docstring_markers[0] in stripped:
                        in_docstring = False

        return count

    def _analyze_with_regex(self, content: str, result: AnalysisResult) -> None:
        config = self._config
        if not config:
            return

        lines = content.split("\n")
        class_re = re.compile(config.class_regex) if config.class_regex else None
        func_re = re.compile(config.func_regex) if config.func_regex else None
        import_re = re.compile(config.import_regex) if config.import_regex else None

        for i, line in enumerate(lines, 1):
            if class_re:
                m = class_re.search(line)
                if m:
                    result.symbols.append(CodeSymbol(
                        type="class", name=m.group(1), start_line=i, end_line=i,
                        start_col=m.start(), end_col=m.end(),
                        is_public=self._is_public_symbol(m.group(1), line),
                    ))

            if func_re:
                m = func_re.search(line)
                if m:
                    result.symbols.append(CodeSymbol(
                        type="function", name=m.group(1), start_line=i, end_line=i,
                        start_col=m.start(), end_col=m.end(),
                        is_public=self._is_public_symbol(m.group(1), line),
                        is_async="async" in line,
                    ))

            if import_re:
                m = import_re.search(line)
                if m:
                    result.imports.append(m.group(1))


def _type_from_node(ntype: str, config: LanguageConfig) -> str:
    """Map node type to symbol type."""
    if ntype == config.struct_node:
        return "struct"
    if ntype == config.enum_node:
        return "enum"
    if ntype == config.interface_node:
        return "interface"
    if ntype == config.type_node:
        return "type"
    return "class"


def _is_method(node: Any, config: LanguageConfig) -> bool:
    """Check if function node is a method (inside class)."""
    parent = node.parent
    while parent:
        if parent.type in (config.class_node, config.struct_node, config.interface_node):
            return True
        parent = parent.parent
    return False


def analyze_file(file_path: Path, language: str) -> Optional[AnalysisResult]:
    try:
        content = file_path.read_text(encoding="utf-8")
        return TreeSitterAnalyzer(language).analyze(content, file_path)
    except Exception:
        return None


def detect_language(file_path: Path) -> Optional[str]:
    ext = file_path.suffix.lower()
    for lang, config in LANGUAGES.items():
        if ext in config.extensions:
            return lang
    return None


def get_status() -> Dict[str, Any]:
    status = {"has_tree_sitter": HAS_TREE_SITTER, "languages": {}}
    for lang in LANGUAGES:
        analyzer = TreeSitterAnalyzer(lang)
        status["languages"][lang] = {
            "available": analyzer.available,
            "backend": analyzer.backend,
            "error": analyzer.error,
            "module": analyzer._module_name,
        }
    return status