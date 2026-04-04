import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from "fs";
import { join, relative } from "path";
import { tmpdir } from "os";
import {
  splitSections,
  resolveArtifactPath,
  readArtifactSections,
} from "../artifacts/reader";

// --- splitSections ---

describe("splitSections", () => {
  test("splits markdown on ## headings", () => {
    const md =
      "## Problem Statement\n\nSome problem text.\n\n## Solution\n\nSome solution text.";
    const sections = splitSections(md);

    expect(sections.get("Problem Statement")).toBe("Some problem text.");
    expect(sections.get("Solution")).toBe("Some solution text.");
  });

  test("returns undefined for missing section key", () => {
    const md = "## Problem\n\nSome text.";
    const sections = splitSections(md);

    expect(sections.get("Nonexistent")).toBeUndefined();
  });

  test("maps empty string for heading immediately followed by another heading", () => {
    const md = "## First\n\n## Second\n\nContent here.";
    const sections = splitSections(md);

    expect(sections.get("First")).toBe("");
    expect(sections.get("Second")).toBe("Content here.");
  });

  test("stores content before first heading under empty string key", () => {
    const md = "Some preamble text.\n\n## First Section\n\nContent.";
    const sections = splitSections(md);

    expect(sections.get("")).toBe("Some preamble text.");
    expect(sections.get("First Section")).toBe("Content.");
  });

  test("only splits on ## headings, not # or ###", () => {
    const md =
      "## Main\n\n# Not a boundary\n\n### Also not\n\nAll part of Main.";
    const sections = splitSections(md);

    const mainContent = sections.get("Main");
    expect(mainContent).toBeDefined();
    expect(mainContent).toContain("# Not a boundary");
    expect(mainContent).toContain("### Also not");
    expect(mainContent).toContain("All part of Main.");
  });

  test("strips YAML frontmatter before splitting", () => {
    const md =
      "---\nphase: design\nslug: test\n---\n\n## Section\n\nContent.";
    const sections = splitSections(md);

    expect(sections.get("Section")).toBe("Content.");
    expect(sections.has("---")).toBe(false);
    for (const [, value] of sections) {
      expect(value).not.toContain("phase: design");
    }
  });

  test("returns single preamble entry for empty input", () => {
    const sections = splitSections("");
    // Empty string produces a single preamble entry under key ""
    expect(sections.size).toBe(1);
    expect(sections.get("")).toBe("");
  });

  test("trims heading names", () => {
    const md = "##  Spaced \n\nContent.";
    const sections = splitSections(md);

    expect(sections.get("Spaced")).toBe("Content.");
  });
});

// --- resolveArtifactPath ---

