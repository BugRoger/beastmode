import { describe, test, expect } from "bun:test";
import { extractSection, extractSectionFromFile, extractSections } from "../artifacts/reader.js";

// --- extractSection ---

describe("extractSection", () => {
  test("extracts a named section from markdown", () => {
    const md = "## Problem\n\nSomething is broken.\n\n## Solution\n\nFix it.";
    expect(extractSection(md, "Problem")).toBe("Something is broken.");
  });

  test("returns undefined for missing section", () => {
    const md = "## Problem\n\nSomething is broken.";
    expect(extractSection(md, "Solution")).toBeUndefined();
  });

  test("returns undefined for empty content", () => {
    expect(extractSection("", "Problem")).toBeUndefined();
  });

  test("returns undefined for empty section body", () => {
    const md = "## Problem\n\n## Solution\n\nFix it.";
    expect(extractSection(md, "Problem")).toBeUndefined();
  });

  test("extracts section at end of file", () => {
    const md = "## Problem\n\nBroken.\n\n## Solution\n\nFix it.\n";
    expect(extractSection(md, "Solution")).toBe("Fix it.");
  });

  test("strips YAML frontmatter before scanning", () => {
    const md = "---\nphase: design\nslug: test\n---\n\n## Problem\n\nBroken.";
    expect(extractSection(md, "Problem")).toBe("Broken.");
  });

  test("handles frontmatter-only content", () => {
    const md = "---\nphase: design\n---\n\nNo headings here.";
    expect(extractSection(md, "Problem")).toBeUndefined();
  });

  test("preserves multiline section content", () => {
    const md = "## User Stories\n\n1. Story one\n2. Story two\n3. Story three\n\n## Decisions\n\nDone.";
    expect(extractSection(md, "User Stories")).toBe(
      "1. Story one\n2. Story two\n3. Story three"
    );
  });

  test("matches exact heading name", () => {
    const md = "## Problem Statement\n\nDetailed.\n\n## Problem\n\nShort.";
    expect(extractSection(md, "Problem")).toBe("Short.");
  });

  test("does not match partial heading names", () => {
    const md = "## Problem Statement\n\nDetailed.";
    expect(extractSection(md, "Problem")).toBeUndefined();
  });
});

// --- extractSectionFromFile ---

describe("extractSectionFromFile", () => {
  test("extracts section from a real file", async () => {
    const tmpFile = `/tmp/beastmode-test-section-${Date.now()}.md`;
    await Bun.write(tmpFile, "## Problem\n\nFile content.");
    const result = await extractSectionFromFile(tmpFile, "Problem");
    expect(result).toBe("File content.");
  });

  test("returns undefined for missing file", async () => {
    const result = await extractSectionFromFile("/tmp/does-not-exist-ever.md", "Problem");
    expect(result).toBeUndefined();
  });

  test("returns undefined for missing section in existing file", async () => {
    const tmpFile = `/tmp/beastmode-test-section-${Date.now()}.md`;
    await Bun.write(tmpFile, "## Other\n\nContent.");
    const result = await extractSectionFromFile(tmpFile, "Problem");
    expect(result).toBeUndefined();
  });
});

// --- extractSections ---

describe("extractSections", () => {
  test("extracts multiple named sections", () => {
    const md = "## Problem\n\nBroken.\n\n## Solution\n\nFix it.\n\n## Decisions\n\nDone.";
    const result = extractSections(md, ["Problem", "Solution", "Decisions"]);
    expect(result).toEqual({
      Problem: "Broken.",
      Solution: "Fix it.",
      Decisions: "Done.",
    });
  });

  test("omits missing sections from result", () => {
    const md = "## Problem\n\nBroken.";
    const result = extractSections(md, ["Problem", "Solution"]);
    expect(result).toEqual({ Problem: "Broken." });
  });

  test("returns empty object when no sections found", () => {
    const md = "No headings here.";
    const result = extractSections(md, ["Problem", "Solution"]);
    expect(result).toEqual({});
  });

  test("returns empty object for empty content", () => {
    const result = extractSections("", ["Problem"]);
    expect(result).toEqual({});
  });
});
