// Shared by the upload form (client) and the resource actions (server), so this module
// must not import anything server-only.

// Files go straight from the browser to Cloudinary, because Vercel rejects function
// request bodies over 4.5 MB. Cloudinary's free plan caps raw uploads at 10 MB.
export const MAX_RESOURCE_BYTES = 10 * 1024 * 1024;

export const RESOURCE_FOLDER = "hivenote-resources";

export const RESOURCE_EXTENSIONS = {
  PDF: ["pdf"],
  PPT: ["ppt", "pptx"],
} as const;

export function fileExtension(fileName: string): string | null {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : null;
}

/**
 * The public id (without folder) for a new upload. PDFs get no extension: the Cloudinary
 * account blocks delivery of URLs ending in .pdf (401 "deny or ACL failure"), and the
 * PDF proxy sets the content type itself. Slides keep theirs so downloads open correctly.
 */
export function newResourcePublicId(type: keyof typeof RESOURCE_EXTENSIONS, ext: string): string {
  const base = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  return type === "PDF" ? base : `${base}.${ext}`;
}

/** A public id we signed for: `hivenote-resources/<timestamp>-<random>[.ppt|.pptx]`. */
export function isResourcePublicId(publicId: string): boolean {
  return /^hivenote-resources\/\d+-[a-z0-9]+(\.pptx?)?$/.test(publicId);
}
