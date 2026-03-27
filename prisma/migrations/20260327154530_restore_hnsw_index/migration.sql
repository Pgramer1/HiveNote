-- Restore ANN index on vector column for fast semantic retrieval
CREATE INDEX IF NOT EXISTS "ResourceChunk_embedding_hnsw_idx"
ON "ResourceChunk"
USING hnsw ("embedding" vector_cosine_ops);
