"""Documentation parsing logic with progress tracking and sitemap support."""

import re
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
from urllib.parse import urldefrag, urljoin, urlparse
import xml.etree.ElementTree as ET

import click
from bs4 import BeautifulSoup, Comment, Tag
from curl_cffi import requests as curl_requests
from markdownify import markdownify as md  # Well-maintained HTML→Markdown [[41]]
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type  # Retry logic [[47]]
from usp.tree import sitemap_tree_for_homepage

@dataclass
class ScrapedPage:
    """Represents a single scraped documentation page."""

    url: str
    title: str
    content: str
    metadata: Dict[str, str] = field(default_factory=dict)
    word_count: int = 0
    scraped_at: str = ""
    _raw_html: str = field(default="", repr=False)

    def to_markdown(self, include_url: bool = True) -> str:
        """Convert page to markdown format for LLM."""
        parts = []

        if include_url:
            parts.append(f"<!-- Source: {self.url} -->")

        if self.metadata and self.metadata.get("description"):
            parts.append(f"> {self.metadata['description']}\n")

        parts.append(f"# {self.title}\n")
        parts.append(self.content)

        return "\n\n".join(parts)


class SitemapParser:
    """Parses sitemap.xml files using ultimate-sitemap-parser (usp) [[10]]."""

    SITEMAP_NAMES = [
        "sitemap.xml",
        "sitemap_index.xml",
        "sitemap-docs.xml",
        "docs-sitemap.xml",
    ]

    def __init__(self, base_url: str, config):
        self.base_url = base_url
        self.config = config
        self._urls: List[str] = []
        self._parsed = False

    def discover_and_parse(self) -> List[str]:
        """Try to find and parse sitemap using usp, return list of URLs."""
        if self._parsed:
            return self._urls

        try:
            # usp автоматически ищет sitemap по robots.txt и стандартным путям [[10]]
            tree = sitemap_tree_for_homepage(self.base_url)
            
            for page in tree.all_pages():
                url = page.url
                if self._should_include_url(url):
                    self._urls.append(url)

        except Exception as e:
            if self.config.verbose:
                print(f"⚠️  Sitemap parsing failed: {e}")
            # Fallback: try manual discovery of common sitemap locations
            self._fallback_discovery()

        self._parsed = True
        return self._urls

    def _fallback_discovery(self):
        """Fallback: manually try common sitemap locations if usp fails."""

        
        for sitemap_name in self.SITEMAP_NAMES:
            sitemap_url = urljoin(self.base_url, sitemap_name)
            if self._try_parse_sitemap_manual(sitemap_url):
                break

    def _try_parse_sitemap_manual(self, sitemap_url: str) -> bool:
        """Manual fallback sitemap parser using requests + ElementTree."""
        try:
            response = curl_requests.get(
                sitemap_url,
                timeout=10,
                headers={"User-Agent": self.config.user_agent},
                impersonate="chrome120"
            )
            if response.status_code != 200:
                return False

            content_type = response.headers.get("Content-Type", "")
            if "xml" not in content_type and "text" not in content_type:
                return False

            root = ET.fromstring(response.content)
            
            # Handle sitemap index
            if "sitemapindex" in root.tag.lower():
                ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
                for sitemap in root.findall(".//sm:sitemap", ns):
                    loc = sitemap.find("sm:loc", ns)
                    if loc is not None and loc.text:
                        self._try_parse_sitemap_manual(loc.text)
                return True

            # Handle regular sitemap
            ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
            for url_elem in root.findall(".//sm:url", ns):
                loc = url_elem.find("sm:loc", ns)
                if loc is not None and loc.text:
                    url = loc.text.strip()
                    if self._should_include_url(url):
                        self._urls.append(url)

            return len(self._urls) > 0

        except Exception:
            return False

    def _should_include_url(self, url: str) -> bool:
        """Check if URL should be included based on config."""
        from urllib.parse import urlparse
        parsed = urlparse(url)
        
        if self.config.allowed_domains:
            if parsed.netloc not in self.config.allowed_domains:
                return False
        elif parsed.netloc != urlparse(self.base_url).netloc:
            return False

        if self.config.allowed_path_prefixes:
            if not any(parsed.path.startswith(p) for p in self.config.allowed_path_prefixes):
                return False

        for pattern in self.config.exclude_patterns:
            if re.search(pattern, url):
                return False

        return True

    def get_urls(self) -> List[str]:
        """Return discovered URLs from sitemap."""
        return self._urls.copy()


