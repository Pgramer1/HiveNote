import io
import shutil
import subprocess
import tempfile
from pathlib import Path
from zipfile import BadZipFile

from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE
from pptx.exc import PackageNotFoundError

from app.cleaning import normalize_whitespace
from app.parsing.model import Block, ParsedDocument, UnsupportedDocument


def _shape_lines(shape) -> list[str]:
    if shape.shape_type == MSO_SHAPE_TYPE.GROUP:
        return [line for child in shape.shapes for line in _shape_lines(child)]
    if getattr(shape, "has_table", False) and shape.has_table:
        return [" | ".join(cell.text.strip() for cell in row.cells) for row in shape.table.rows]
    if getattr(shape, "has_text_frame", False) and shape.has_text_frame:
        return [p.text for p in shape.text_frame.paragraphs if p.text.strip()]
    return []


def _reading_order(shape) -> tuple[int, int]:
    return (shape.top or 0, shape.left or 0)


def parse_pptx(data: bytes) -> ParsedDocument:
    try:
        prs = Presentation(io.BytesIO(data))
    except (BadZipFile, PackageNotFoundError, KeyError, ValueError) as exc:
        raise UnsupportedDocument(f"Not a readable .pptx file: {exc}") from exc

    blocks: list[Block] = []
    empty_pages: list[int] = []
    for number, slide in enumerate(prs.slides, start=1):
        title_shape = slide.shapes.title
        title = title_shape.text.strip() if title_shape is not None and title_shape.text.strip() else None

        lines = [title] if title else []
        for shape in sorted(slide.shapes, key=_reading_order):
            if title_shape is not None and shape.shape_id == title_shape.shape_id:
                continue
            lines.extend(_shape_lines(shape))
        text = normalize_whitespace("\n".join(lines))

        if sum(ch.isalnum() for ch in text) < 3:
            empty_pages.append(number)
        else:
            blocks.append(Block(text=text, page=number, section=title, kind="slide"))

        if slide.has_notes_slide:
            notes = normalize_whitespace(slide.notes_slide.notes_text_frame.text or "")
            if notes:
                blocks.append(Block(text=f"Speaker notes: {notes}", page=number, section=title, kind="notes"))

    return ParsedDocument(blocks=blocks, page_count=len(prs.slides), empty_pages=empty_pages)


def convert_ppt_to_pptx(data: bytes, timeout: int = 180) -> bytes:
    """Converts a legacy binary .ppt with LibreOffice (installed in the Docker image)."""
    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice:
        raise UnsupportedDocument("Legacy .ppt files need LibreOffice (soffice), which isn't installed")

    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / "deck.ppt"
        src.write_bytes(data)
        profile = (Path(tmp) / "profile").as_uri()  # isolated profile: safe to run concurrently
        result = subprocess.run(
            [soffice, f"-env:UserInstallation={profile}", "--headless", "--norestore",
             "--convert-to", "pptx", "--outdir", tmp, str(src)],
            capture_output=True, timeout=timeout,
        )
        out = Path(tmp) / "deck.pptx"
        if result.returncode != 0 or not out.exists():
            detail = (result.stderr or result.stdout).decode(errors="replace")[-300:]
            raise UnsupportedDocument(f"LibreOffice couldn't convert the .ppt file: {detail}")
        return out.read_bytes()
