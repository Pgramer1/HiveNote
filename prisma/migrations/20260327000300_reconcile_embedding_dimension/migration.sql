-- Reconcile embedding dimension with current production data
ALTER TABLE "ResourceChunk"
ALTER COLUMN "embedding" TYPE vector(1024)
USING "embedding"::vector(1024);
