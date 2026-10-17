// Hands uploaded files to the Python RAG indexer (services/rag), which parses, chunks and embeds them.
// Two ways to reach it:
// - "service": a deployed HTTP service (RAG_SERVICE_URL + RAG_SERVICE_SECRET), indexes in seconds.
// - "github": starts the .github/workflows/rag-index.yml run for the resource through the GitHub API
//   (RAG_INDEX_GITHUB_TOKEN + RAG_INDEX_GITHUB_REPO), indexes in a few minutes, needs no server.
// With neither set, createResource keeps the old in-process TypeScript extraction.

export type IndexingMode = "service" | "github";

export function indexingMode(): IndexingMode | null {
  if (process.env.RAG_SERVICE_URL && process.env.RAG_SERVICE_SECRET) return "service";
  if (process.env.RAG_INDEX_GITHUB_TOKEN && process.env.RAG_INDEX_GITHUB_REPO) return "github";
  return null;
}

/** True when something outside this process indexes files (they stay PENDING until it does). */
export function indexingConfigured(): boolean {
  return indexingMode() !== null;
}

export type IndexingResult = {
  resource_id: string;
  status: "READY" | "FAILED" | "SKIPPED";
  chunks: number;
  pages: number;
  empty_pages: number;
  error: string | null;
  seconds: number;
};

/**
 * Asks the indexer to process one resource. Never throws: on failure the resource stays PENDING,
 * and the daily workflow run (or `/ingest/pending`) retries it.
 */
export async function queueIndexing(resourceId: string): Promise<void> {
  const mode = indexingMode();
  if (mode === "service") await requestIndexing(resourceId);
  else if (mode === "github") await dispatchIndexingWorkflow(resourceId);
}

/** Calls the HTTP service and waits for it (typically seconds). */
export async function requestIndexing(
  resourceId: string,
  { force = false, timeoutMs = 55_000 }: { force?: boolean; timeoutMs?: number } = {}
): Promise<IndexingResult | null> {
  if (indexingMode() !== "service") return null;
  try {
    const res = await fetch(`${process.env.RAG_SERVICE_URL!.replace(/\/$/, "")}/ingest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RAG_SERVICE_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ resourceId, force }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      console.error("[RAG service] /ingest failed", res.status, await res.text().catch(() => ""));
      return null;
    }
    return (await res.json()) as IndexingResult;
  } catch (err) {
    console.error("[RAG service] /ingest unreachable for", resourceId, err);
    return null;
  }
}

/**
 * Starts the indexing workflow for one resource and returns once GitHub accepts it (the run
 * itself takes a few minutes). The token needs only "Actions: write" on this one repository.
 */
export async function dispatchIndexingWorkflow(resourceId: string): Promise<boolean> {
  if (indexingMode() !== "github") return false;
  const repo = process.env.RAG_INDEX_GITHUB_REPO!;
  const workflow = process.env.RAG_INDEX_GITHUB_WORKFLOW || "rag-index.yml";
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RAG_INDEX_GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: process.env.RAG_INDEX_GITHUB_REF || "main",
        inputs: { resource_id: resourceId },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error("[RAG workflow] dispatch failed", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[RAG workflow] dispatch unreachable for", resourceId, err);
    return false;
  }
}
