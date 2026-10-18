from app.parsing.model import Block, ParsedDocument, UnsupportedDocument
from app.parsing.pdf import parse_pdf
from app.parsing.slides import convert_deck_to_pdf, convert_ppt_to_pptx, parse_pptx

__all__ = ["Block", "ParsedDocument", "UnsupportedDocument", "convert_deck_to_pdf", "parse_document"]

_PDF = b"%PDF"
_ZIP = b"PK\x03\x04"  # .pptx (Office Open XML)
_OLE = b"\xd0\xcf\x11\xe0"  # legacy .ppt (and other old Office formats)


def parse_document(data: bytes, resource_type: str) -> ParsedDocument:
    """Parses by file signature; `resource_type` (PDF or PPT) only guards against mismatches."""
    head = data[:4]
    if head == _PDF and resource_type == "PDF":
        return parse_pdf(data)
    if resource_type == "PPT":
        if head == _ZIP:
            return parse_pptx(data)
        if head == _OLE:
            return parse_pptx(convert_ppt_to_pptx(data))
    raise UnsupportedDocument(f"File doesn't look like a {resource_type} (starts with {head!r})")
