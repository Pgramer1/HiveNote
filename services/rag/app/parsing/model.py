from dataclasses import dataclass, field


@dataclass
class Block:
    """A run of text from one page (PDF) or slide (deck)."""

    text: str
    page: int  # 1-based page or slide number
    section: str | None = None  # nearest heading, or the slide title
    kind: str = "text"  # text | slide | notes | table | ocr (read from the page image by app/ocr.py)


@dataclass
class ParsedDocument:
    blocks: list[Block]
    page_count: int
    # Pages with (almost) no extractable text: scans, handwriting or picture-only slides, read by OCR.
    empty_pages: list[int] = field(default_factory=list)

    @property
    def full_text(self) -> str:
        return "\n\n".join(b.text for b in self.blocks)


class UnsupportedDocument(Exception):
    """The file can't be parsed (wrong type, corrupt, or a converter is missing)."""
