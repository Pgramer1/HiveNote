/**
 * Resource type options
 */
export const RESOURCE_TYPES = {
  PDF: "PDF",
  LINK: "LINK",
} as const;

/**
 * Resource type display information
 */
export const RESOURCE_TYPE_INFO = {
  PDF: {
    label: "PDF Documents",
    description: "Notes, books, study materials",
    colorClass: "text-blue-600 dark:text-blue-400",
  },
  LINK: {
    label: "External Links",
    description: "Videos, articles, websites",
    colorClass: "text-green-600 dark:text-green-400",
  },
} as const;

/**
 * Sort options for resources
 */
export const SORT_OPTIONS = {
  NEW: "new",
  POPULAR: "popular",
} as const;

/**
 * Vote values
 */
export const VOTE_VALUES = {
  UPVOTE: 1,
  DOWNVOTE: -1,
  REMOVE: 0,
} as const;

/**
 * Toast notification durations (in milliseconds)
 */
export const TOAST_DURATION = {
  SHORT: 2000,
  MEDIUM: 3000,
  LONG: 5000,
} as const;

/**
 * File upload constraints
 */
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ["application/pdf"],
} as const;

/**
 * Cloudinary configuration
 */
export const CLOUDINARY = {
  FOLDER: "hivenote-resources",
  RESOURCE_TYPE: "raw",
} as const;

/**
 * Pagination settings
 */
export const PAGINATION = {
  ITEMS_PER_PAGE: 20,
} as const;

/**
 * Navigation routes
 */
export const ROUTES = {
  HOME: "/",
  RESOURCES: "/resources",
  UPLOAD: "/resources/upload",
  MY_PROFILE: "/me",
  EDIT_PROFILE: "/me/edit",
  MY_UPLOADS: "/my-uploads",
  SIGN_IN: "/api/auth/signin",
  SIGN_OUT: "/api/auth/signout",
} as const;