class LinkResolver:
    """Handles URL resolution and filtering with path prefix support."""

    REMOVE_SELECTORS = [
        "nav", "header", "footer", "aside", "script", "style",
        '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
        ".nav", ".navbar", ".sidebar", ".toc", ".table-of-contents",
        "#nav", "#sidebar", "#toc", ".cookie-banner", ".ads",
        ".social-share", ".edit-on-github", ".last-updated",
    ]

    CONTENT_SELECTORS = [
        "article", "main", '[role="main"]', ".content", ".docs-content",
        ".markdown-body", ".prose", "#content", "#main-content",
    ]

    def __init__(self, base_url: str, config):
        parsed = urlparse(base_url)
        path = parsed.path.rstrip("/") or "/"
        self.base_url = f"{parsed.scheme}://{parsed.netloc}{path}"
        self.base_domain = parsed.netloc
        self.base_path = path
        self.config = config
        self._seen: Set[str] = set()

        self._robots = None
        if config.respect_robots_txt:
            from urllib.robotparser import RobotFileParser
            self._robots = RobotFileParser()
            robots_url = urljoin(base_url, "/robots.txt")
            try:
                self._robots.set_url(robots_url)
                self._robots.read()
            except Exception:
                pass

    def is_allowed(self, url: str) -> bool:
        """Check if URL is allowed by config, robots.txt, and path prefix."""
        parsed = urlparse(url)

        # Domain filtering
        if self.config.allowed_domains:
            if parsed.netloc not in self.config.allowed_domains:
                return False
        elif parsed.netloc != self.base_domain:
            return False

        # Path prefix filtering - ГЛАВНОЕ: все страницы должны начинаться с указанного пути
        if self.config.allowed_path_prefixes:
            if not any(parsed.path.startswith(p) for p in self.config.allowed_path_prefixes):
                return False
        else:
            # По умолчанию: ограничиваем текущим путём базового URL
            if not parsed.path.startswith(self.base_path):
                return False

        # Exclude patterns
        for pattern in self.config.exclude_patterns:
            if re.search(pattern, url):
                return False

        # robots.txt check
        if self.config.respect_robots_txt and self._robots:
            if not self._robots.can_fetch(self.config.user_agent, url):
                return False

        return True

    def normalize_url(self, url: str, current_url: str) -> Optional[str]:
        """Normalize and resolve URL, return None if should skip."""
        absolute = urljoin(current_url, url)
        absolute, _ = urldefrag(absolute)
        absolute = absolute.rstrip("/")

        if absolute in self._seen:
            return None

        if not self.is_allowed(absolute):
            return None

        self._seen.add(absolute)
        return absolute

    def extract_links(self, html: str, current_url: str) -> List[str]:
        """Extract all internal links from HTML."""
        soup = BeautifulSoup(html, "html.parser")
        links = []

        for tag in soup.find_all("a", href=True):
            href = tag["href"]

            if href.startswith(("#", "mailto:", "tel:", "javascript:")):
                continue

            normalized = self.normalize_url(href, current_url)
            if normalized:
                links.append(normalized)

        return links


