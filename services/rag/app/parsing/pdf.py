import re

import pymupdf
import pymupdf4llm

from app.cleaning import normalize_whitespace, remove_repeated_edges
from app.parsing.model import Block, ParsedDocument, UnsupportedDocument

_HEADING = re.compile(r"^(#{1,6})\s+(.+)$")
_PICTURE_NOTE = re.compile(r"==>\s*picture .*?<==", re.IGNORECASE)
_EMPHASIS = re.compile(r"(\*\*|__)(.+?)\1")
# A page needs at least this many letters/digits to count as having text.
_MIN_PAGE_CHARS = 20


def _plain(md: str) -> str:
    """Markdown from pymupdf4llm with emphasis markers and image placeholders removed."""
    md = _PICTURE_NOTE.sub("", md)
    return _EMPHASIS.sub(r"\2", md)


def _letters(text: str) -> int:
    return sum(ch.isalnum() for ch in text)


def parse_pdf(data: bytes) -> ParsedDocument:
    try:
        doc = pymupdf.open(stream=data, filetype="pdf")
    except Exception as exc:  # pymupdf raises several error types for broken files
        raise UnsupportedDocument(f"Not a readable PDF: {exc}") from exc

    with doc:
        page_count = doc.page_count
        # Markdown per page: headings detected from font sizes, multi-column text in
        # reading order, tables as Markdown tables.
        pages = pymupdf4llm.to_markdown(doc, page_chunks=True, show_progress=False)

    texts = remove_repeated_edges([normalize_whitespace(_plain(p["text"])) for p in pages])

    blocks: list[Block] = []
    empty_pages: list[int] = []
    section: str | None = None  # headings carry over to following pages
    for number, text in enumerate(texts, start=1):
        if _letters(text) < _MIN_PAGE_CHARS:
            empty_pages.append(number)
            continue

        lines: list[str] = []

        def flush() -> None:
            body = "\n".join(lines).strip()
            if _letters(body):
                blocks.append(Block(text=body, page=number, section=section))
            lines.clear()

        for line in text.splitlines():
            heading = _HEADING.match(line)
            if heading:
                flush()
                section = heading.group(2).strip()
                lines.append(section)  # keep the heading text searchable
            else:
                lines.append(line)
        flush()

    return ParsedDocument(blocks=blocks, page_count=page_count, empty_pages=empty_pages)
