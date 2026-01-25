"use server";

import { prisma } from "@/lib/prisma";

export async function incrementViewCount(resourceId: string) {
  try {
    await prisma.resource.update({
      where: { id: resourceId },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });
  } catch (error) {
    console.error("Failed to increment view count:", error);
  }
}
