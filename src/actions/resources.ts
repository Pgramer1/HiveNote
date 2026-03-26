"use server";

import { prisma } from "@/lib/prisma";
import cloudinary from "@/lib/cloudinary";
import { getSession } from "@/lib/auth";
import { embedChunksAndStore, chunkPdfPages, chunkText, type ChunkWithPage } from "@/lib/embeddings";

export async function createResource(formData: FormData) {
  const session = await getSession();
  if (!session?.user?.email) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) throw new Error("User not found");

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const type = formData.get("type") as "PDF" | "PPT" | "LINK";
  const link = formData.get("link") as string | null;
  const file = formData.get("file") as File | null;
  const department = formData.get("department") as string | null;
  const batch = formData.get("batch") as string | null;
  const semesterStr = formData.get("semester") as string | null;
  const semester = semesterStr ? parseInt(semesterStr) : null;
  const university = formData.get("university") as string | null;
  const subjectId = formData.get("subject") as string | null;

  let finalUrl = "";
  let extractedText: string | null = null;
  let chunksToEmbed: ChunkWithPage[] = [];

  if ((type === "PDF" || type === "PPT") && file && file.size > 0) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ── PDF extraction ──────────────────────────────────────────────
if (type === "PDF") {
  try {
    const { default: pdfParse } = await import("pdf-parse");

    const pageTexts: string[] = [];
    await pdfParse(buffer, {
      pagerender: async (pageData: any) => {
        const content = await pageData.getTextContent();
        const pageStr = content.items.map((item: any) => item.str).join(" ");
        pageTexts.push(pageStr);
        return pageStr;
      },
    });

    if (pageTexts.length > 0) {
      extractedText = pageTexts.join("\n\n").slice(0, 100000) || null;
      const pages = pageTexts.map((text, i) => ({ text, pageNumber: i + 1 }));
      chunksToEmbed = chunkPdfPages(pages);
    }
  } catch (err) {
    console.error("[PDF Extract] Per-page failed, trying fallback:", err);
    try {
      const { default: pdfParse } = await import("pdf-parse");
      const parsed = await pdfParse(buffer);
      extractedText = parsed.text?.slice(0, 100000) || null;
      if (extractedText) chunksToEmbed = chunkText(extractedText);
    } catch (fallbackErr) {
      console.error("[PDF Extract] Fallback also failed:", fallbackErr);
    }
  }
}

    // ── PPT extraction ──────────────────────────────────────────────
    if (type === "PPT") {
      try {
        const raw = buffer.toString("utf-8", 0, Math.min(buffer.length, 500000));
        const matches = raw.match(/[\x20-\x7E]{20,}/g) ?? [];
        const cleaned = matches
          .filter(
            (s) =>
              !s.includes("<?xml") &&
              !s.includes("xmlns") &&
              !/^[A-Za-z0-9+/=]{40,}$/.test(s)
          )
          .join(" ")
          .slice(0, 100000);

        if (cleaned.length > 100) {
          extractedText = cleaned;
          chunksToEmbed = chunkText(cleaned);
        }
      } catch (err) {
        console.error("[PPT Extract] Failed:", err);
      }
    }

    // ── Cloudinary upload ───────────────────────────────────────────
    const uploadOptions: Record<string, any> = {
      resource_type: "raw",
      folder: "hivenote-resources",
    };

    if (type === "PPT") {
      const ext = file.name.split(".").pop()?.toLowerCase() || "pptx";
      uploadOptions.public_id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
    }

    const uploadResponse = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(uploadOptions, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        })
        .end(buffer);
    });

    finalUrl = uploadResponse.secure_url;
  } else if (type === "LINK" && link) {
    finalUrl = link;
  } else {
    throw new Error("Invalid upload: provide either a file (for PDF/PPT) or a link");
  }

  // ── Save resource ───────────────────────────────────────────────
  const resource = await prisma.resource.create({
    data: {
      title,
      description,
      type,
      fileUrl: finalUrl,
      extractedText,
      uploadedBy: user.id,
      ...(university && university !== "" && { university }),
      ...(department && department !== "" && { department: department as any }),
      ...(batch && batch !== "" && { batch }),
      ...(semester && { semester }),
      ...(subjectId && subjectId !== "" && { subjectId }),
    },
  });

  // ── Embed chunks ────────────────────────────────────────────────
  if (chunksToEmbed.length > 0) {
    try {
      await embedChunksAndStore(resource.id, chunksToEmbed);
    } catch (err) {
      console.error("[RAG] Embedding failed for resource", resource.id, err);
    }
  }

  return { success: true };
}

export async function deleteResource(resourceId: string) {
  const session = await getSession();
  if (!session?.user?.email) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  });

  if (user?.role !== "ADMIN") throw new Error("Forbidden");

  await prisma.resource.delete({ where: { id: resourceId } });
  return { success: true };
}