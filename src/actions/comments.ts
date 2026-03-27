"use server";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type CommentWithUser = {
  id: string;
  content: string;
  createdAt: Date;
  parentId: string | null;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  _count: {
    likes: number;
    replies: number;
  };
  replies: CommentWithUser[];
  isLikedByCurrentUser?: boolean;
};

type FlatComment = {
  id: string;
  content: string;
  createdAt: Date;
  parentId: string | null;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
  _count: {
    likes: number;
    replies: number;
  };
  likes?: { id: string }[];
};

function sortNestedComments(comments: CommentWithUser[], isTopLevel = false): CommentWithUser[] {
  const sorted = [...comments].sort((a, b) => {
    if (isTopLevel) {
      return b.createdAt.getTime() - a.createdAt.getTime();
    }
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return sorted.map((comment) => ({
    ...comment,
    replies: sortNestedComments(comment.replies, false),
  }));
}

function buildCommentTree(flatComments: FlatComment[], currentUserId?: string): CommentWithUser[] {
  const nodeMap = new Map<string, CommentWithUser>();

  for (const comment of flatComments) {
    nodeMap.set(comment.id, {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      parentId: comment.parentId,
      user: comment.user,
      _count: {
        likes: comment._count.likes,
        replies: comment._count.replies,
      },
      replies: [],
      isLikedByCurrentUser: currentUserId
        ? (comment.likes ?? []).length > 0
        : false,
    });
  }

  const roots: CommentWithUser[] = [];

  for (const comment of flatComments) {
    const currentNode = nodeMap.get(comment.id);
    if (!currentNode) continue;

    if (comment.parentId && nodeMap.has(comment.parentId)) {
      nodeMap.get(comment.parentId)?.replies.push(currentNode);
    } else {
      roots.push(currentNode);
    }
  }

  return sortNestedComments(roots, true);
}

export async function getResourceComments(
  resourceId: string
): Promise<CommentWithUser[]> {
  const session = await getSession();
  const currentUserId = session?.user?.id;

  const comments = await prisma.comment.findMany({
    where: { resourceId },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      _count: {
        select: {
          likes: true,
          replies: true,
        },
      },
      likes: currentUserId
        ? {
            where: {
              userId: currentUserId,
            },
            select: {
              id: true,
            },
          }
        : false,
    },
  });

  return buildCommentTree(comments as FlatComment[], currentUserId);
}

export async function createComment(resourceId: string, content: string, parentId?: string) {
  const session = await getSession();

  if (!session?.user?.id) {
    throw new Error("You must be logged in to comment");
  }

  if (!content.trim()) {
    throw new Error("Comment cannot be empty");
  }

  const comment = await prisma.comment.create({
    data: {
      content: content.trim(),
      userId: session.user.id,
      resourceId,
      parentId: parentId || null,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      _count: {
        select: {
          likes: true,
          replies: true,
        },
      },
    },
  });

  revalidatePath(`/resources/${resourceId}`);

  return {
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    parentId: comment.parentId,
    user: comment.user,
    _count: {
      likes: comment._count.likes,
      replies: comment._count.replies,
    },
    replies: [],
    isLikedByCurrentUser: false,
  };
}

export async function toggleCommentLike(commentId: string) {
  const session = await getSession();

  if (!session?.user?.id) {
    throw new Error("You must be logged in to like comments");
  }

  const existingLike = await prisma.commentLike.findUnique({
    where: {
      userId_commentId: {
        userId: session.user.id,
        commentId,
      },
    },
  });

  if (existingLike) {
    await prisma.commentLike.delete({
      where: {
        id: existingLike.id,
      },
    });
    return { liked: false };
  } else {
    await prisma.commentLike.create({
      data: {
        userId: session.user.id,
        commentId,
      },
    });
    return { liked: true };
  }
}
