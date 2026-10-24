"""The indexError note that queues a READY resource's failed OCR pages for a retry (no database needed)."""

from app import db, pipeline
from app.config import Settings

SETTINGS = Settings(database_url="x", cloudflare_account_id="a", cloudflare_api_token="t", ocr_max_attempts=3)


def test_first_failure_queues_a_retry():
    note, retry = pipeline.ocr_retry_note(None, 5, 20, SETTINGS)
    assert retry
    assert note == f"{db.OCR_INCOMPLETE} 5 of 20 text-less pages failed (attempt 1 of 3); the daily run retries them"


def test_the_attempt_count_carries_over_from_the_previous_note():
    previous, _ = pipeline.ocr_retry_note(None, 5, 20, SETTINGS)
    note, retry = pipeline.ocr_retry_note(previous, 2, 20, SETTINGS)
    assert retry and "(attempt 2 of 3)" in note


def test_gives_up_after_the_last_attempt_with_a_note_the_claim_ignores():
    second = f"{db.OCR_INCOMPLETE} 2 of 20 text-less pages failed (attempt 2 of 3); the daily run retries them"
    note, retry = pipeline.ocr_retry_note(second, 1, 20, SETTINGS)
    assert not retry
    assert note == "OCR gave up on 1 of 20 text-less pages after 3 attempts"
    assert not note.startswith(db.OCR_INCOMPLETE)


def test_other_errors_start_the_count_again():
    note, retry = pipeline.ocr_retry_note("Waiting for the daily OCR budget: 30 pages to read, 0 left today", 1, 30, SETTINGS)
    assert retry and "(attempt 1 of 3)" in note
