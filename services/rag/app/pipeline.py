import logging
import re
import time
from dataclasses import asdict, dataclass

import psycopg
import pymupdf

from app import db
from app.chunking import build_chunks
from app.config import Settings, get_settings
from app.embeddings import embed_texts
from app.ocr import ocr_pages
from app.parsing import Block, ParsedDocument, UnsupportedDocument, convert_deck_to_pdf, parse_document
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
    ocr_failed: int = 0  # text-less pages whose OCR failed this run
    ocr_retry: bool = False  # those pages are queued for the next --pending run

    def as_dict(self) -> dict:
        return asdict(self)


class OcrDeferred(Exception):
    """Today's OCR budget can't cover the document; it stays PENDING for a later run."""


@dataclass
class OcrOutcome:
    doc: ParsedDocument
    pages_read: int
    neurons: float
    failed: int  # pages whose OCR call failed (or wasn't made once the provider kept failing)
    attempted: int  # pages sent for OCR, after the per-document cap


def apply_ocr(conn: psycopg.Connection, pdf: bytes, doc: ParsedDocument, settings: Settings) -> OcrOutcome:
    """Reads the document's text-less pages with the vision model and merges the text in page order.
    Raises OcrDeferred when over budget."""
    cap = min(settings.ocr_max_pages_per_document, settings.ocr_daily_page_budget)
    pages = doc.empty_pages[:cap]
    remaining = settings.ocr_daily_page_budget - db.ocr_pages_used_today(conn)
    if len(pages) > remaining:
        raise OcrDeferred(
            f"Waiting for the daily OCR budget: {len(pages)} pages to read, {max(remaining, 0)} left today"
        )
    read = ocr_pages(pdf, pages, settings)
    texts = read.texts
    # The OCR text replaces whatever little text the parser found on that page (a slide title, say),
    # which becomes the section; speaker notes stay.
    sections = {b.page: b.section for b in doc.blocks if b.page in texts and b.section}
    blocks = [b for b in doc.blocks if b.page not in texts or b.kind == "notes"]
    blocks += [Block(text=text, page=page, section=sections.get(page), kind="ocr") for page, text in texts.items()]
    blocks.sort(key=lambda b: (b.page, b.kind == "notes"))  # page order; OCR text before the slide's notes
    still_empty = [p for p in doc.empty_pages if p not in texts]
    if len(doc.empty_pages) > cap:
        log.warning("OCR read only the first %s of %s text-less pages", cap, len(doc.empty_pages))
    result = ParsedDocument(blocks=blocks, page_count=doc.page_count, empty_pages=still_empty, slides=doc.slides)
    return OcrOutcome(result, len(texts), read.neurons, len(read.failed), len(pages))


_ATTEMPT = re.compile(r"\(attempt (\d+) of \d+\)")


def ocr_retry_note(previous_error: str | None, failed: int, attempted: int, settings: Settings) -> tuple[str, bool]:
    """indexError for a READY resource with failed OCR pages, and whether the --pending run retries it.
    The attempt count rides in the note, so it needs no schema change; after the last attempt the note
    no longer starts with OCR_INCOMPLETE and the resource stops being claimed."""
    previous = 0
    if previous_error and previous_error.startswith(db.OCR_INCOMPLETE):
        match = _ATTEMPT.search(previous_error)
        previous = int(match.group(1)) if match else 0
    attempt = previous + 1
    if attempt < settings.ocr_max_attempts:
        return (
            f"{db.OCR_INCOMPLETE} {failed} of {attempted} text-less pages failed "
            f"(attempt {attempt} of {settings.ocr_max_attempts}); the daily run retries them",
            True,
        )
    return f"OCR gave up on {failed} of {attempted} text-less pages after {attempt} attempts", False


