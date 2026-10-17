from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

# Bump when parsing or chunking changes in a way that should trigger a re-index.
PARSER_VERSION = "rag-1"


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


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
