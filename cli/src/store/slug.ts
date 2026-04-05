/**
 * Slug utilities for entity naming in the store module.
 */

/** Slug format: lowercase alphanumeric with optional hyphens, no leading/trailing hyphens */
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/**
 * Validate a string against the slug format.
 */
export function isValidSlug(input: string): boolean {
  return SLUG_PATTERN.test(input);
}

/**
 * Normalize a string to a valid slug.
 * Lowercases, replaces non-alphanumeric with hyphens, collapses multiple hyphens,
 * strips leading/trailing hyphens.
 */
export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (slug.length === 0) {
    throw new Error(`Cannot slugify empty or all-special-character input: "${input}"`);
  }
  return slug;
}

/**
 * Simple hash function for generating deterministic suffixes from entity IDs.
 * Returns a 4-character hex string.
 */
function hashId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return (hash >>> 0).toString(16).padStart(4, "0").slice(0, 4);
}

/**
 * Deduplicate a slug by appending a suffix derived from the entity ID hash.
 * Returns the original slug if no collision, or `slug-xxxx` if collision detected.
 */
export function deduplicateSlug(slug: string, entityId: string, existingSlugs: Set<string>): string {
  if (!existingSlugs.has(slug)) return slug;
  const suffix = hashId(entityId);
  return `${slug}-${suffix}`;
}
