import json

import httpx
import pymupdf
import pytest

from app import ocr
from app.config import Settings


def settings(**overrides) -> Settings:
    base = dict(database_url="postgresql://unused/unused", cloudflare_account_id="acct",
                cloudflare_api_token="cf-token", ocr_provider="cloudflare")
    return Settings(**{**base, **overrides})


def client(handler) -> httpx.Client:
    return httpx.Client(transport=httpx.MockTransport(handler))


def test_clean_transcription_drops_fences_and_a_preamble():
    assert ocr.clean_transcription("```\nx = 1\n```") == "x = 1"
    assert ocr.clean_transcription("Here is the transcription:\nAssignment 2") == "Assignment 2"
    assert ocr.clean_transcription("Here we go") == "Here we go"  # a one-line page is kept as is
    assert ocr.clean_transcription("Click to add Title\n\nGradient Descent - step size") == "Gradient Descent - step size"


def test_render_page_is_a_jpeg_within_the_size_limit(lecture_pdf):
    with pymupdf.open(stream=lecture_pdf, filetype="pdf") as doc:
        image = ocr.render_page(doc, 1, 800)
    assert image[:2] == b"\xff\xd8"
    pix = pymupdf.Pixmap(image)
    assert max(pix.width, pix.height) <= 800


def test_cloudflare_request_and_response():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["auth"] = request.headers["authorization"]
        seen["body"] = json.loads(request.content)
        return httpx.Response(200, json={"success": True, "result": {
            "response": "Q1) x = 2", "usage": {"neurons": 77.5}}})

    result = ocr.transcribe(b"jpeg-bytes", settings(), client(handler))

    assert seen["url"].endswith("/accounts/acct/ai/run/@cf/meta/llama-4-scout-17b-16e-instruct")
    assert seen["auth"] == "Bearer cf-token"
    content = seen["body"]["messages"][0]["content"]
    assert content[0]["text"] == ocr.PROMPT
    assert content[1]["image_url"]["url"].startswith("data:image/jpeg;base64,")
    assert (result.text, result.neurons) == ("Q1) x = 2", 77.5)


def test_cloudflare_error_raises():
    handler = lambda request: httpx.Response(403, json={"success": False, "errors": [{"message": "plan"}]})
    with pytest.raises(ocr.OcrError, match="403"):
        ocr.transcribe(b"jpeg", settings(), client(handler))


def test_groq_uses_its_own_key_and_model():
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"], seen["auth"] = str(request.url), request.headers["authorization"]
        seen["model"] = json.loads(request.content)["model"]
        return httpx.Response(200, json={"choices": [{"message": {"content": "Waiting"}}]})

    result = ocr.transcribe(b"jpeg", settings(ocr_provider="groq", groq_api_key="gsk"), client(handler))
    assert seen == {"url": "https://api.groq.com/openai/v1/chat/completions", "auth": "Bearer gsk",
                    "model": "meta-llama/llama-4-scout-17b-16e-instruct"}
    assert (result.text, result.neurons) == ("Waiting", None)


def test_groq_without_a_key_and_unknown_providers_raise():
    with pytest.raises(ocr.OcrError, match="GROQ_API_KEY"):
        ocr.transcribe(b"jpeg", settings(ocr_provider="groq"), client(lambda r: httpx.Response(500)))
    with pytest.raises(ocr.OcrError, match="Unknown OCR_PROVIDER"):
        ocr.transcribe(b"jpeg", settings(ocr_provider="tesseract"), client(lambda r: httpx.Response(500)))


def test_ocr_pages_skips_failed_and_empty_pages(lecture_pdf, monkeypatch):
    replies = {1: ocr.OcrResult("page one text", 60.0), 2: RuntimeError("timeout"), 3: ocr.OcrResult("  ", 55.0)}
    calls = iter([1, 2, 3])

    def fake_transcribe(image, s, c):
        reply = replies[next(calls)]
        if isinstance(reply, Exception):
            raise reply
        return reply

    monkeypatch.setattr(ocr, "transcribe", fake_transcribe)
    texts, neurons = ocr.ocr_pages(lecture_pdf, [1, 2, 3], settings())
    assert texts == {1: "page one text"}
    assert neurons == 115.0  # a page with no text still cost neurons
