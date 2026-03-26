import { createGroq } from "@ai-sdk/groq";
import { streamText } from "ai";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getRelevantChunks, type SourceChunk } from "@/lib/rag";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) return new Response("Unauthorized", { status: 401 });

    const { messages, resourceId } = await req.json();

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: { title: true, type: true, extractedText: true },
    });

    if (!resource) return new Response("Resource not found", { status: 404 });

    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === "user");
    const query = typeof lastUserMessage?.content === "string" ? lastUserMessage.content : "";

    let systemPrompt: string;
    let sources: SourceChunk[] = [];

    if (resource.extractedText && query) {
      sources = await getRelevantChunks(resourceId, query).catch(() => []);

      systemPrompt = sources.length > 0
        ? `You are a helpful AI study assistant. The student is studying "${resource.title}".
Answer using the relevant excerpts below. Be concise and educational.
If the answer isn't in the excerpts, say so and help from general knowledge.

--- RELEVANT EXCERPTS ---
${sources.map((s, i) => `[Excerpt ${i + 1}${s.pageNumber ? ` · p.${s.pageNumber}` : ""}]\n${s.content}`).join("\n\n---\n\n")}
--- END EXCERPTS ---`
        : `You are a helpful AI study assistant for "${resource.title}". Answer from general knowledge.`;
    } else {
      systemPrompt = `You are a helpful AI study assistant for "${resource.title}" (${resource.type}). Answer helpfully.`;
    }

    const result = streamText({
      model: groq("llama-3.3-70b-versatile"),
      system: systemPrompt,
      messages,
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

        try {
          for await (const chunk of result.textStream) {
            controller.enqueue(encoder.encode(chunk));
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