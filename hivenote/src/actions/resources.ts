"use server";

import { prisma } from "@/lib/prisma";
import cloudinary from "@/lib/cloudinary";
import { getSession } from "@/lib/auth";

export async function createResource(formData: FormData) {
  const session = await getSession();

  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Extract form data
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

  if ((type === "PDF" || type === "PPT") && file && file.size > 0) {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract text from PDF for AI chat context
    if (type === "PDF") {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string }>;
        const parsed = await pdfParse(buffer);
        extractedText = parsed.text?.slice(0, 100000) || null;
      } catch (err) {
        console.error("[PDF Extract] Failed to extract text:", err);
        // non-fatal — AI chat will work without document context
      }
    }

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

  await prisma.resource.create({
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

  return { success: true };
}
