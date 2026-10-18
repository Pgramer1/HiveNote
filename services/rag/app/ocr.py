"""Reads pages that have no text layer (scans, photos of handwriting, slides whose content is a picture)
with a vision model. The provider is configurable; on the comparison set Llama 4 Scout read handwriting
at about 8% character error and found 82% of diagram words (docs/DECISIONS.md, D-023)."""

import base64
import logging
import re
from dataclasses import dataclass

import httpx
import pymupdf

from app.config import Settings

log = logging.getLogger("rag.ocr")

DEFAULT_MODELS = {
    "cloudflare": "@cf/meta/llama-4-scout-17b-16e-instruct",
    "groq": "meta-llama/llama-4-scout-17b-16e-instruct",
}

PROMPT = (
    "Transcribe all text in this image exactly, keeping the reading order. "
    "Write formulas in plain text (e.g. x^2, sqrt(x)), and tables as rows with | between cells. "
    "If the image is only a photo, logo, illustration or QR code, output only the words visible in it. "
    "Output only the transcription, with no introduction or commentary."
)

_FENCE = re.compile(r"^\s*```[\w-]*\s*$")
_PREAMBLE = re.compile(r"^\s*(here is|here's|the transcription|transcription:)", re.IGNORECASE)
# Empty PowerPoint placeholders render their prompt when LibreOffice exports a deck to PDF.
_PLACEHOLDER = re.compile(r"^\s*click to add (title|text|subtitle|notes)\s*$", re.IGNORECASE)


class OcrError(Exception):
    pass


@dataclass
class OcrResult:
    text: str
    neurons: float | None = None  # Cloudflare reports usage in neurons; other providers don't


def render_page(doc: pymupdf.Document, page_number: int, max_side: int) -> bytes:
    """JPEG of a 1-based page, scaled so its longer side is at most `max_side` pixels."""
    page = doc[page_number - 1]
    zoom = min(max_side / max(page.rect.width, page.rect.height), 3.0)
    return page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom)).tobytes("jpeg", jpg_quality=85)


def clean_transcription(text: str) -> str:
    lines = [line for line in text.strip().splitlines() if not _FENCE.match(line) and not _PLACEHOLDER.match(line)]
    if lines and _PREAMBLE.match(lines[0]) and len(lines) > 1:
        lines = lines[1:]
    return "\n".join(lines).strip()


def _messages(image: bytes) -> list[dict]:
    data_url = "data:image/jpeg;base64," + base64.b64encode(image).decode()
    return [{"role": "user", "content": [
        {"type": "text", "text": PROMPT},
        {"type": "image_url", "image_url": {"url": data_url}},
    ]}]


def transcribe(image: bytes, settings: Settings, client: httpx.Client) -> OcrResult:
    provider = settings.ocr_provider
    model = settings.ocr_model or DEFAULT_MODELS.get(provider, "")
    if provider == "cloudflare":
        url = f"https://api.cloudflare.com/client/v4/accounts/{settings.cloudflare_account_id}/ai/run/{model}"
        res = client.post(
            url,
            headers={"Authorization": f"Bearer {settings.cloudflare_api_token}"},
            json={"messages": _messages(image), "max_tokens": settings.ocr_max_tokens, "temperature": 0},
        )
        body = res.json() if res.headers.get("content-type", "").startswith("application/json") else {}
        if res.status_code != 200 or not body.get("success"):
            raise OcrError(f"Cloudflare OCR failed ({res.status_code}): {res.text[:300]}")
        result = body["result"]
        text = result.get("response")
        if not isinstance(text, str):  # some models answer in the OpenAI shape
            text = (result.get("choices") or [{}])[0].get("message", {}).get("content") or ""
        return OcrResult(clean_transcription(text), (result.get("usage") or {}).get("neurons"))
    if provider == "groq":
        if not settings.groq_api_key:
            raise OcrError("OCR_PROVIDER=groq needs GROQ_API_KEY")
        res = client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.groq_api_key}"},
            json={"model": model, "messages": _messages(image), "max_completion_tokens": settings.ocr_max_tokens,
                  "temperature": 0},
        )
        if res.status_code != 200:
            raise OcrError(f"Groq OCR failed ({res.status_code}): {res.text[:300]}")
        return OcrResult(clean_transcription(res.json()["choices"][0]["message"]["content"] or ""))
    raise OcrError(f"Unknown OCR_PROVIDER {provider!r} (expected off, cloudflare or groq)")


def ocr_pages(pdf: bytes, pages: list[int], settings: Settings) -> tuple[dict[int, str], float]:
    """Transcribes the given 1-based pages. Returns {page: text} for pages that produced text, and the
    neurons used. A page that fails is logged and skipped, so one bad page never fails the document."""
    texts: dict[int, str] = {}
    neurons = 0.0
    with pymupdf.open(stream=pdf, filetype="pdf") as doc, httpx.Client(timeout=settings.ocr_timeout_seconds) as client:
        for number in pages:
            try:
                result = transcribe(render_page(doc, number, settings.ocr_max_image_side), settings, client)
            except Exception as exc:  # network, provider or render error: skip the page
                log.warning("OCR failed for page %s: %s", number, exc)
                continue
            neurons += result.neurons or 0.0
            if any(ch.isalnum() for ch in result.text):
                texts[number] = result.text
    return texts, neurons
