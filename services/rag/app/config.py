from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

# Bump when parsing or chunking changes in a way that should trigger a re-index.
PARSER_VERSION = "rag-2"  # rag-2: OCR for text-less PDF pages (D-023)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Neon direct (non-pooled) connection string, same database as the Next.js app.
    database_url: str
    cloudflare_account_id: str
    cloudflare_api_token: str
    # Shared secret the Next.js app sends as "Authorization: Bearer <secret>". Only the HTTP API needs it
    # (it refuses every request while unset); the CLI and the GitHub Actions indexer don't.
    rag_service_secret: str = ""

    embed_batch_size: int = 50
    max_download_bytes: int = 25 * 1024 * 1024
    # Chunk sizes are in characters (~4 characters per token for English).
    chunk_size: int = 1500
    chunk_overlap: int = 200
    # Slides shorter than this are merged into the next slide with the same title.
    min_slide_chars: int = 200
    # Pack consecutive pages under one heading into one chunk. Off: on the evaluation set,
    # page-level chunks ranked the right page first more often (docs/DECISIONS.md, D-016).
    pdf_pack_pages: bool = False
    # Prefix each embedded chunk with "title › section › page" (recall@5 97.1% with, 91.2% without).
    context_header: bool = True
    # Cap on Resource.extractedText, matching the old TypeScript pipeline.
    max_extracted_chars: int = 100_000

    # OCR for PDF pages without a text layer (scans, handwriting, picture-only slides): off | cloudflare | groq.
    ocr_provider: str = "cloudflare"
    # Empty: the provider's Llama 4 Scout (app/ocr.py DEFAULT_MODELS), the best model in D-023.
    ocr_model: str = ""
    groq_api_key: str = ""
    # Cloudflare's free plan gives 10,000 neurons a day, shared with embeddings; an OCR page costs ~55-105.
    # 60 pages (~5,000 neurons) leaves the other half for embeddings. Over budget, a resource waits a day.
    ocr_daily_page_budget: int = 60
    # Pages after this many in one document are left unread (clamped to the daily budget).
    ocr_max_pages_per_document: int = 40
    ocr_max_image_side: int = 1600
    ocr_max_tokens: int = 2000
    ocr_timeout_seconds: float = 120


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
