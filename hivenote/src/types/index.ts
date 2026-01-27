import { Resource, User, Vote } from "@prisma/client";

/**
 * Resource type with related data included
 */
export type ResourceWithRelations = Resource & {
  user: {
    id: string;
    name: string | null;
  };
  votes: Pick<Vote, "userId" | "value">[];
};

/**
 * Resource with computed score and user vote
 */
export type ResourceWithScore = ResourceWithRelations & {
  score: number;
  userVote: number;
};

/**
 * Resource type enum - matches Prisma schema
 */
export type ResourceType = "PDF" | "LINK";

/**
 * Sort options for resources
 */
export type ResourceSortOption = "new" | "popular";

/**
 * User with profile information
 */
export type UserProfile = User;

/**
 * Vote value type
 */
export type VoteValue = 1 | -1 | 0;

/**
 * Toast notification types
 */
export type ToastType = "success" | "error" | "info";

/**
 * Search params for resources page
 */
export type ResourceSearchParams = {
  query?: string;
  type?: ResourceType;
  sort?: ResourceSortOption;
};
