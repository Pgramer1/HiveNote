import { createGroq } from "@ai-sdk/groq";
import { streamText } from "ai";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getRelevantChunks, type SourceChunk } from "@/lib/rag";
import { planRetrieval } from "@/lib/page-refs";
import { getOverviewChunks, getPageChunks, getPageCount } from "@/lib/page-retrieval";
import { buildChatSystemPrompt, type PassageFocus } from "@/lib/chat-system-prompt";
import { CHAT_MODEL } from "@/lib/chat-model";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
export const maxDuration = 30;

async function authorizeChatAccess(resourceId: string) {
  const session = await getSession();
  if (!session?.user?.email) {
    return { error: new Response("Unauthorized", { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, isUniversityEmail: true, university: true },
  });

  if (!user?.isUniversityEmail) {
    return { error: new Response("Forbidden", { status: 403 }) };
  }

  const resource = await prisma.resource.findUnique({
    where: { id: resourceId },
    select: { id: true, title: true, type: true, extractedText: true, university: true },
  });

  if (!resource) {
    return { error: new Response("Resource not found", { status: 404 }) };
  }

  if (resource.university && user.university && resource.university !== user.university) {
    return { error: new Response("Forbidden", { status: 403 }) };
  }

  return { user, resource };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const resourceId = searchParams.get("resourceId");

    if (!resourceId) {
      return new Response("Missing resourceId", { status: 400 });
    }

    const auth = await authorizeChatAccess(resourceId);
    if ("error" in auth) return auth.error;

    const messages = await prisma.chatMessage.findMany({
      where: {
        userId: auth.user.id,
        resourceId,
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    return Response.json({ messages });
  } catch (err) {
    console.error("[Chat History API Error]", err);
    return new Response("Internal server error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { messages, resourceId } = await req.json();
    if (!resourceId) {
      return new Response("Missing resourceId", { status: 400 });
    }

    const auth = await authorizeChatAccess(resourceId);
    if ("error" in auth) return auth.error;
    const { user, resource } = auth;

    const normalizedMessages = Array.isArray(messages)
      ? (messages as Array<{ role?: string; content?: unknown }>)
      : [];
    const lastUserMessage = [...normalizedMessages].reverse().find((m) => m.role === "user");
    const query = typeof lastUserMessage?.content === "string" ? lastUserMessage.content : "";

    if (!query.trim()) {
      return new Response("Missing user message", { status: 400 });
    }

    // Persist the latest user message, avoiding accidental duplicates on retries.
    const latestStoredMessage = await prisma.chatMessage.findFirst({
      where: {
        userId: user.id,
        resourceId,
      },
      orderBy: { createdAt: "desc" },
      select: { role: true, content: true },
    });

    if (!(latestStoredMessage?.role === "user" && latestStoredMessage.content === query)) {
      await prisma.chatMessage.create({
        data: {
          userId: user.id,
          resourceId,
          role: "user",
          content: query,
        },
      });
    }

    const searchable = Boolean(resource.extractedText);
    let sources: SourceChunk[] = [];
    let focus: PassageFocus = { kind: "search" };
    let pageCount: number | null = null;

    if (searchable) {
      try {
        pageCount = await getPageCount(resourceId);
        const plan = planRetrieval(query);
        // Page lookups need stored page numbers; older resources without them fall back to search.
        if (plan.kind === "pages" && pageCount !== null) {
          const pages = [...new Set([...plan.pages, ...(plan.last ? [pageCount] : [])])].sort((a, b) => a - b);
          sources = await getPageChunks(resourceId, pages);
          const found = new Set(sources.map((s) => s.pageNumber));
          focus = { kind: "pages", pages, missing: pages.filter((p) => !found.has(p)) };
        } else if (plan.kind === "overview") {
          sources = await getOverviewChunks(resourceId);
          focus = { kind: "overview" };
        } else {
          sources = await getRelevantChunks(resourceId, query);
        }
      } catch (err) {
        console.error("[RAG] Retrieval failed for resource", resourceId, err);
        sources = [];
        focus = { kind: "search" };
      }
    }

    const systemPrompt = buildChatSystemPrompt({ title: resource.title, searchable, pageCount, sources, focus });

    // streamText doesn't throw provider errors (e.g. an unknown model) from
    // textStream; it reports them here and ends the stream empty.
    let streamError: unknown;
    const result = streamText({
      model: groq(CHAT_MODEL),
      system: systemPrompt,
      onError: ({ error }) => {
        streamError = error;
        console.error("[Chat API] Model stream failed", CHAT_MODEL, error);
      },
      messages: normalizedMessages
        .filter((m): m is { role: "user" | "assistant"; content: string } =>
          (m.role === "user" || m.role === "assistant") && typeof m.content === "string"
        )
        .map((m) => ({ role: m.role, content: m.content })),
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // First line: sources as JSON (client splits on first \n)
        const sourcesLine = JSON.stringify({
          type: "sources",
          sources: sources.map(s => ({ pageNumber: s.pageNumber })),
        });
        controller.enqueue(encoder.encode(sourcesLine + "\n"));

        let assistantContent = "";

        try {
          for await (const chunk of result.textStream) {
            assistantContent += chunk;
            controller.enqueue(encoder.encode(chunk));
          }
          if (streamError) throw streamError;

          if (assistantContent.trim()) {
            await prisma.chatMessage.create({
              data: {
                userId: user.id,
                resourceId,
                role: "assistant",
                content: assistantContent,
              },
            });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          controller.enqueue(encoder.encode(`\n[AI Error: ${msg}]`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    console.error("[Chat API Error]", err);
    return new Response("Internal server error", { status: 500 });
  }
}