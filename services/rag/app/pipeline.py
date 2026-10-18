import logging
import time
from dataclasses import asdict, dataclass

import psycopg

from app import db
from app.chunking import build_chunks
from app.config import Settings, get_settings
from app.embeddings import embed_texts
from app.ocr import ocr_pages
from app.parsing import Block, ParsedDocument, UnsupportedDocument, parse_document
from app.storage import download

log = logging.getLogger("rag.pipeline")


@dataclass
class IngestResult:
    resource_id: str
    status: str  # READY | FAILED | SKIPPED | DEFERRED
    chunks: int = 0
    pages: int = 0
    empty_pages: int = 0
    error: str | None = None
    seconds: float = 0.0
    ocr_pages: int = 0
    ocr_neurons: float = 0.0

    def as_dict(self) -> dict:
        return asdict(self)


class OcrDeferred(Exception):
    """Today's OCR budget can't cover the document; it stays PENDING for a later run."""


def apply_ocr(conn: psycopg.Connection, pdf: bytes, doc: ParsedDocument, settings: Settings) -> tuple[ParsedDocument, int, float]:
    """Reads the document's text-less pages with the vision model and merges the text in page order.
    Returns the new document, pages read and neurons used. Raises OcrDeferred when over budget."""
    cap = min(settings.ocr_max_pages_per_document, settings.ocr_daily_page_budget)
    pages = doc.empty_pages[:cap]
    remaining = settings.ocr_daily_page_budget - db.ocr_pages_used_today(conn)
    if len(pages) > remaining:
        raise OcrDeferred(
            f"Waiting for the daily OCR budget: {len(pages)} pages to read, {max(remaining, 0)} left today"
        )
    texts, neurons = ocr_pages(pdf, pages, settings)
    blocks = doc.blocks + [Block(text=text, page=page, kind="ocr") for page, text in texts.items()]
    blocks.sort(key=lambda b: b.page)  # stable: keeps the order of blocks within a page
    still_empty = [p for p in doc.empty_pages if p not in texts]
    if len(doc.empty_pages) > cap:
        log.warning("OCR read only the first %s of %s text-less pages", cap, len(doc.empty_pages))
    return ParsedDocument(blocks=blocks, page_count=doc.page_count, empty_pages=still_empty), len(texts), neurons


def index_resource(conn: psycopg.Connection, row: db.ResourceRow) -> IngestResult:
    """Download → parse → OCR text-less pages → chunk → embed → save, for a resource already claimed as PROCESSING."""
    settings = get_settings()
    started = time.monotonic()
    ocr_count, neurons = 0, 0.0
    try:
        data = download(row.file_url, settings.max_download_bytes)
        doc = parse_document(data, row.type)
        if doc.empty_pages and row.type == "PDF" and settings.ocr_provider != "off":
            doc, ocr_count, neurons = apply_ocr(conn, data, doc, settings)
        if not doc.blocks:
            reason = "OCR is turned off" if settings.ocr_provider == "off" else "OCR found no text either"
            raise UnsupportedDocument(f"No extractable text on any of {doc.page_count} pages; {reason}")
        chunks = build_chunks(
            doc, row.title, settings.chunk_size, settings.chunk_overlap, settings.min_slide_chars,
            settings.pdf_pack_pages, settings.context_header,
        )
        vectors = embed_texts([c.embed_text for c in chunks])
        db.save_index(conn, row.id, chunks, vectors, doc.full_text[: settings.max_extracted_chars])
        result = IngestResult(row.id, "READY", len(chunks), doc.page_count, len(doc.empty_pages))
    except OcrDeferred as exc:
        db.mark_deferred(conn, row.id, str(exc))
        result = IngestResult(row.id, "DEFERRED", error=str(exc))
    except Exception as exc:  # any failure is recorded on the resource, never raised to callers
        log.exception("Indexing failed for %s", row.id)
        db.mark_failed(conn, row.id, f"{type(exc).__name__}: {exc}")
        result = IngestResult(row.id, "FAILED", error=str(exc)[:500])
    result.ocr_pages, result.ocr_neurons = ocr_count, round(neurons, 1)
    result.seconds = round(time.monotonic() - started, 2)
    log.info("Indexed %s: %s", row.id, result)
    return result


def ingest(resource_id: str, force: bool = False) -> IngestResult:
    with db.connect() as conn:
        row = db.claim_resource(conn, resource_id, force=force)
        if row is None:
            return IngestResult(resource_id, "SKIPPED", error="Not a PDF/PPT resource, or already being indexed")
        return index_resource(conn, row)


def ingest_pending(limit: int) -> list[IngestResult]:
    results = []
    deferred: list[str] = []  # put back in the queue this run; don't claim them again
    with db.connect() as conn:
        for _ in range(limit):
            row = db.claim_next_pending(conn, exclude=deferred)
            if row is None:
                break
            result = index_resource(conn, row)
            if result.status == "DEFERRED":
                deferred.append(row.id)
            results.append(result)
    return results
