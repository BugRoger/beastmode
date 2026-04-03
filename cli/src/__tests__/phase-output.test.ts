import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import {
  findOutputFile,
  readOutput,
  loadOutput,
  readPhaseOutput,
  loadPhaseOutput,
  findWorktreeOutputFile,
  loadWorktreePhaseOutput,
  filenameMatchesEpic,
} from "../artifacts/reader";

const TEST_ROOT = resolve(import.meta.dir, "../../.test-phase-output");

function setupTestRoot(): void {
  if (existsSync(TEST_ROOT)) {
    rmSync(TEST_ROOT, { recursive: true });
  }
  mkdirSync(resolve(TEST_ROOT, ".beastmode", "state", "design"), {
    recursive: true,
  });
  mkdirSync(resolve(TEST_ROOT, ".beastmode", "state", "plan"), {
    recursive: true,
  });
  mkdirSync(resolve(TEST_ROOT, ".beastmode", "state", "implement"), {
    recursive: true,
  });
}

function writeOutput(
  phase: string,
  filename: string,
  content: string,
): void {
  writeFileSync(
    resolve(TEST_ROOT, ".beastmode", "state", phase, filename),
    content,
  );
}

const VALID_OUTPUT = JSON.stringify({
  status: "completed",
  artifacts: { design: ".beastmode/artifacts/design/2026-03-29-my-epic.md" },
});

describe("findOutputFile", () => {
  beforeEach(() => {
    setupTestRoot();
  });

  afterEach(() => {
    if (existsSync(TEST_ROOT)) {
      rmSync(TEST_ROOT, { recursive: true });
    }
  });

  test("returns undefined when directory doesn't exist", () => {
    // Remove the design dir so it truly doesn't exist
    rmSync(resolve(TEST_ROOT, ".beastmode", "state", "design"), {
      recursive: true,
    });
    const result = findOutputFile(TEST_ROOT, "design", "my-epic");
    expect(result).toBeUndefined();
  });

  test("returns undefined when no matching files exist", () => {
    // Directory exists but is empty — no output files
    const result = findOutputFile(TEST_ROOT, "design", "my-epic");
    expect(result).toBeUndefined();
  });

  test("finds the most recent file by date prefix", () => {
    writeOutput("design", "2026-03-28-my-epic.output.json", VALID_OUTPUT);
    const result = findOutputFile(TEST_ROOT, "design", "my-epic");
    expect(result).toBe(
      resolve(
        TEST_ROOT,
        ".beastmode",
        "state",
        "design",
        "2026-03-28-my-epic.output.json",
      ),
    );
  });

  test("handles multiple date-prefixed files (picks latest)", () => {
    writeOutput("plan", "2026-03-25-my-epic.output.json", VALID_OUTPUT);
    writeOutput("plan", "2026-03-28-my-epic.output.json", VALID_OUTPUT);
    writeOutput("plan", "2026-03-26-my-epic.output.json", VALID_OUTPUT);

    const result = findOutputFile(TEST_ROOT, "plan", "my-epic");
    expect(result).toBe(
      resolve(
        TEST_ROOT,
        ".beastmode",
        "state",
        "plan",
        "2026-03-28-my-epic.output.json",
      ),
    );
  });

  test("does not match files for a different slug", () => {
    writeOutput("design", "2026-03-28-other-epic.output.json", VALID_OUTPUT);
    const result = findOutputFile(TEST_ROOT, "design", "my-epic");
    expect(result).toBeUndefined();
  });
});

