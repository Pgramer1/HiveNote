import httpx

from app.config import get_settings

MODEL = "@cf/baai/bge-m3"  # 1024 dimensions; must match ResourceChunk.embedding and /api/chat


class EmbeddingError(Exception):
    pass


def embed_texts(texts: list[str], client: httpx.Client | None = None) -> list[list[float]]:
    """Embeds texts with Cloudflare Workers AI in batches, preserving order."""
    settings = get_settings()
    url = f"https://api.cloudflare.com/client/v4/accounts/{settings.cloudflare_account_id}/ai/run/{MODEL}"
    headers = {"Authorization": f"Bearer {settings.cloudflare_api_token}"}
    own_client = client is None
    client = client or httpx.Client(timeout=60)
    try:
        vectors: list[list[float]] = []
        for start in range(0, len(texts), settings.embed_batch_size):
            batch = texts[start : start + settings.embed_batch_size]
            res = client.post(url, headers=headers, json={"text": batch})
            if res.status_code != 200:
                raise EmbeddingError(f"Cloudflare embedding failed ({res.status_code}): {res.text[:300]}")
            body = res.json()
            data = body.get("result", {}).get("data") if body.get("success") else None
            if not isinstance(data, list) or len(data) != len(batch):
                raise EmbeddingError(f"Cloudflare returned {len(data or [])} vectors for {len(batch)} texts")
            vectors.extend(data)
        return vectors
    finally:
        if own_client:
            client.close()