describe("resolveArtifactPath", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "artifact-reader-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("returns manifest path when it exists on disk", () => {
    const relPath = ".beastmode/artifacts/design/2026-04-03-test-epic.md";
    mkdirSync(join(tempDir, ".beastmode", "artifacts", "design"), {
      recursive: true,
    });
    writeFileSync(
      join(tempDir, relPath),
      "# Design\n\n## Problem\n\nContent.",
    );

    const result = resolveArtifactPath(tempDir, "design", "test-epic", {
      artifacts: { design: [relPath] },
    });

    expect(result).toBe(relPath);
  });

  test("falls back to glob scan when manifest path does not exist on disk", () => {
    const relPath = ".beastmode/artifacts/design/2026-04-03-test-epic.md";
    mkdirSync(join(tempDir, ".beastmode", "artifacts", "design"), {
      recursive: true,
    });
    writeFileSync(join(tempDir, relPath), "# Design\n\n## Problem\n\nContent.");

    const result = resolveArtifactPath(tempDir, "design", "test-epic", {
      artifacts: {
        design: [".beastmode/artifacts/design/nonexistent.md"],
      },
    });

    expect(result).toBeDefined();
    expect(result!.endsWith("2026-04-03-test-epic.md")).toBe(true);
  });

  test("resolves via glob scan when no manifest provided", () => {
    const dir = join(tempDir, ".beastmode", "artifacts", "design");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "2026-04-03-test-epic.md"),
      "# Design\n\n## Problem\n\nContent.",
    );

    const result = resolveArtifactPath(tempDir, "design", "test-epic");
    const expected = relative(
      tempDir,
      join(dir, "2026-04-03-test-epic.md"),
    );

    expect(result).toBe(expected);
  });

  test("picks latest date-prefixed file when multiple matches exist", () => {
    const dir = join(tempDir, ".beastmode", "artifacts", "design");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "2026-04-01-test-epic.md"), "Old content.");
    writeFileSync(join(dir, "2026-04-03-test-epic.md"), "New content.");

    const result = resolveArtifactPath(tempDir, "design", "test-epic");

    expect(result).toBeDefined();
    expect(result!.endsWith("2026-04-03-test-epic.md")).toBe(true);
  });

  test("returns undefined when no matching artifact exists in dir", () => {
    mkdirSync(join(tempDir, ".beastmode", "artifacts", "design"), {
      recursive: true,
    });

    const result = resolveArtifactPath(
      tempDir,
      "design",
      "nonexistent-epic",
    );

    expect(result).toBeUndefined();
  });

  test("returns undefined when artifact directory does not exist and no manifest", () => {
    const result = resolveArtifactPath(tempDir, "design", "test-epic");

    expect(result).toBeUndefined();
  });

  test("falls through to glob with empty manifest artifacts record", () => {
    const dir = join(tempDir, ".beastmode", "artifacts", "design");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "2026-04-03-test-epic.md"), "Content.");

    const result = resolveArtifactPath(tempDir, "design", "test-epic", {
      artifacts: {},
    });

    expect(result).toBeDefined();
    expect(result!.endsWith("2026-04-03-test-epic.md")).toBe(true);
  });

  test("never throws on any input", () => {
    expect(resolveArtifactPath("", "", "")).toBeUndefined();
    expect(
      resolveArtifactPath("/nonexistent", "design", "slug"),
    ).toBeUndefined();
    expect(
      resolveArtifactPath(tempDir, "design", "slug", {
        artifacts: { design: [] },
      }),
    ).toBeUndefined();
  });
});

// --- readArtifactSections ---

describe("readArtifactSections", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "artifact-reader-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("reads file and extracts sections end-to-end", () => {
    const dir = join(tempDir, ".beastmode", "artifacts", "design");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "2026-04-03-test-epic.md"),
      "## Problem\n\nSomething broken.\n\n## Solution\n\nFix it.",
    );

    const result = readArtifactSections(tempDir, "design", "test-epic");

    expect(result).toBeDefined();
    expect(result!.get("Problem")).toBe("Something broken.");
    expect(result!.get("Solution")).toBe("Fix it.");
  });

  test("reads from manifest path when provided", () => {
    const artifactPath = ".beastmode/artifacts/plan/2026-01-01-my-epic.md";
    mkdirSync(join(tempDir, ".beastmode", "artifacts", "plan"), {
      recursive: true,
    });
    writeFileSync(
      join(tempDir, artifactPath),
      "## Tasks\nDo things\n## Schedule\nNow",
    );

    const result = readArtifactSections(tempDir, "plan", "my-epic", {
      artifacts: { plan: [artifactPath] },
    });

    expect(result).toBeDefined();
    expect(result!.get("Tasks")).toBe("Do things");
    expect(result!.get("Schedule")).toBe("Now");
  });

  test("returns undefined when no artifact file exists", () => {
    mkdirSync(join(tempDir, ".beastmode", "artifacts", "design"), {
      recursive: true,
    });

    const result = readArtifactSections(
      tempDir,
      "design",
      "nonexistent-epic",
    );

    expect(result).toBeUndefined();
  });

  test("returns a map for file with no ## headings (preamble only)", () => {
    const dir = join(tempDir, ".beastmode", "artifacts", "design");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "2026-04-03-test-epic.md"),
      "Just plain text with no headings at all.",
    );

    const result = readArtifactSections(tempDir, "design", "test-epic");

    // splitSections returns a Map with preamble under "" key — not empty
    expect(result).toBeDefined();
    expect(result).toBeInstanceOf(Map);
  });

  test("logs warning when file is missing and logger provided", () => {
    const warnings: string[] = [];
    const mockLogger = {
      warn: (msg: string) => warnings.push(msg),
      info: () => {},
      debug: () => {},
      error: () => {},
    };

    const result = readArtifactSections(
      tempDir,
      "design",
      "nonexistent-epic",
      undefined,
      mockLogger as any,
    );

    expect(result).toBeUndefined();
    expect(warnings.length).toBeGreaterThan(0);
  });
});
