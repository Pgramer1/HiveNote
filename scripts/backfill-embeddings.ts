// scripts/backfill-embeddings.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Inline the functions here to avoid Next.js module resolution issues in scripts

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!;
const CF_EMBED_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/baai/bge-m3`;

async function embedText(text: string): Promise<number[]> {
  const res = await fetch(CF_EMBED_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${CF_API_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: [text] }),
  });
  if (!res.ok) throw new Error(`Embed failed: ${await res.text()}`);
  const json = await res.json() as any;
  return json.result.data[0];
}

function chunkText(text: string, chunkSize = 400, overlap = 40) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: { content: string; pageNumber: null; chunkIndex: number }[] = [];
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const content = words.slice(i, i + chunkSize).join(" ");
    if (content.trim()) chunks.push({ content, pageNumber: null, chunkIndex: chunks.length });
    if (i + chunkSize >= words.length) break;
  }
  return chunks;
}

async function main() {
  // Find resources with extractedText but no chunks
  const resources = await prisma.resource.findMany({
    where: {
      extractedText: { not: null },
      chunks: { none: {} },
    },
    select: { id: true, title: true, extractedText: true },
  });

  console.log(`Found ${resources.length} resources to backfill`);

  for (const resource of resources) {
    console.log(`\nProcessing: "${resource.title}" (${resource.id})`);
    try {
      const chunks = chunkText(resource.extractedText!);
      console.log(`  ${chunks.length} chunks`);

      await prisma.resourceChunk.deleteMany({ where: { resourceId: resource.id } });

      for (const chunk of chunks) {
        const embedding = await embedText(chunk.content);
        const vectorStr = `[${embedding.join(",")}]`;
        await prisma.$executeRaw`
          INSERT INTO "ResourceChunk" (id, "resourceId", content, embedding, "chunkIndex", "pageNumber", "createdAt")
          VALUES (gen_random_uuid()::text, ${resource.id}, ${chunk.content}, ${vectorStr}::vector, ${chunk.chunkIndex}, ${chunk.pageNumber}, NOW())
        `;
      }
      console.log(`  Done`);
    } catch (err) {
      console.error(`  Failed:`, err);
    }
  }

  console.log("\nBackfill complete");
  await pool.end();
}

main();