class ContentExtractor:
    """Extracts clean content from HTML using markdownify [[41]]."""

    REMOVE_SELECTORS = [
        "nav", "header", "footer", "aside", "script", "style",
        '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
        ".nav", ".navbar", ".sidebar", ".toc", ".table-of-contents",
    ]

    CONTENT_SELECTORS = [
        "article", "main", '[role="main"]', ".content", ".docs-content",
        ".markdown-body", ".prose", "#content", "#main-content",
    ]

    def __init__(self, config):
        self.config = config

    def extract(self, html: str, url: str) -> Tuple[str, str, Dict[str, str]]:
        soup = BeautifulSoup(html, "html.parser")

        # Remove unwanted elements
        for selector in self.REMOVE_SELECTORS:
            for tag in soup.select(selector):
                tag.decompose()

        # Find main content
        main_content = None
        for selector in self.CONTENT_SELECTORS:
            element = soup.select_one(selector)
            if element and len(element.get_text(strip=True)) > 50:  # Ensure it has meaningful content
                main_content = element
                break

        if not main_content:
            # Better fallback: try body but keep semantic structure
            body = soup.find("body")
            if body:
                # Remove only clearly non-content containers, keep article-like sections
                for tag in body.find_all(["nav", "header", "footer", "aside"]):
                    tag.decompose()
                main_content = body
            else:
                main_content = soup

        title = self._extract_title(soup, url)
        metadata = self._extract_metadata(soup)

        # Convert to markdown
        if self.config.output_format == "markdown":
            content = self._html_to_markdown(main_content)
        else:
            content = main_content.get_text(separator="\n", strip=True)

        content = re.sub(r"\n{3,}", "\n\n", content).strip()
        
        # DEBUG: Log content length for troubleshooting
        if getattr(self.config, 'verbose', False):
            print(f"  [DEBUG] Extracted content length: {len(content)} chars", flush=True)
        
        return title, content, metadata

    def _extract_title(self, soup: BeautifulSoup, url: str) -> str:
        """Extract page title with fallbacks."""
        h1 = soup.find("h1")
        if h1 and h1.get_text(strip=True):
            return h1.get_text(strip=True)

        title_tag = soup.find("title")
        if title_tag and title_tag.get_text(strip=True):
            title = title_tag.get_text(strip=True)
            return re.sub(r"\s*[|\-–]\s*.*$", "", title).strip()

        return urlparse(url).path.rstrip("/").split("/")[-1] or "Untitled"

    def _extract_metadata(self, soup: BeautifulSoup) -> Dict[str, str]:
        """Extract metadata from page."""
        metadata = {}

        for prop in ["description", "og:description", "twitter:description"]:
            tag = soup.find("meta", attrs={"name": prop}) or soup.find(
                "meta", attrs={"property": prop}
            )
            if tag and tag.get("content"):
                metadata["description"] = tag["content"]
                break

        return metadata

    def _html_to_markdown(self, element: Tag) -> str:
        """Convert HTML to markdown using markdownify [[41]]."""
        html_str = str(element)
        
        # markdownify configuration for documentation-friendly output
        result = md(
            html_str,
            heading_style="ATX",           # # Heading instead of Heading\n===
            bullets="-",                   # Use - for lists
            escape_asterisks=True,         # Escape * in text
            escape_underscores=True,       # Escape _ in text
            strip=["script", "style"],     # Remove these tags completely
            convert=["a", "img", "code", "pre"],  # Ensure these are converted
        )
        
        # Post-process: clean up code blocks if extract_code_blocks is disabled
        if not self.config.extract_code_blocks:
            result = re.sub(r'```[\w]*\n(.*?)```', r'\1', result, flags=re.DOTALL)
        
        return result.strip()


