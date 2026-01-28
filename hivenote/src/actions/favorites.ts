"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Toggle favorite status for a resource
 * If already favorited, removes it. If not favorited, adds it.
 */
export async function toggleFavorite(resourceId: string) {
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

  // Check if already favorited
  const existingFavorite = await prisma.favorite.findUnique({
    where: {
      userId_resourceId: {
        userId: user.id,
        resourceId,
      },
    },
  });

  if (existingFavorite) {
    // Remove favorite
    await prisma.favorite.delete({
      where: {
        id: existingFavorite.id,
      },
    });
  } else {
    // Add favorite
    await prisma.favorite.create({
      data: {
        userId: user.id,
        resourceId,
      },
    });
  }

  // Revalidate relevant paths
  revalidatePath("/");
  revalidatePath("/resources");
  revalidatePath("/my-favorites");
  revalidatePath(`/resources/${resourceId}`);
}

/**
 * Check if a resource is favorited by the current user
 */
export async function isFavorited(resourceId: string): Promise<boolean> {
  const session = await getSession();

  if (!session?.user?.email) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return false;
  }

  const favorite = await prisma.favorite.findUnique({
    where: {
      userId_resourceId: {
        userId: user.id,
        resourceId,
      },
    },
  });

  return !!favorite;
}

/**
 * Get all favorites for the current user
 */
export async function getUserFavorites() {
  const session = await getSession();

  if (!session?.user?.email) {
    return [];
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return [];
  }

  const favorites = await prisma.favorite.findMany({
    where: {
      userId: user.id,
    },
    include: {
      resource: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          votes: {
            select: {
              value: true,
              userId: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return favorites.map((fav: any) => fav.resource);
}