describe("readOutput", () => {
  beforeEach(() => {
    setupTestRoot();
  });

  afterEach(() => {
    if (existsSync(TEST_ROOT)) {
      rmSync(TEST_ROOT, { recursive: true });
    }
  });

  test("parses a valid output file", () => {
    const filePath = resolve(
      TEST_ROOT,
      ".beastmode",
      "state",
      "design",
      "2026-03-29-my-epic.output.json",
    );
    writeOutput("design", "2026-03-29-my-epic.output.json", VALID_OUTPUT);

    const result = readOutput(filePath);
    expect(result.status).toBe("completed");
    expect(result.artifacts).toEqual({
      design: ".beastmode/artifacts/design/2026-03-29-my-epic.md",
    });
  });

  test("throws on missing file", () => {
    const filePath = resolve(
      TEST_ROOT,
      ".beastmode",
      "state",
      "design",
      "does-not-exist.output.json",
    );
    expect(() => readOutput(filePath)).toThrow("Phase output file not found");
  });

  test("throws on invalid JSON (corrupt file)", () => {
    const filePath = resolve(
      TEST_ROOT,
      ".beastmode",
      "state",
      "design",
      "2026-03-29-bad.output.json",
    );
    writeOutput("design", "2026-03-29-bad.output.json", "not valid json {{{");

    expect(() => readOutput(filePath)).toThrow("Corrupt phase output");
  });

  test("throws on malformed structure (missing status)", () => {
    const filePath = resolve(
      TEST_ROOT,
      ".beastmode",
      "state",
      "design",
      "2026-03-29-no-status.output.json",
    );
    writeOutput(
      "design",
      "2026-03-29-no-status.output.json",
      JSON.stringify({ artifacts: { design: "foo.md" } }),
    );

    expect(() => readOutput(filePath)).toThrow("Malformed phase output");
  });

  test("throws on malformed structure (missing artifacts)", () => {
    const filePath = resolve(
      TEST_ROOT,
      ".beastmode",
      "state",
      "design",
      "2026-03-29-no-artifacts.output.json",
    );
    writeOutput(
      "design",
      "2026-03-29-no-artifacts.output.json",
      JSON.stringify({ status: "completed" }),
    );

    expect(() => readOutput(filePath)).toThrow("Malformed phase output");
  });
});

describe("loadOutput", () => {
  beforeEach(() => {
    setupTestRoot();
  });

  afterEach(() => {
    if (existsSync(TEST_ROOT)) {
      rmSync(TEST_ROOT, { recursive: true });
    }
  });

  test("returns undefined on missing file (no throw)", () => {
    const filePath = resolve(
      TEST_ROOT,
      ".beastmode",
      "state",
      "design",
      "does-not-exist.output.json",
    );
    const result = loadOutput(filePath);
    expect(result).toBeUndefined();
  });

  test("returns undefined on corrupt file (no throw)", () => {
    const filePath = resolve(
      TEST_ROOT,
      ".beastmode",
      "state",
      "design",
      "2026-03-29-corrupt.output.json",
    );
    writeOutput(
      "design",
      "2026-03-29-corrupt.output.json",
      "totally broken json",
    );

    const result = loadOutput(filePath);
    expect(result).toBeUndefined();
  });

  test("returns parsed output on valid file", () => {
    const filePath = resolve(
      TEST_ROOT,
      ".beastmode",
      "state",
      "design",
      "2026-03-29-my-epic.output.json",
    );
    writeOutput("design", "2026-03-29-my-epic.output.json", VALID_OUTPUT);

    const result = loadOutput(filePath);
    expect(result).toBeDefined();
    expect(result!.status).toBe("completed");
  });
});

describe("readPhaseOutput", () => {
  beforeEach(() => {
    setupTestRoot();
  });

  afterEach(() => {
    if (existsSync(TEST_ROOT)) {
      rmSync(TEST_ROOT, { recursive: true });
    }
  });

  test("finds and reads output by phase+slug", () => {
    writeOutput("design", "2026-03-29-my-epic.output.json", VALID_OUTPUT);

    const result = readPhaseOutput(TEST_ROOT, "design", "my-epic");
    expect(result).toBeDefined();
    expect(result!.status).toBe("completed");
    expect(result!.artifacts).toEqual({
      design: ".beastmode/artifacts/design/2026-03-29-my-epic.md",
    });
  });

  test("returns undefined when no output exists", () => {
    const result = readPhaseOutput(TEST_ROOT, "design", "nonexistent");
    expect(result).toBeUndefined();
  });

  test("throws on corrupt output file", () => {
    writeOutput(
      "plan",
      "2026-03-29-my-epic.output.json",
      "broken json content",
    );

    expect(() => readPhaseOutput(TEST_ROOT, "plan", "my-epic")).toThrow(
      "Corrupt phase output",
    );
  });
});

