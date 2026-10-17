import logging
import secrets

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from app import pipeline
from app.config import PARSER_VERSION, get_settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

app = FastAPI(title="HiveNote RAG service", version=PARSER_VERSION)


def require_secret(authorization: str = Header(default="")) -> None:
    expected = f"Bearer {get_settings().rag_service_secret}"
    if not secrets.compare_digest(authorization.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="Unauthorized")


class IngestRequest(BaseModel):
    resource_id: str = Field(alias="resourceId", min_length=1, max_length=64)
    force: bool = False


@app.get("/health")
def health() -> dict:
    return {"ok": True, "parserVersion": PARSER_VERSION}


# Plain `def` endpoints run in FastAPI's thread pool, so a long PDF doesn't block /health.
@app.post("/ingest", dependencies=[Depends(require_secret)])
def ingest(body: IngestRequest) -> dict:
    """Indexes one resource and returns when done (typically a few seconds)."""
    return pipeline.ingest(body.resource_id, force=body.force).as_dict()


@app.post("/ingest/pending", dependencies=[Depends(require_secret)])
def ingest_pending(limit: int = 5) -> dict:
    """Indexes up to `limit` PENDING resources: retries and backfills (call from a scheduler)."""
    results = pipeline.ingest_pending(max(1, min(limit, 50)))
    return {"processed": len(results), "results": [r.as_dict() for r in results]}
