-- Phase 1: indexing status per resource, richer chunk metadata, and full-text search.
-- Hand-edited: Prisma can't express the generated tsvector column or the GIN index.

-- CreateEnum
CREATE TYPE "IndexStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "indexError" TEXT,
ADD COLUMN     "indexStatus" "IndexStatus",
ADD COLUMN     "indexedAt" TIMESTAMP(3),
ADD COLUMN     "parserVersion" TEXT;

-- AlterTable
ALTER TABLE "ResourceChunk" ADD COLUMN     "chunkType" TEXT,
ADD COLUMN     "sectionTitle" TEXT,
ADD COLUMN     "contentTsv" tsvector GENERATED ALWAYS AS (to_tsvector('english', "content")) STORED;

-- CreateIndex
CREATE INDEX "Resource_indexStatus_idx" ON "Resource"("indexStatus");

-- CreateIndex
CREATE INDEX "ResourceChunk_contentTsv_gin_idx" ON "ResourceChunk" USING GIN ("contentTsv");

-- Backfill: files that already have chunks were indexed by the old TypeScript pipeline;
-- the rest are queued for the Python service. Links stay NULL (nothing to index).
UPDATE "Resource" r
SET "indexStatus" = CASE
      WHEN EXISTS (SELECT 1 FROM "ResourceChunk" k WHERE k."resourceId" = r."id") THEN 'READY'::"IndexStatus"
      ELSE 'PENDING'::"IndexStatus"
    END,
    "parserVersion" = CASE
      WHEN EXISTS (SELECT 1 FROM "ResourceChunk" k WHERE k."resourceId" = r."id") THEN 'legacy-ts'
      ELSE NULL
    END
WHERE r."type" IN ('PDF', 'PPT');
