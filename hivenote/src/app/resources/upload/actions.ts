"use server";

import { prisma } from "@/lib/prisma";
import cloudinary from "@/lib/cloudinary";
import { redirect } from "next/navigation";

export async function createResource(formData: FormData) {
  const title = formData.get("title") as string;
  const description = formData.get("description") as string | null;
  const type = formData.get("type") as "PDF" | "LINK";

  if (!title || !type) {
    throw new Error("Missing required fields");
  }

  let fileUrl = "";

  if (type === "PDF") {
    const file = formData.get("file") as File;

    if (!file || file.size === 0) {
      throw new Error("PDF file required");
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadResult = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { resource_type: "raw" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(buffer);
    });

    fileUrl = uploadResult.secure_url;
  }

  if (type === "LINK") {
    const link = formData.get("link") as string;

    if (!link) {
      throw new Error("Link required");
    }

    fileUrl = link;
  }

  await prisma.resource.create({
    data: {
      title,
      description,
      type,
      fileUrl,
      uploadedBy: "cmkpnafgy0000lksosmv3fivr",
    },
  });

  redirect("/resources");
}
