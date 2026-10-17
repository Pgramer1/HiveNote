import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dispatchIndexingWorkflow, indexingMode, queueIndexing } from "./rag-service";

const ENV = [
  "RAG_SERVICE_URL",
  "RAG_SERVICE_SECRET",
  "RAG_INDEX_GITHUB_TOKEN",
  "RAG_INDEX_GITHUB_REPO",
  "RAG_INDEX_GITHUB_WORKFLOW",
  "RAG_INDEX_GITHUB_REF",
];

beforeEach(() => {
  for (const key of ENV) vi.stubEnv(key, "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function stubGithub() {
  vi.stubEnv("RAG_INDEX_GITHUB_TOKEN", "ghp_test");
  vi.stubEnv("RAG_INDEX_GITHUB_REPO", "owner/repo");
}

describe("indexingMode", () => {
  it("is null when nothing is configured", () => {
    expect(indexingMode()).toBeNull();
  });

  it("needs both the token and the repo for GitHub", () => {
    vi.stubEnv("RAG_INDEX_GITHUB_TOKEN", "ghp_test");
    expect(indexingMode()).toBeNull();
    vi.stubEnv("RAG_INDEX_GITHUB_REPO", "owner/repo");
    expect(indexingMode()).toBe("github");
  });

  it("prefers the HTTP service when both are configured", () => {
    stubGithub();
    vi.stubEnv("RAG_SERVICE_URL", "https://rag.example.com");
    vi.stubEnv("RAG_SERVICE_SECRET", "secret");
    expect(indexingMode()).toBe("service");
  });
});

describe("dispatchIndexingWorkflow", () => {
  it("starts the workflow on main with the resource id", async () => {
    stubGithub();
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    expect(await dispatchIndexingWorkflow("res123")).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.github.com/repos/owner/repo/actions/workflows/rag-index.yml/dispatches");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer ghp_test");
    expect(JSON.parse(init.body)).toEqual({ ref: "main", inputs: { resource_id: "res123" } });
  });

  it("honours a custom workflow file and ref", async () => {
    stubGithub();
    vi.stubEnv("RAG_INDEX_GITHUB_WORKFLOW", "other.yml");
    vi.stubEnv("RAG_INDEX_GITHUB_REF", "feature/x");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await dispatchIndexingWorkflow("res123");
    expect(fetchMock.mock.calls[0][0]).toContain("/actions/workflows/other.yml/dispatches");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).ref).toBe("feature/x");
  });

  it("returns false instead of throwing when GitHub refuses or is unreachable", async () => {
    stubGithub();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Bad credentials", { status: 401 })));
    expect(await dispatchIndexingWorkflow("res123")).toBe(false);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    expect(await dispatchIndexingWorkflow("res123")).toBe(false);
  });
});

describe("queueIndexing", () => {
  it("does nothing when no indexer is configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await queueIndexing("res123");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls the HTTP service in service mode", async () => {
    vi.stubEnv("RAG_SERVICE_URL", "https://rag.example.com/");
    vi.stubEnv("RAG_SERVICE_SECRET", "secret");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ status: "READY" }));
    vi.stubGlobal("fetch", fetchMock);
    await queueIndexing("res123");
    expect(fetchMock.mock.calls[0][0]).toBe("https://rag.example.com/ingest");
  });
});
