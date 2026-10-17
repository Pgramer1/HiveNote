// Client for the Python RAG service (services/rag), which parses, chunks and embeds files.

export function ragServiceConfigured(): boolean {
  return Boolean(process.env.RAG_SERVICE_URL && process.env.RAG_SERVICE_SECRET);
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
 * Asks the service to index one resource and waits for it (typically seconds). Never throws:
 * on failure the resource keeps its PENDING/FAILED status and can be retried later.
 */
export async function requestIndexing(
  resourceId: string,
  { force = false, timeoutMs = 55_000 }: { force?: boolean; timeoutMs?: number } = {}
): Promise<IndexingResult | null> {
  if (!ragServiceConfigured()) return null;
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
