import { prisma } from "@/lib/prisma";

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN!;
const CF_EMBED_URL = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/baai/bge-m3`;

export async function embedText(text: string): Promise<number[]> {
  const res = await fetch(CF_EMBED_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: [text] }),
  });

  if (!res.ok) throw new Error(`Cloudflare embedding failed: ${await res.text()}`);

  const json = await res.json() as { result: { data: number[][] }; success: boolean };
  if (!json.success) throw new Error("Cloudflare embedding returned success=false");
  return json.result.data[0];
}

export type ChunkWithPage = {
  content: string;
  pageNumber: number | null;
  chunkIndex: number;
};

// PDF-aware chunking: preserves page number per chunk
export function chunkPdfPages(
  pages: { text: string; pageNumber: number }[],
  chunkSize = 400,
  overlap = 40
): ChunkWithPage[] {
  const chunks: ChunkWithPage[] = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const words = page.text.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const content = words.slice(i, i + chunkSize).join(" ");
      if (content.trim()) {
        chunks.push({ content, pageNumber: page.pageNumber, chunkIndex });
        chunkIndex++;
      }
      if (i + chunkSize >= words.length) break;
    }
  }

  return chunks;
}

// Plain chunking for PPT/fallback (no page info)
export function chunkText(text: string, chunkSize = 400, overlap = 40): ChunkWithPage[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: ChunkWithPage[] = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const content = words.slice(i, i + chunkSize).join(" ");
    if (content.trim()) {
      chunks.push({ content, pageNumber: null, chunkIndex: chunks.length });
    }
    if (i + chunkSize >= words.length) break;
  }

  return chunks;
}

export async function embedChunksAndStore(
  resourceId: string,
  chunks: ChunkWithPage[]
) {
  await prisma.resourceChunk.deleteMany({ where: { resourceId } });

  console.log(`[RAG] Embedding ${chunks.length} chunks for resource ${resourceId}`);

  for (const chunk of chunks) {
    const embedding = await embedText(chunk.content);
    const vectorStr = `[${embedding.join(",")}]`;

    await prisma.$executeRaw`
      INSERT INTO "ResourceChunk" (id, "resourceId", content, embedding, "chunkIndex", "pageNumber", "createdAt")
      VALUES (
        gen_random_uuid()::text,
        ${resourceId},
        ${chunk.content},
        ${vectorStr}::vector,
        ${chunk.chunkIndex},
        ${chunk.pageNumber},
        NOW()
      )
    `;
  }

  console.log(`[RAG] Done — stored ${chunks.length} chunks for resource ${resourceId}`);
}