/**
 * Slug utilities for entity naming in the store module.
 */

/** Slug format: lowercase alphanumeric with optional hyphens and dots, no leading/trailing hyphens or dots */
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;

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
