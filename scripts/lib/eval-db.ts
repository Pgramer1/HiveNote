// Database setup shared by the eval scripts.
//
// The scripts call the app's own retrieval code (src/lib/rag.ts) so the numbers measure exactly
// what /api/chat does. That code uses the singleton in src/lib/prisma.ts, which reuses
// globalThis.prisma / globalThis.pool when they are already set. We set them here, before the
// app modules are imported, so retrieval runs on our connection: EVAL_DATABASE_URL instead of
// DATABASE_URL, no query logging, and (for the eval) a read-only session.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

export type EvalDb = {
  prisma: PrismaClient;
  pool: Pool;
  /** host/database, without credentials, for logs and result files. */
  label: string;
  close: () => Promise<void>;
};

export function requireEvalDatabaseUrl(): URL {
  const raw = process.env.EVAL_DATABASE_URL;
  if (!raw) {
    throw new Error(
      "EVAL_DATABASE_URL is not set. Point it at the database to evaluate (see eval/README.md). " +
        "DATABASE_URL from .env is deliberately not used."
    );
  }
  return new URL(raw);
}

export function isLocalHost(url: URL): boolean {
  return ["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname);
}

export async function connectEvalDb({ readOnly }: { readOnly: boolean }): Promise<EvalDb> {
  const url = requireEvalDatabaseUrl();

  if (readOnly && url.hostname.includes("-pooler")) {
    // Session settings (the read-only flag below) are unreliable through PgBouncer in
    // transaction mode and could leak onto connections the app is using.
    throw new Error(
      `EVAL_DATABASE_URL uses a pooled Neon host (${url.hostname}). Use the direct connection ` +
        `string instead (the host without "-pooler", same as DIRECT_URL).`
    );
  }

  // Anything else that reads DATABASE_URL in this process must get the eval database too.
  process.env.DATABASE_URL = url.toString();

  // default_transaction_read_only is sent as a startup option, so every connection the pool
  // opens is read-only from its first query: a write anywhere in the retrieval path fails
  // instead of changing data. Checked below with SHOW. It goes into the URL rather than the
  // Pool config because pg lets URL parameters override the config, and Neon URLs may already
  // carry options=endpoint%3D...
  const connUrl = new URL(url);
  if (readOnly) {
    const existing = connUrl.searchParams.get("options");
    const readOnlyOption = "-c default_transaction_read_only=on";
    connUrl.searchParams.set("options", existing ? `${existing} ${readOnlyOption}` : readOnlyOption);
  }
  const pool = new Pool({ connectionString: connUrl.toString(), max: 2 });

  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  Object.assign(globalThis, { prisma, pool });

  // Fail loudly if src/lib/prisma.ts would not pick up our client (e.g. its singleton changed).
  const lib = await import("../../src/lib/prisma");
  if (lib.prisma !== prisma) {
    await pool.end();
    throw new Error("src/lib/prisma.ts did not reuse the eval Prisma client; refusing to continue.");
  }

  if (readOnly) {
    const [row] = await prisma.$queryRaw<{ transaction_read_only: string }[]>`SHOW transaction_read_only`;
    if (row?.transaction_read_only !== "on") {
      await pool.end();
      throw new Error("Could not make the database session read-only; refusing to continue.");
    }
  }

  return {
    prisma,
    pool,
    label: `${url.hostname}${url.pathname}`,
    close: async () => {
      await prisma.$disconnect();
      await pool.end();
    },
  };
}
