/**
 * Generate a DiceBear avatar URL using the notionists-neutral style
 * @param seed - A unique identifier (email, username, or user ID) to generate consistent avatars
 * @returns The URL to the avatar SVG
 */
export function getAvatarUrl(seed: string): string {
  const encodedSeed = encodeURIComponent(seed);
  return `https://api.dicebear.com/7.x/notionists-neutral/svg?seed=${encodedSeed}`;
}
