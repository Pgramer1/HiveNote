// scripts/eval-seed-synthetic.ts
//
// Seeds two small synthetic resources (eval/synthetic/resources.json) into a LOCAL database so
// the eval harness can be smoke-tested end to end:
//
//   EVAL_DATABASE_URL=postgresql://postgres:test@localhost:55432/postgres pnpm exec tsx scripts/eval-seed-synthetic.ts
//   EVAL_DATABASE_URL=... pnpm eval --questions eval/synthetic/questions.jsonl --label synthetic
//
// Chunks and embeds with the app's own code (src/lib/embeddings.ts), the same way an upload
// does: per-page chunks for the PDF, page-less chunks for the PPT. Calls Cloudflare once per chunk.
// Refuses to run against anything but localhost: this script writes.
import * as dotenv from "dotenv";
dotenv.config({ path: ".env", quiet: true });

import { readFileSync } from "node:fs";
import { connectEvalDb, isLocalHost, requireEvalDatabaseUrl } from "./lib/eval-db";

type Fixture = {
  pdf: { id: string; title: string; pages: string[] };
  ppt: { id: string; title: string; slides: string[] };
};

const USER_ID = "eval_synthetic_user";

async function main() {
  const url = requireEvalDatabaseUrl();
  if (!isLocalHost(url)) {
    throw new Error(`Refusing to seed ${url.hostname}: this script only writes to a local database.`);
  }

  const fixture = JSON.parse(readFileSync("eval/synthetic/resources.json", "utf8")) as Fixture;
  const db = await connectEvalDb({ readOnly: false });
  try {
    const { chunkPdfPages, chunkText, embedChunksAndStore } = await import("../src/lib/embeddings");
    const { prisma } = db;

    await prisma.user.upsert({
      where: { id: USER_ID },
      create: { id: USER_ID, email: `${USER_ID}@eval.local`, name: "Eval synthetic" },
      update: {},
    });

    const pdfPages = fixture.pdf.pages.map((text, i) => ({ text, pageNumber: i + 1 }));
    const pptText = fixture.ppt.slides.join("\n");

    for (const [r, type, text, chunks] of [
      [fixture.pdf, "PDF", pdfPages.map((p) => p.text).join("\n\n"), chunkPdfPages(pdfPages)],
      [fixture.ppt, "PPT", pptText, chunkText(pptText)],
    ] as const) {
      await prisma.resource.upsert({
        where: { id: r.id },
        create: { id: r.id, title: r.title, type, fileUrl: "https://example.com/eval", uploadedBy: USER_ID, extractedText: text },
        update: { title: r.title, type, extractedText: text },
      });
      await embedChunksAndStore(r.id, chunks);
      console.log(`Seeded ${type} ${r.id}: ${chunks.length} chunks`);
    }
  } finally {
    await db.close();
  }
}

main().catch((err) => {
  console.error(`Seed failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
