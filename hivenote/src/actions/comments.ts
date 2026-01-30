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
  replies?: CommentWithUser[];
  isLikedByCurrentUser?: boolean;
};

export async function getResourceComments(
  resourceId: string
): Promise<CommentWithUser[]> {
  const session = await getSession();
  const currentUserId = session?.user?.id;

  const comments = await prisma.comment.findMany({
    where: { 
      resourceId,
      parentId: null, // Only get top-level comments
    },
    orderBy: { createdAt: "desc" },
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
      replies: {
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

  return comments.map((comment) => ({
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    parentId: comment.parentId,
    user: comment.user,
    _count: {
      likes: comment._count.likes,
      replies: comment._count.replies,
    },
    replies: (comment.replies as any[]).map((reply) => ({
      id: reply.id,
      content: reply.content,
      createdAt: reply.createdAt,
      parentId: reply.parentId,
      user: reply.user,
      _count: {
        likes: reply._count.likes,
        replies: reply._count.replies,
      },
      isLikedByCurrentUser: currentUserId
        ? (reply.likes as { id: string }[]).length > 0
        : false,
    })),
    isLikedByCurrentUser: currentUserId
      ? (comment.likes as { id: string }[]).length > 0
      : false,
  }));
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
