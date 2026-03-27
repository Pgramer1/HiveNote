"use client";

import { useState, useEffect } from "react";
import { MessageCircle, Send, ThumbsUp } from "lucide-react";
import Image from "next/image";
import { getAvatarUrl } from "@/utils/avatar";
import {
  getResourceComments,
  createComment,
  toggleCommentLike,
  type CommentWithUser,
} from "@/actions/comments";
import { useSession } from "next-auth/react";

type Props = {
  resourceId: string;
  initialComments: CommentWithUser[];
};

function addReplyToTree(
  nodes: CommentWithUser[],
  parentId: string,
  reply: CommentWithUser
): CommentWithUser[] {
  return nodes.map((node) => {
    if (node.id === parentId) {
      return {
        ...node,
        replies: [...node.replies, reply],
        _count: {
          ...node._count,
          replies: node._count.replies + 1,
        },
      };
    }

    if (node.replies.length > 0) {
      return {
        ...node,
        replies: addReplyToTree(node.replies, parentId, reply),
      };
    }

    return node;
  });
}

function updateLikeInTree(
  nodes: CommentWithUser[],
  commentId: string,
  liked: boolean
): CommentWithUser[] {
  return nodes.map((node) => {
    if (node.id === commentId) {
      return {
        ...node,
        isLikedByCurrentUser: liked,
        _count: {
          ...node._count,
          likes: liked ? node._count.likes + 1 : node._count.likes - 1,
        },
      };
    }

    if (node.replies.length > 0) {
      return {
        ...node,
        replies: updateLikeInTree(node.replies, commentId, liked),
      };
    }

    return node;
  });
}

export default function ResourceDiscussion({
  resourceId,
  initialComments,
}: Props) {
  const { data: session, status } = useSession();
  const [comments, setComments] = useState<CommentWithUser[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsedCommentIds, setCollapsedCommentIds] = useState<Set<string>>(new Set());

  // Debug: log session state
  useEffect(() => {
    console.log("Session status:", status);
    console.log("Session data:", session);
  }, [status, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    if (status === "loading" || !session?.user) {
      setError("You must be logged in to comment");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const comment = await createComment(resourceId, newComment);
      setComments([comment, ...comments]);
      setNewComment("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim() || isSubmitting) return;

    if (status === "loading" || !session?.user) {
      setError("You must be logged in to reply");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const reply = await createComment(resourceId, replyContent, parentId);

      setComments((prev) => addReplyToTree(prev, parentId, reply));
      setCollapsedCommentIds((prev) => {
        if (!prev.has(parentId)) return prev;
        const next = new Set(prev);
        next.delete(parentId);
        return next;
      });
      
      setReplyContent("");
      setReplyingTo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post reply");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (commentId: string) => {
    if (status === "loading" || !session?.user) {
      setError("You must be logged in to like comments");
      return;
    }

    try {
      const result = await toggleCommentLike(commentId);

      setComments((prev) => updateLikeInTree(prev, commentId, result.liked));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to like comment");
    }
  };

  const toggleCollapse = (commentId: string) => {
    setCollapsedCommentIds((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const renderComment = (comment: CommentWithUser, depth = 0) => {
    const replyIndent = depth > 0 ? "ml-6 border-l-2 border-muted pl-3" : "";
    const avatarSize = depth > 0 ? 28 : 32;
    const textSize = depth > 0 ? "text-xs" : "text-sm";
    const maxDepth = 6;
    const hasReplies = comment.replies.length > 0;
    const isCollapsed = collapsedCommentIds.has(comment.id);

    return (
      <div key={comment.id} className={`space-y-2 ${replyIndent}`}>
        <div className="flex items-start gap-3">
          <div
            className={`${depth > 0 ? "w-7 h-7" : "w-8 h-8"} rounded-full overflow-hidden bg-muted border border-border shrink-0`}
          >
            <Image
              src={getAvatarUrl(comment.user.name || comment.user.id)}
              alt={comment.user.name || "User"}
              width={avatarSize}
              height={avatarSize}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`${textSize} font-medium`}>
                {comment.user.name || "Anonymous"}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatTimestamp(comment.createdAt)}
              </span>
            </div>
            <p className={`${textSize} text-foreground leading-relaxed`}>
              {comment.content}
            </p>
            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={() => handleLike(comment.id)}
                disabled={status === "loading" || !session?.user}
                className={`inline-flex items-center gap-1 text-xs transition-colors ${
                  comment.isLikedByCurrentUser
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <ThumbsUp
                  className={`w-3 h-3 ${
                    comment.isLikedByCurrentUser ? "fill-current" : ""
                  }`}
                />
                <span>{comment._count.likes > 0 ? comment._count.likes : "Like"}</span>
              </button>
              {depth < maxDepth && (
                <button
                  onClick={() =>
                    setReplyingTo(replyingTo === comment.id ? null : comment.id)
                  }
                  disabled={status === "loading" || !session?.user}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reply
                  {comment._count.replies > 0 && ` (${comment._count.replies})`}
                </button>
              )}
              {hasReplies && (
                <button
                  onClick={() => toggleCollapse(comment.id)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isCollapsed ? "Expand" : "Collapse"}
                  {` (${comment.replies.length})`}
                </button>
              )}
            </div>

            {replyingTo === comment.id && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={`Reply to ${comment.user.name || "Anonymous"}...`}
                  disabled={isSubmitting}
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-16"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReply(comment.id)}
                    disabled={!replyContent.trim() || isSubmitting}
                    className="inline-flex items-center justify-center rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Send className="w-3 h-3 mr-1" />
                    {isSubmitting ? "Posting..." : "Reply"}
                  </button>
                  <button
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent("");
                    }}
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {hasReplies && !isCollapsed && (
          <div className="space-y-3">
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b">
        <MessageCircle className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-sm">Discussion</h3>
        <span className="text-xs text-muted-foreground ml-auto">
          {comments.length} {comments.length === 1 ? "comment" : "comments"}
        </span>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Comment Input */}
      <div className="p-4 border-b bg-muted/20">
        {status === "loading" ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Loading...
          </div>
        ) : session?.user ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts..."
              disabled={isSubmitting}
              className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-20"
              rows={3}
            />
            <button
              type="submit"
              disabled={!newComment.trim() || isSubmitting}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 self-end"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmitting ? "Posting..." : "Post Comment"}
            </button>
          </form>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Please <a href="/auth/signin" className="text-primary hover:underline">log in</a> to comment
          </div>
        )}
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No comments yet</p>
            <p className="text-xs text-muted-foreground">Be the first to share your thoughts!</p>
          </div>
        ) : (
          comments.map((comment) => renderComment(comment))
        )}
      </div>
    </div>
  );
}
