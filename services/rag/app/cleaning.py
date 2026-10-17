"""Text clean-up shared by the parsers."""

import re
from collections import Counter

_HYPHEN_BREAK = re.compile(r"(\w)-\n(\w)")
_SPACES = re.compile(r"[ \t ]+")
_BLANK_LINES = re.compile(r"\n{3,}")
_DIGITS = re.compile(r"\d+")


def normalize_whitespace(text: str) -> str:
    text = _HYPHEN_BREAK.sub(r"\1\2", text)
    text = "\n".join(_SPACES.sub(" ", line).strip() for line in text.splitlines())
    return _BLANK_LINES.sub("\n\n", text).strip()


def _line_keys(line: str, page_index: int) -> set[tuple]:
    """Ways a header/footer line can repeat: identical text ("CS201 Data Structures"), or the
    same text with a number that rises with the page ("Lecture Notes - Page 3", "- 4 -")."""
    text = line.strip().lower()
    keys: set[tuple] = {("exact", text)}
    numbers = _DIGITS.findall(text)
    if numbers:
        keys.add(("paged", _DIGITS.sub("#", text), int(numbers[-1]) - page_index))
    return keys


def _edge_indices(lines: list[str], edge_lines: int) -> list[int]:
    content = [i for i, ln in enumerate(lines) if ln.strip()]
    # On short pages (slides exported as PDF) the "edges" would be the whole page.
    n = edge_lines if len(content) > 2 * edge_lines + 2 else 1
    return sorted(set(content[:n] + content[-n:]))


def remove_repeated_edges(pages: list[str], edge_lines: int = 2, min_share: float = 0.5) -> list[str]:
    """Drop header/footer lines that repeat on at least `min_share` of pages.

    Only the first and last lines of each page are candidates, so repeated content in the
    body (a recurring formula, a table header) is kept.
    """
    if len(pages) < 3:
        return pages

    split = [p.splitlines() for p in pages]
    counts: Counter = Counter()
    for page_index, lines in enumerate(split):
        page_keys = set()
        for i in _edge_indices(lines, edge_lines):
            if len(lines[i].strip()) > 2:
                page_keys |= _line_keys(lines[i], page_index)
        counts.update(page_keys)

    threshold = max(2, -(-len(pages) * min_share // 1))  # ceil
    repeated = {key for key, n in counts.items() if n >= threshold}
    if not repeated:
        return pages

    cleaned = []
    for page_index, lines in enumerate(split):
        drop = {i for i in _edge_indices(lines, edge_lines) if _line_keys(lines[i], page_index) & repeated}
        cleaned.append("\n".join(ln for i, ln in enumerate(lines) if i not in drop))
    return cleaned