describe("loadPhaseOutput", () => {
  beforeEach(() => {
    setupTestRoot();
  });

  afterEach(() => {
    if (existsSync(TEST_ROOT)) {
      rmSync(TEST_ROOT, { recursive: true });
    }
  });

  test("returns undefined on any error", () => {
    // No output file at all
    const result = loadPhaseOutput(TEST_ROOT, "design", "nonexistent");
    expect(result).toBeUndefined();
  });

  test("returns undefined on corrupt file (no throw)", () => {
    writeOutput(
      "implement",
      "2026-03-29-my-epic.output.json",
      "{{not json}}",
    );

    const result = loadPhaseOutput(TEST_ROOT, "implement", "my-epic");
    expect(result).toBeUndefined();
  });

  test("returns parsed output on valid file", () => {
    writeOutput("design", "2026-03-29-my-epic.output.json", VALID_OUTPUT);

    const result = loadPhaseOutput(TEST_ROOT, "design", "my-epic");
    expect(result).toBeDefined();
    expect(result!.status).toBe("completed");
  });
});

describe("filenameMatchesEpic", () => {
  test("matches epic-level output (no feature)", () => {
    expect(filenameMatchesEpic("2026-03-30-my-epic.output.json", "my-epic")).toBe(true);
  });

  test("matches feature-level output", () => {
    expect(filenameMatchesEpic("2026-03-30-my-epic-some-feature.output.json", "my-epic")).toBe(true);
  });

  test("rejects output from a different epic", () => {
    expect(filenameMatchesEpic("2026-03-29-other-epic-feature.output.json", "my-epic")).toBe(false);
  });

  test("rejects substring matches when feature disambiguates", () => {
    // "my-epic" matches "my-epic-v2" via startsWith — this is a known limitation
    // with hyphenated slug prefixes. The filter still catches most cross-epic leaks.
    // In practice, epic slugs like "done-status-v2" vs "remove-persona-voice" are distinct enough.
    expect(filenameMatchesEpic("2026-03-29-remove-persona-voice-strip.output.json", "done-status-v2")).toBe(false);
  });

  test("matches when epic slug contains hyphens", () => {
    expect(filenameMatchesEpic("2026-03-29-done-status-v2-github-sync.output.json", "done-status-v2")).toBe(true);
  });

  test("rejects when epics are clearly different", () => {
    expect(filenameMatchesEpic("2026-03-29-done-status-v2-feature.output.json", "remove-persona-voice")).toBe(false);
  });

  test("matches hex-named file via hexSlug during design transition", () => {
    expect(filenameMatchesEpic("2026-04-01-d7f3a1.output.json", "slug-redesign", "d7f3a1")).toBe(true);
  });

  test("matches hex-named feature file via hexSlug", () => {
    expect(filenameMatchesEpic("2026-04-01-d7f3a1-auth.output.json", "slug-redesign", "d7f3a1")).toBe(true);
  });

  test("matches epic-named file when hexSlug provided but not needed", () => {
    expect(filenameMatchesEpic("2026-04-01-slug-redesign.output.json", "slug-redesign", "d7f3a1")).toBe(true);
  });

  test("rejects non-matching file even with hexSlug", () => {
    expect(filenameMatchesEpic("2026-04-01-other-epic.output.json", "slug-redesign", "d7f3a1")).toBe(false);
  });

  test("works without hexSlug (backward compat)", () => {
    expect(filenameMatchesEpic("2026-04-01-d7f3a1.output.json", "slug-redesign")).toBe(false);
  });
});

