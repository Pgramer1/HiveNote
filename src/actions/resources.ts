"use server";

import { prisma } from "@/lib/prisma";
import cloudinary from "@/lib/cloudinary";
import { getSession } from "@/lib/auth";
import { after } from "next/server";
import { indexingConfigured, queueIndexing } from "@/lib/rag-service";
import { embedChunksAndStore, chunkPdfPages, chunkText, type ChunkWithPage } from "@/lib/embeddings";
import {
  MAX_RESOURCE_BYTES,
  RESOURCE_EXTENSIONS,
  RESOURCE_FOLDER,
  fileExtension,
  isResourcePublicId,
  newResourcePublicId,
} from "@/lib/upload-limits";

// Expected failures are returned, not thrown: Next.js replaces thrown server action
// errors with a generic message in production, so users would never see the reason.
export type ActionResult = { success: true } | { success: false; error: string };

export type UploadSignature =
  | {
      success: true;
      cloudName: string;
      apiKey: string;
      folder: string;
      publicId: string;
      timestamp: number;
      signature: string;
    }
  | { success: false; error: string };

const MAX_MB = MAX_RESOURCE_BYTES / (1024 * 1024);

/**
 * Signs a direct browser-to-Cloudinary upload. Files can't go through a server action:
 * Vercel rejects function request bodies over 4.5 MB before our code runs.
 */
export async function getResourceUploadSignature(input: {
  type: "PDF" | "PPT";
  fileName: string;
  fileSize: number;
}): Promise<UploadSignature> {
  const session = await getSession();
  if (!session?.user?.email) return { success: false, error: "Please sign in to upload." };

  const allowed: readonly string[] = RESOURCE_EXTENSIONS[input.type] ?? [];
  const ext = fileExtension(input.fileName);
  if (!ext || !allowed.includes(ext)) {
    return { success: false, error: `Please choose a ${allowed.map((e) => `.${e}`).join(" or ")} file.` };
  }
  if (input.fileSize > MAX_RESOURCE_BYTES) {
    return { success: false, error: `Files can be at most ${MAX_MB} MB.` };
  }

  const publicId = newResourcePublicId(input.type, ext);
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { folder: RESOURCE_FOLDER, public_id: publicId, timestamp },
    process.env.CLOUDINARY_API_SECRET!
  );

  return {
    success: true,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
    apiKey: process.env.CLOUDINARY_API_KEY!,
    folder: RESOURCE_FOLDER,
    publicId,
    timestamp,
    signature,
  };
}

/** The original TypeScript extraction, used only when no Python indexer is configured. */
async function extractLegacy(
  buffer: Buffer,
  type: "PDF" | "PPT"
): Promise<{ extractedText: string | null; chunksToEmbed: ChunkWithPage[] }> {
  let extractedText: string | null = null;
  let chunksToEmbed: ChunkWithPage[] = [];

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

  return { extractedText, chunksToEmbed };
}

async function indexLegacy(resourceId: string, chunks: ChunkWithPage[]) {
  try {
    if (chunks.length === 0) throw new Error("No text could be extracted");
    await embedChunksAndStore(resourceId, chunks);
    await prisma.resource.update({
      where: { id: resourceId },
      data: { indexStatus: "READY", indexedAt: new Date(), parserVersion: "legacy-ts", indexError: null },
    });
  } catch (err) {
    console.error("[RAG] Legacy indexing failed for resource", resourceId, err);
    await prisma.resource.update({
      where: { id: resourceId },
      data: { indexStatus: "FAILED", indexedAt: new Date(), indexError: String(err).slice(0, 1000) },
    });
  }
}

async function deleteUploadedFile(publicId: string | null) {
  if (!publicId || !isResourcePublicId(publicId)) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: "raw" }).catch((err) => {
    console.error("[Upload] Failed to delete orphaned file", publicId, err);
  });
}

export async function createResource(formData: FormData): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user?.email) return { success: false, error: "Please sign in to upload." };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user) return { success: false, error: "User not found." };

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const type = formData.get("type") as "PDF" | "PPT" | "LINK";
  const link = formData.get("link") as string | null;
  // Set by the upload form after it sends the file straight to Cloudinary.
  const uploadedPublicId = formData.get("uploadedPublicId") as string | null;
  const department = formData.get("department") as string | null;
  const batch = formData.get("batch") as string | null;
  const semesterStr = formData.get("semester") as string | null;
  const semester = semesterStr ? parseInt(semesterStr) : null;
  const university = formData.get("university") as string | null;
  const subjectId = formData.get("subject") as string | null;

  if (user.isUniversityEmail) {
    if (!department || !batch || !semester || !subjectId) {
      await deleteUploadedFile(uploadedPublicId);
      return { success: false, error: "Department, batch, semester, and subject are required for university uploads." };
    }

    const validSubject = await prisma.subject.findFirst({
      where: {
        id: subjectId,
        university: user.university || university || undefined,
        semester,
        department,
        isActive: true,
      },
      select: { id: true },
    });

    if (!validSubject) {
      await deleteUploadedFile(uploadedPublicId);
      return { success: false, error: "Please select a valid subject for the selected department and semester." };
    }
  }

  let finalUrl = "";
  let extractedText: string | null = null;
  let chunksToEmbed: ChunkWithPage[] = [];

  if (type === "PDF" || type === "PPT") {
    if (!uploadedPublicId || !isResourcePublicId(uploadedPublicId)) {
      return { success: false, error: "The file upload didn't finish. Please try again." };
    }

    // Look the file up instead of trusting a URL from the browser.
    const asset = await cloudinary.api
      .resource(uploadedPublicId, { resource_type: "raw" })
      .catch(() => null);
    if (!asset?.secure_url) {
      return { success: false, error: "The uploaded file could not be found. Please try again." };
    }
    if (asset.bytes > MAX_RESOURCE_BYTES) {
      await deleteUploadedFile(uploadedPublicId);
      return { success: false, error: `Files can be at most ${MAX_MB} MB.` };
    }

    finalUrl = asset.secure_url;

    // Without the Python indexer (service or GitHub workflow), fall back to the old in-process extraction.
    if (!indexingConfigured()) {
      const download = await fetch(asset.secure_url);
      if (!download.ok) {
        return { success: false, error: "The uploaded file could not be read. Please try again." };
      }
      ({ extractedText, chunksToEmbed } = await extractLegacy(Buffer.from(await download.arrayBuffer()), type));
    }
  } else if (type === "LINK" && link) {
    finalUrl = link;
  } else {
    return { success: false, error: "Please provide a link." };
  }

  // ── Save resource ───────────────────────────────────────────────
  const resource = await prisma.resource.create({
    data: {
      title,
      description,
      type,
      fileUrl: finalUrl,
      extractedText,
      // Files start PENDING; links have nothing to index.
      indexStatus: type === "LINK" ? null : "PENDING",
      uploadedBy: user.id,
      ...(user.isUniversityEmail && user.university && { university: user.university }),
      ...(!user.isUniversityEmail && university && university !== "" && { university }),
      ...(department && department !== "" && { department }),
      ...(batch && batch !== "" && { batch }),
      ...(semester && { semester }),
      ...(subjectId && subjectId !== "" && { subjectId }),
    },
  });

  // ── Index for AI chat ───────────────────────────────────────────
  if (type !== "LINK") {
    if (indexingConfigured()) {
      // Runs after the response is sent, so the upload returns immediately.
      after(() => queueIndexing(resource.id));
    } else {
      await indexLegacy(resource.id, chunksToEmbed);
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