def _build_site_map_structure(pages: List[ScrapedPage], base_url: str) -> str:
    """Build a tree-like site map structure from scraped pages."""
    if not pages:
        return "// [No pages scraped]\n"

    tree: Dict[str, List] = {}
    
    for page in pages:
        parsed = urlparse(page.url)
        path_parts = [p for p in parsed.path.split("/") if p]
        
        current = tree
        for part in path_parts[:-1]:
            if part not in current:
                current[part] = {}
            current = current[part]
        
        leaf_name = path_parts[-1] if path_parts else "index"
        if leaf_name not in current:
            current[leaf_name] = []
        current[leaf_name].append(page)

    def render_tree(node: Dict, prefix: str = "", is_last: bool = True) -> List[str]:
        lines = []
        items = list(node.items())
        
        for i, (key, value) in enumerate(items):
            is_last_item = (i == len(items) - 1)
            connector = "└── " if is_last_item else "├── "
            
            if isinstance(value, dict):
                lines.append(f"{prefix}{connector}{key}/")
                extension = "    " if is_last_item else "│   "
                lines.extend(render_tree(value, prefix + extension, is_last_item))
            else:
                for j, page in enumerate(value):
                    page_prefix = "└── " if (is_last_item and j == len(value) - 1) else "├── "
                    lines.append(f"{prefix}{page_prefix}{page.title} ({page.word_count}w)")
        
        return lines

    lines = ["//"]
    lines.extend(render_tree(tree))
    return "\n".join(lines) + "\n"


