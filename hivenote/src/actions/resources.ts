"use server";

import { prisma } from "@/lib/prisma";
import cloudinary from "@/lib/cloudinary";
import { redirect } from "next/navigation";
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
  const type = formData.get("type") as "PDF" | "LINK";
  const link = formData.get("link") as string | null;
  const file = formData.get("file") as File | null;
  const department = formData.get("department") as string | null;
  const batch = formData.get("batch") as string | null;
  const semesterStr = formData.get("semester") as string | null;
  const semester = semesterStr ? parseInt(semesterStr) : null;
  const university = formData.get("university") as string | null;
  const subjectId = formData.get("subject") as string | null;

  let finalUrl = "";

  if (type === "PDF" && file && file.size > 0) {
    // Upload PDF to Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResponse = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: "raw",
            folder: "hivenote-resources",
            // Don't set flags that force download
            // This ensures files can be viewed inline
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        )
        .end(buffer);
    });

    finalUrl = uploadResponse.secure_url;
  } else if (type === "LINK" && link) {
    finalUrl = link;
  } else {
    throw new Error("Invalid upload: provide either a file (for PDF) or a link");
  }

  await prisma.resource.create({
    data: {
      title,
      description,
      type,
      fileUrl: finalUrl,
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