def ocr_source(data: bytes, doc: ParsedDocument, resource_type: str) -> bytes | None:
    """The PDF that OCR renders pages from: the file itself, or a deck converted with LibreOffice.
    None when a deck can't be converted page-for-slide; the deck is then indexed without OCR."""
    if resource_type == "PDF":
        return data
    try:
        pdf = convert_deck_to_pdf(data)
        with pymupdf.open(stream=pdf, filetype="pdf") as converted:
            pages = converted.page_count
    except Exception as exc:  # LibreOffice missing or failing must not fail the whole deck
        log.warning("Couldn't render the deck for OCR: %s", exc)
        return None
    if pages != doc.page_count:
        log.warning("Deck rendered to %s pages for %s slides; skipping OCR", pages, doc.page_count)
        return None
    return pdf


def index_resource(session: db.Session, row: db.ResourceRow) -> IngestResult:
    """Download → parse → OCR text-less pages and picture slides → chunk → embed → save, for a resource
    already claimed as PROCESSING. Each database step asks the session for the connection, because
    OCR and embedding can leave it idle long enough for the server to drop it."""
    settings = get_settings()
    started = time.monotonic()
    ocr_count, neurons = 0, 0.0
    note, retry, failed = None, False, 0
    try:
        data = download(row.file_url, settings.max_download_bytes)
        doc = parse_document(data, row.type)
        if doc.empty_pages and settings.ocr_provider != "off":
            pdf = ocr_source(data, doc, row.type)
            if pdf is not None:
                outcome = apply_ocr(session.conn(), pdf, doc, settings)
                doc, ocr_count, neurons, failed = outcome.doc, outcome.pages_read, outcome.neurons, outcome.failed
                if failed:
                    note, retry = ocr_retry_note(row.previous_error, failed, outcome.attempted, settings)
        if not doc.blocks:
            if retry:  # nothing readable yet because OCR failed: wait in the queue instead of failing
                raise OcrDeferred(note)
            reason = "OCR is turned off" if settings.ocr_provider == "off" else note or "OCR found no text either"
            raise UnsupportedDocument(f"No extractable text on any of {doc.page_count} pages; {reason}")
        chunks = build_chunks(
            doc, row.title, settings.chunk_size, settings.chunk_overlap, settings.min_slide_chars,
            settings.pdf_pack_pages, settings.context_header, settings.min_chunk_chars,
        )
        vectors = embed_texts([c.embed_text for c in chunks])
        db.save_index(
            session.conn(), row.id, chunks, vectors, doc.full_text[: settings.max_extracted_chars], index_error=note
        )
        result = IngestResult(row.id, "READY", len(chunks), doc.page_count, len(doc.empty_pages))
    except OcrDeferred as exc:
        db.mark_deferred(session.conn(), row.id, str(exc))
        result = IngestResult(row.id, "DEFERRED", error=str(exc))
    except Exception as exc:  # any failure is recorded on the resource, never raised to callers
        log.exception("Indexing failed for %s", row.id)
        db.mark_failed(session.conn(), row.id, f"{type(exc).__name__}: {exc}")
        result = IngestResult(row.id, "FAILED", error=str(exc)[:500])
    result.ocr_pages, result.ocr_neurons = ocr_count, round(neurons, 1)
    result.ocr_failed, result.ocr_retry = failed, retry and result.status in ("READY", "DEFERRED")
    result.seconds = round(time.monotonic() - started, 2)
    log.info("Indexed %s: %s", row.id, result)
    return result


def ingest(resource_id: str, force: bool = False) -> IngestResult:
    with db.Session() as session:
        row = db.claim_resource(session.conn(), resource_id, force=force)
        if row is None:
            return IngestResult(resource_id, "SKIPPED", error="Not a PDF/PPT resource, or already being indexed")
        return index_resource(session, row)


def ingest_pending(limit: int) -> list[IngestResult]:
    results = []
    deferred: list[str] = []  # put back in the queue or left for an OCR retry this run; don't claim them again
    with db.Session() as session:
        for _ in range(limit):
            row = db.claim_next_pending(session.conn(), exclude=deferred)
            if row is None:
                break
            result = index_resource(session, row)
            if result.status == "DEFERRED" or result.ocr_retry:
                deferred.append(row.id)
            results.append(result)
    return results
