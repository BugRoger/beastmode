/**
 * Section Splitter — extracts named sections from markdown by ## headings.
 *
 * Pure function, no I/O. Splits on level-2 headings only.
 * Returns a Map of heading name → section body text.
 * Empty or undefined input returns an empty map — never throws.
 */

/**
 * Split markdown content into sections by `## ` headings.
 *
 * Each section includes the content between its heading and the next heading (or EOF).
 * Heading names are trimmed and case-preserved as map keys.
 * Content before the first heading is stored under key "" (empty string).
 *
 * @param content - Raw markdown string, or undefined
 * @returns Map of heading name → section body text (trimmed)
 */
export function splitSections(
  content: string | undefined,
): Map<string, string> {
  const sections = new Map<string, string>();
  if (!content) return sections;

  const lines = content.split("\n");
  let currentHeading = "";
  let currentBody: string[] = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      // Flush previous section
      if (currentHeading !== "" || currentBody.length > 0) {
        sections.set(currentHeading, currentBody.join("\n").trim());
      }
      currentHeading = line.slice(3).trim();
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }

  // Flush last section
  if (currentHeading !== "" || currentBody.length > 0) {
    sections.set(currentHeading, currentBody.join("\n").trim());
  }

  return sections;
}
