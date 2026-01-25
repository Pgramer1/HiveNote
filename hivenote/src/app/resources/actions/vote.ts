"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * Cast or update a vote on a resource
 *
 * @param resourceId - ID of the resource being voted on
 * @param value - +1 for upvote, -1 for downvote
 */
export async function voteResource(
  resourceId: string,
  value: 1 | -1
) {
  // 1️⃣ Ensure user is authenticated
  const session = await getSession();

  if (!session?.user?.email) {
    throw new Error("Unauthorized");
  }

  // 2️⃣ Fetch the user
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // 3️⃣ Check if this user already voted on this resource
  const existingVote = await prisma.vote.findUnique({
    where: {
      userId_resourceId: {
        userId: user.id,
        resourceId,
      },
    },
  });

  /**
   * CASE 1: No existing vote → create new vote
   */
  if (!existingVote) {
    await prisma.vote.create({
      data: {
        userId: user.id,
        resourceId,
        value,
      },
    });
    return;
  }

  /**
   * CASE 2: Same vote clicked again → remove vote (toggle off)
   */
  if (existingVote.value === value) {
    await prisma.vote.delete({
      where: {
        id: existingVote.id,
      },
    });
    return;
  }

  /**
   * CASE 3: Opposite vote → update vote
   * Example:
   * - existing = -1
   * - new = +1
   */
  await prisma.vote.update({
    where: {
      id: existingVote.id,
    },
    data: {
      value,
    },
  });
}
