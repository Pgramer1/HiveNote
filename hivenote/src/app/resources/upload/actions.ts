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
  const fileUrl = formData.get("fileUrl") as string;

  // upload logic (PDF / LINK)

  await prisma.resource.create({
    data: {
      title,
      description,
      type,
      fileUrl,
      uploadedBy: user.id, // ✅ REAL USER
    },
  });

  redirect("/resources");
}
