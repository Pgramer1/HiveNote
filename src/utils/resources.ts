import { ResourceWithRelations, ResourceWithScore } from "@/types";

/**
 * Calculate vote score for a resource
 */
export function calculateResourceScore(
  resource: ResourceWithRelations,
  currentUserId?: string
): ResourceWithScore {
  const score = resource.votes.reduce((sum, vote) => sum + vote.value, 0);

  const userVote = currentUserId
    ? resource.votes.find((v) => v.userId === currentUserId)?.value ?? 0
    : 0;

  return {
    ...resource,
    score,
    userVote,
  };
}

/**
 * Sort resources by different criteria
 */
export function sortResources(
  resources: ResourceWithScore[],
  sortBy: "new" | "popular"
): ResourceWithScore[] {
  return [...resources].sort((a, b) => {
    if (sortBy === "popular") {
      // Primary: score DESC
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Tiebreaker: newer first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }

    // Default: sort by newest
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Calculate vote change when updating a vote
 */
export function calculateVoteChange(
  currentVote: number,
  newVote: 1 | -1 | 0
): number {
  if (currentVote === 0 && newVote !== 0) {
    // No vote → new vote
    return newVote;
  } else if (currentVote !== 0 && newVote === 0) {
    // Had vote → removing vote
    return -currentVote;
  } else if (currentVote !== 0 && newVote !== 0 && currentVote !== newVote) {
    // Changing vote (e.g., upvote to downvote)
    return newVote - currentVote;
  }
  return 0;
}

/**
 * Format a date to a relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays > 7) {
    return date.toLocaleDateString();
  } else if (diffInDays > 0) {
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  } else if (diffInHours > 0) {
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
  } else if (diffInMinutes > 0) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`;
  } else {
    return "Just now";
  }
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
