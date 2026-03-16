// Re-export all actions for easier imports
export { voteResource } from "./vote";
export { incrementViewCount } from "./incrementView";
export { createResource } from "./resources";
export { updateProfile } from "./profile";
export { toggleFavorite, isFavorited, getUserFavorites } from "./favorites";
export {
  getResourceComments,
  createComment,
  toggleCommentLike,
} from "./comments";
