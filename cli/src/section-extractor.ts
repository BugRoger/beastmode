/**
 * Section extractor — extracts named ## sections from markdown content.
 *
 * Pure utility, no side effects except file reads in the convenience variant.
 * All failure modes return undefined — never throws.
 */

/** Strip YAML frontmatter (--- delimited block at start of content). */
function stripFrontmatter(content: string): string {
  if (!content.startsWith("---")) return content;
  const end = content.indexOf("\n---", 3);
  if (end === -1) return content;
  return content.slice(end + 4);
}

/**
 * Extract a named `## ` section from markdown content.
 *
 * Returns the body text between the heading and the next `## ` heading or EOF.
 * Returns undefined if the section is not found or content is empty.
 */
export function extractSection(
  content: string,
  sectionName: string,
): string | undefined {
  if (!content) return undefined;

  const body = stripFrontmatter(content);
  const heading = `## ${sectionName}`;

  // Find the target heading at start of a line
  const pattern = new RegExp(`^${escapeRegex(heading)}\\s*$`, "m");
  const match = pattern.exec(body);
  if (!match) return undefined;

  // Everything after the heading line
  const start = match.index + match[0].length;
  const rest = body.slice(start);

  // Find next ## heading or EOF
  const nextHeading = rest.search(/^## /m);
  const sectionBody =
    nextHeading === -1 ? rest : rest.slice(0, nextHeading);

  const trimmed = sectionBody.trim();
  return trimmed || undefined;
}

/** Escape special regex characters in a string. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Extract a named section from a markdown file.
 *
 * Returns undefined if the file doesn't exist, can't be read, or the section isn't found.
 */
export async function extractSectionFromFile(
  filePath: string,
  sectionName: string,
): Promise<string | undefined> {
  try {
    const content = await Bun.file(filePath).text();
    return extractSection(content, sectionName);
  } catch {
    return undefined;
  }
}

/**
 * Extract multiple named sections from markdown content.
 *
 * Returns a partial record — only includes sections that were found.
 */
export function extractSections(
  content: string,
  sectionNames: string[],
): Partial<Record<string, string>> {
  const result: Partial<Record<string, string>> = {};
  for (const name of sectionNames) {
    const value = extractSection(content, name);
    if (value !== undefined) {
      result[name] = value;
    }
  }
  return result;
}
