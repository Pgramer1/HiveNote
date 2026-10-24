"""Structure-aware chunking: follow headings and slides, then split long sections at
paragraph and sentence boundaries. Each chunk gets a context header for embedding."""

from dataclasses import dataclass

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.parsing.model import Block, ParsedDocument


@dataclass
class Chunk:
    index: int
    content: str  # stored and shown to the model
    page: int  # first page/slide the chunk covers
    section: str | None
    kind: str  # text | slide | notes | table | ocr
    embed_text: str  # content with its context header, used only for the embedding


def _is_slides(doc: ParsedDocument) -> bool:
    return doc.slides or any(b.kind in ("slide", "notes") for b in doc.blocks)


def _has_ocr(blocks: list[Block]) -> bool:
    return any(b.kind == "ocr" for b in blocks)


def _group_pdf(blocks: list[Block], chunk_size: int, pack_pages: bool = True) -> list[list[Block]]:
    """Consecutive blocks under the same heading (and page, unless `pack_pages`), packed up to `chunk_size`."""
    groups: list[list[Block]] = []
    for block in blocks:
        current = groups[-1] if groups else None
        if (
            current
            and current[-1].section == block.section
            and (pack_pages or current[-1].page == block.page)
            and sum(len(b.text) for b in current) + len(block.text) <= chunk_size
        ):
            current.append(block)
        else:
            groups.append([block])
    return groups


def _merge_tiny(groups: list[list[Block]], min_chars: int) -> list[list[Block]]:
    """A group shorter than `min_chars` (a stray heading, a lone label) joins the next group on
    its page, or else the previous one; it stays alone only when its page has nothing else."""
    def size(group: list[Block]) -> int:
        return sum(len(b.text) for b in group)

    forward: list[list[Block]] = []
    pending: list[Block] | None = None
    for group in groups:
        if pending and pending[-1].page == group[0].page:
            group = pending + group
        elif pending:
            forward.append(pending)
        pending = None
        if size(group) < min_chars:
            pending = group
        else:
            forward.append(group)
    if pending:
        forward.append(pending)

    merged: list[list[Block]] = []
    for group in forward:
        if merged and size(group) < min_chars and merged[-1][-1].page == group[0].page:
            merged[-1] = merged[-1] + group
        else:
            merged.append(group)
    return merged


def _group_slides(blocks: list[Block], chunk_size: int, min_chars: int) -> list[list[Block]]:
    """One group per slide (with its notes); a short slide is merged with the next slide
    when that slide continues the same title (or the short slide has none). Slides read by OCR
    are never merged, so each stays one 'ocr' chunk that the daily OCR budget can count."""
    per_slide: dict[int, list[Block]] = {}
    for block in blocks:
        per_slide.setdefault(block.page, []).append(block)
    slides = [per_slide[p] for p in sorted(per_slide)]

    groups: list[list[Block]] = []
    for slide in slides:
        current = groups[-1] if groups else None
        if current and not _has_ocr(current) and not _has_ocr(slide):
            size = sum(len(b.text) for b in current)
            same_topic = current[0].section is None or current[0].section == slide[0].section
            if size < min_chars and same_topic and size + sum(len(b.text) for b in slide) <= chunk_size:
                current.extend(slide)
                continue
        groups.append(list(slide))
    return groups


def _header(title: str, section: str | None, page: int, slides: bool) -> str:
    parts = [title.strip()] if title.strip() else []
    if section and section.strip() != title.strip():
        parts.append(section.strip())
    parts.append(f"slide {page}" if slides else f"p. {page}")
    return " › ".join(parts)


def build_chunks(
    doc: ParsedDocument,
    title: str,
    chunk_size: int = 1500,
    chunk_overlap: int = 200,
    min_slide_chars: int = 200,
    pdf_pack_pages: bool = False,
    context_header: bool = True,
    min_chunk_chars: int = 30,
) -> list[Chunk]:
    slides = _is_slides(doc)
    groups = (
        _group_slides(doc.blocks, chunk_size, min_slide_chars)
        if slides
        else _merge_tiny(_group_pdf(doc.blocks, chunk_size, pdf_pack_pages), min_chunk_chars)
    )
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size, chunk_overlap=chunk_overlap, separators=["\n\n", "\n", ". ", " ", ""]
    )

    chunks: list[Chunk] = []
    for group in groups:
        first = group[0]
        kind = "ocr" if _has_ocr(group) else "slide" if slides else first.kind
        text = "\n\n".join(b.text for b in group)
        # A group exceeds the size only when a single block does (packing stops before) or a tiny
        # group was merged into it; the splitter then cuts it at paragraph and sentence boundaries.
        pieces = splitter.split_text(text) if len(text) > chunk_size else [text]
        for piece in pieces:
            piece = piece.strip()
            if not piece:
                continue
            header = _header(title, first.section, first.page, slides)
            chunks.append(
                Chunk(
                    index=len(chunks),
                    content=piece,
                    page=first.page,
                    section=first.section,
                    kind=kind,
                    embed_text=f"{header}\n\n{piece}" if context_header else piece,
                )
            )
    return chunks