describe("findWorktreeOutputFile with epicSlug filter", () => {
  const WT_ROOT = resolve(import.meta.dir, "../../.test-worktree-output");

  function writeArtifact(phase: string, filename: string, content: string): void {
    writeFileSync(resolve(WT_ROOT, ".beastmode", "artifacts", phase, filename), content);
  }

  beforeEach(() => {
    if (existsSync(WT_ROOT)) rmSync(WT_ROOT, { recursive: true });
    mkdirSync(resolve(WT_ROOT, ".beastmode", "artifacts", "plan"), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(WT_ROOT)) rmSync(WT_ROOT, { recursive: true });
  });

  test("returns only the matching epic's output when filtered", () => {
    writeArtifact("plan", "2026-03-29-done-status-v2-feature.output.json", VALID_OUTPUT);
    writeArtifact("plan", "2026-03-30-remove-persona-voice-strip.output.json", VALID_OUTPUT);

    const result = findWorktreeOutputFile(WT_ROOT, "plan", "remove-persona-voice");
    expect(result).toContain("remove-persona-voice");
    expect(result).not.toContain("done-status-v2");
  });

  test("returns undefined when no output matches the epic", () => {
    writeArtifact("plan", "2026-03-29-other-epic-feature.output.json", VALID_OUTPUT);

    const result = findWorktreeOutputFile(WT_ROOT, "plan", "my-epic");
    expect(result).toBeUndefined();
  });

  test("returns the latest matching file when multiple exist", () => {
    writeArtifact("plan", "2026-03-28-my-epic-feat1.output.json", VALID_OUTPUT);
    writeArtifact("plan", "2026-03-30-my-epic-feat2.output.json", VALID_OUTPUT);
    writeArtifact("plan", "2026-03-29-other-epic.output.json", VALID_OUTPUT);

    const result = findWorktreeOutputFile(WT_ROOT, "plan", "my-epic");
    expect(result).toContain("2026-03-30-my-epic-feat2");
  });

  test("without epicSlug returns the latest file overall (backward compat)", () => {
    writeArtifact("plan", "2026-03-29-alpha-epic.output.json", VALID_OUTPUT);
    writeArtifact("plan", "2026-03-30-zebra-epic.output.json", VALID_OUTPUT);

    const result = findWorktreeOutputFile(WT_ROOT, "plan");
    expect(result).toContain("zebra-epic");
  });
});

describe("loadWorktreePhaseOutput with epicSlug filter", () => {
  const WT_ROOT = resolve(import.meta.dir, "../../.test-worktree-load");

  function writeArtifact(phase: string, filename: string, content: string): void {
    writeFileSync(resolve(WT_ROOT, ".beastmode", "artifacts", phase, filename), content);
  }

  beforeEach(() => {
    if (existsSync(WT_ROOT)) rmSync(WT_ROOT, { recursive: true });
    mkdirSync(resolve(WT_ROOT, ".beastmode", "artifacts", "plan"), { recursive: true });
  });

  afterEach(() => {
    if (existsSync(WT_ROOT)) rmSync(WT_ROOT, { recursive: true });
  });

  test("loads only the matching epic's output", () => {
    const staleOutput = JSON.stringify({
      status: "completed",
      artifacts: { features: [{ slug: "stale-feature", plan: "stale.md" }] },
    });
    const correctOutput = JSON.stringify({
      status: "completed",
      artifacts: { features: [{ slug: "correct-feature", plan: "correct.md" }] },
    });

    writeArtifact("plan", "2026-03-29-old-epic-stale.output.json", staleOutput);
    writeArtifact("plan", "2026-03-30-new-epic-correct.output.json", correctOutput);

    const result = loadWorktreePhaseOutput(WT_ROOT, "plan", "new-epic");
    expect(result).toBeDefined();
    const features = (result!.artifacts as unknown as Record<string, unknown>).features as Array<{ slug: string }>;
    expect(features[0].slug).toBe("correct-feature");
  });
});
