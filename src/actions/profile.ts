"use server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function updateProfile(formData: FormData) {
  const session = await getSession();

  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  const department = formData.get("department") as string;
  const batch = formData.get("batch") as string;

  await prisma.user.update({
    where: { email: session.user.email },
    data: {
      name: formData.get("name") as string,
      bio: formData.get("bio") as string,
      ...(department && { department: department as any }),
      ...(batch && { batch }),
    },
  });

  redirect("/me");
}
