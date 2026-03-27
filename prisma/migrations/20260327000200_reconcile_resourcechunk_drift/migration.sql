-- Reconcile existing manual ResourceChunk changes with migration history (non-destructive)

-- Ensure pageNumber exists
ALTER TABLE "ResourceChunk"
ADD COLUMN IF NOT EXISTS "pageNumber" INTEGER;

-- Ensure ANN index exists
CREATE INDEX IF NOT EXISTS "ResourceChunk_embedding_hnsw_idx"
ON "ResourceChunk"
USING hnsw ("embedding" vector_cosine_ops);
