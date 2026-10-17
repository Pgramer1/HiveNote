import logging
import time
from dataclasses import asdict, dataclass

import psycopg

from app import db
from app.chunking import build_chunks
from app.config import get_settings
from app.embeddings import embed_texts
from app.parsing import UnsupportedDocument, parse_document
from app.storage import download

log = logging.getLogger("rag.pipeline")


@dataclass
class IngestResult:
    resource_id: str
    status: str  # READY | FAILED | SKIPPED
    chunks: int = 0
    pages: int = 0
    empty_pages: int = 0
    error: str | None = None
    seconds: float = 0.0

    def as_dict(self) -> dict:
        return asdict(self)


def index_resource(conn: psycopg.Connection, row: db.ResourceRow) -> IngestResult:
    """Download → parse → chunk → embed → save, for a resource already claimed as PROCESSING."""
    settings = get_settings()
    started = time.monotonic()
    try:
        data = download(row.file_url, settings.max_download_bytes)
        doc = parse_document(data, row.type)
        if not doc.blocks:
            raise UnsupportedDocument(
                f"No extractable text on any of {doc.page_count} pages (scanned or image-only); OCR is not supported yet"
            )
        chunks = build_chunks(
            doc, row.title, settings.chunk_size, settings.chunk_overlap, settings.min_slide_chars,
            settings.pdf_pack_pages, settings.context_header,
        )
        vectors = embed_texts([c.embed_text for c in chunks])
        db.save_index(conn, row.id, chunks, vectors, doc.full_text[: settings.max_extracted_chars])
        result = IngestResult(row.id, "READY", len(chunks), doc.page_count, len(doc.empty_pages))
    except Exception as exc:  # any failure is recorded on the resource, never raised to callers
        log.exception("Indexing failed for %s", row.id)
        db.mark_failed(conn, row.id, f"{type(exc).__name__}: {exc}")
        result = IngestResult(row.id, "FAILED", error=str(exc)[:500])
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
    with db.connect() as conn:
        for _ in range(limit):
            row = db.claim_next_pending(conn)
            if row is None:
                break
            results.append(index_resource(conn, row))
    return results