def _format_elapsed(seconds: float) -> str:
    """Format elapsed time in human-readable form."""
    if seconds < 60:
        return f"{seconds:.1f}s"
    elif seconds < 3600:
        mins = int(seconds // 60)
        secs = seconds % 60
        return f"{mins}m {secs:.0f}s"
    else:
        hours = int(seconds // 3600)
        mins = int((seconds % 3600) // 60)
        return f"{hours}h {mins}m"


# Retry decorator using tenacity [[47]]
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((curl_requests.RequestsError, ConnectionError, UnicodeDecodeError)),
    reraise=True
)
def _fetch_with_retry(session, url: str, timeout: int = 30, **kwargs):
    """Fetch URL with automatic retries using tenacity [[47]]."""
    response = session.get(url, timeout=timeout, **kwargs)
    
    # Явно устанавливаем кодировку, если не определена
    if response.encoding is None or response.encoding == 'ISO-8859-1':
        # Попробуем определить из заголовков или угадать
        content_type = response.headers.get('Content-Type', '')
        if 'charset=' in content_type:
            import re
            match = re.search(r'charset=([^\s;]+)', content_type)
            if match:
                response.encoding = match.group(1)
        else:
            # Fallback: пробуем utf-8, потом детектируем
            response.encoding = 'utf-8'
    
    return response

def parse_documentation(
    base_url: str,
    output: Path,
    max_pages: int = 50,
    max_depth: int = 3,
    allowed_domains: Optional[List[str]] = None,
    allowed_path_prefixes: Optional[List[str]] = None,  # NEW: restrict to specific paths
    exclude_patterns: Optional[List[str]] = None,
    respect_robots: bool = True,
    delay: float = 1.0,
    user_agent: str = "ContextMerger/1.0",
    min_content_length: int = 100,
    extract_code_blocks: bool = True,
    output_format: str = "markdown",
    verbose: bool = False,
    use_sitemap: bool = True,
) -> Dict:
    """
    Parse documentation from a website with progress tracking and sitemap support.
    
    Args:
        allowed_path_prefixes: List of path prefixes to allow (e.g., ['/handbook/flutter']).
                              If not provided, defaults to the path of base_url.
    """
    from .config import ParserConfig

    # Если path prefix не указан, используем путь из base_url по умолчанию
    if allowed_path_prefixes is None:
        base_parsed = urlparse(base_url)
        default_prefix = base_parsed.path.rstrip("/") or "/"
        allowed_path_prefixes = [default_prefix]

    config = ParserConfig(
        base_url=base_url,
        max_pages=max_pages,
        max_depth=max_depth,
        allowed_domains=allowed_domains or [],
        allowed_path_prefixes=allowed_path_prefixes,  # Теперь передаём в config
        exclude_patterns=exclude_patterns or [],
        extract_code_blocks=extract_code_blocks,
        min_content_length=min_content_length,
        delay_between_requests=delay,
        user_agent=user_agent,
        respect_robots_txt=respect_robots,
        output_format=output_format,
        include_url_in_output=True,
        include_metadata=True,
    )

    link_resolver = LinkResolver(base_url, config)
    content_extractor = ContentExtractor(config)
    
    # curl_cffi session with browser impersonation
    session = curl_requests.Session()
    session.headers.update({"User-Agent": config.user_agent})
    session.impersonate = "chrome120"

    pages: List[ScrapedPage] = []
    errors: List[Tuple[str, str]] = []
    not_found: List[str] = []
    skipped: List[str] = []
    
    queue: List[Tuple[str, int]] = []
    
    sitemap_urls: List[str] = []
    if use_sitemap:
        if verbose:
            print(f"🔍 Discovering sitemap for {base_url}...")
        sitemap_parser = SitemapParser(base_url, config)
        sitemap_urls = sitemap_parser.discover_and_parse()
        if sitemap_urls:
            if verbose:
                print(f"✓ Found {len(sitemap_urls)} URLs in sitemap")
            for url in sitemap_urls[:max_pages]:
                queue.append((url, 0))
    
    if not queue:
        queue.append((base_url, 0))
        if verbose:
            print(f"⚠️  No sitemap found, starting from base URL: {base_url}")

    output.parent.mkdir(parents=True, exist_ok=True)

    pages_count = 0
    
    with click.progressbar(
        length=max_pages,
        label="📄 Scraping",
        show_pos=True,
        show_eta=True,
        fill_char="█",
        empty_char="░",
        width=50,
    ) as pbar:
        
        with open(output, "w+", encoding="utf-8") as f:
            f.write("---\n")
            f.write("type: documentation_context\n")
            f.write(f"source_url: {base_url}\n")
            f.write(f"generated_at: {time.strftime('%Y-%m-%dT%H:%M:%S')}\n")
            f.write(f"sitemap_used: {bool(sitemap_urls)}\n")
            f.write(f"sitemap_urls_found: {len(sitemap_urls)}\n")
            f.write(f"path_prefixes: {allowed_path_prefixes}\n")  # Log the path filter
            f.write("---\n\n")

            f.write("█" * 70 + "\n")
            f.write("// 🗺️  DOCUMENTATION STRUCTURE\n")
            f.write("█" * 70 + "\n")
            f.write("// [Building site map during crawl...]\n\n")

            while queue and pages_count < config.max_pages:
                url, depth = queue.pop(0)
                page_start_time = time.time()
                
                # Update progress label with current URL and elapsed time
                short_url = url[:50] + "..." if len(url) > 50 else url
                elapsed = time.time() - page_start_time
                current_label = f"📄 Parsing: {short_url} ⏱ {_format_elapsed(elapsed)}"
                click.echo(f"\r{current_label}", nl=False, err=True)

                if depth > config.max_depth:
                    pbar.update(1)
                    continue

                try:
                    # Fetch with retry logic using tenacity [[47]]
                    response = _fetch_with_retry(
                        session, 
                        url, 
                        timeout=30, 
                        impersonate="chrome120"
                    )
                    response.raise_for_status()

                    content_type = response.headers.get("Content-Type", "")
                    if "text/html" not in content_type:
                        skipped.append(url)
                        pbar.update(1)
                        continue

                    title, content, metadata = content_extractor.extract(
                        response.text, url
                    )
                    print(f"DEBUG title={title!r} content_len={len(content)}", flush=True)

                    if len(content) < config.min_content_length:
                        if verbose:
                            print(f"  ⊘ Skipped (content too short: {len(content)} < {config.min_content_length}): {url}", flush=True)
                        skipped.append(url)
                        pbar.update(1)
                        continue

                    page = ScrapedPage(
                        url=url,
                        title=title,
                        content=content,
                        metadata=metadata,
                        word_count=len(content.split()),
                        scraped_at=time.strftime("%Y-%m-%d %H:%M:%S"),
                        _raw_html=response.text,
                    )

                    pages.append(page)
                    pages_count += 1

                    # Show completion with timing
                    page_elapsed = time.time() - page_start_time
                    short_url = url[:40] + "..." if len(url) > 40 else url
                    click.echo(
                        f"\r📄 Done: {short_url} ⏱ {_format_elapsed(page_elapsed)} ({page.word_count}w)   ", 
                        nl=True, 
                        err=True
                    )
                    pbar.update(1)

                    f.write("=" * 70 + "\n")
                    f.write(f"// 📄 [{pages_count}] {page.title}\n")
                    f.write(f"// 🔗 {url}\n")
                    f.write(f"// 📊 {page.word_count} words\n")
                    f.write("=" * 70 + "\n\n")
                    f.write(page.to_markdown(include_url=False))
                    f.write("\n\n")

                    if verbose:
                        print(f"✓ Scraped: {url} ({page.word_count} words)")

                    # Extract links for continued crawling
                    if depth < config.max_depth:
                        new_links = link_resolver.extract_links(response.text, url)
                        for link in new_links:
                            if link not in [p.url for p in pages]:
                                queue.append((link, depth + 1))

                    if queue:
                        time.sleep(config.delay_between_requests)

                except curl_requests.RequestsError as e:
                    status_code = getattr(e, "status_code", None)
                    if status_code == 404:
                        not_found.append(url)
                    else:
                        errors.append((url, str(e)))
                    pbar.update(1)
                except Exception as e:
                    errors.append((url, str(e)))
                    pbar.update(1)

            # Rewrite with actual site map
            site_map_content = _build_site_map_structure(pages, base_url)
            f.seek(0)
            original_content = f.read()
            f.seek(0)
            f.truncate()
            
            f.write("---\n")
            f.write("type: documentation_context\n")
            f.write(f"source_url: {base_url}\n")
            f.write(f"generated_at: {time.strftime('%Y-%m-%dT%H:%M:%S')}\n")
            f.write(f"sitemap_used: {bool(sitemap_urls)}\n")
            f.write(f"sitemap_urls_found: {len(sitemap_urls)}\n")
            f.write(f"path_prefixes: {allowed_path_prefixes}\n")
            f.write("---\n\n")

            f.write("█" * 70 + "\n")
            f.write("// 🗺️  DOCUMENTATION STRUCTURE\n")
            f.write("█" * 70 + "\n")
            f.write(site_map_content)
            f.write("\n")
            
            page_start = original_content.find("=" * 70)
            if page_start != -1:
                f.write(original_content[page_start:])

            f.write("\n" + "!" * 70 + "\n")
            f.write(f"// 📊 SCRAPING SUMMARY\n")
            f.write("!" * 70 + "\n")
            f.write(f"// Pages scraped: {pages_count}\n")
            f.write(f"// Path prefixes filter: {allowed_path_prefixes}\n")
            f.write(f"// Sitemap URLs discovered: {len(sitemap_urls)}\n")
            f.write(f"// Errors: {len(errors)}\n")
            f.write(f"// 404 Not Found: {len(not_found)}\n")
            f.write(f"// Skipped: {len(skipped)}\n")

            if errors:
                f.write(f"\n// ⚠️  ERRORS (first 20):\n")
                for url, error in errors[:20]:
                    f.write(f"// • {url}: {error}\n")

    total_words = sum(p.word_count for p in pages)
    return {
        "pages_scraped": pages_count,
        "total_words": total_words,
        "estimated_tokens": int(total_words * 1.3),
        "errors": len(errors),
        "not_found": len(not_found),
        "skipped": len(skipped),
        "sitemap_urls_found": len(sitemap_urls),
        "sitemap_used": bool(sitemap_urls),
        "path_prefixes_used": allowed_path_prefixes,
        "output_file": str(output.resolve()),
    }