import { createGroq } from "@ai-sdk/groq";
import { streamText } from "ai";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages, resourceId } = await req.json();

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: { title: true, type: true, extractedText: true },
    });

    if (!resource) {
      return new Response("Resource not found", { status: 404 });
    }

    const systemPrompt = resource.extractedText
      ? `You are a helpful AI study assistant. The student is studying a document titled "${resource.title}".
Use the document content below to answer accurately. Be concise and educational.
If the answer isn't in the document, say so and help from general knowledge.

--- DOCUMENT CONTENT ---
${resource.extractedText}
--- END OF DOCUMENT ---`
      : `You are a helpful AI study assistant. The student is asking about a resource titled "${resource.title}" (type: ${resource.type}). Answer helpfully using general knowledge.`;

    const result = streamText({
      model: groq("llama-3.3-70b-versatile"),
      system: systemPrompt,
      messages,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (streamErr) {
          console.error("[Chat Stream Error]", streamErr);
          const msg = streamErr instanceof Error ? streamErr.message : "Unknown AI error";
          // Surface the error as text so the client can display it
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
