import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { cancelEpic, type CancelConfig } from "../src/shared/cancel-logic";
import type { Logger } from "../src/logger";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Capturing logger that stores log and warn messages for assertions. */
function createCapturingLogger() {
  const logs: string[] = [];
  const warns: string[] = [];
  return {
    logger: {
      log: (msg: string) => logs.push(msg),
      detail: (msg: string) => logs.push(msg),
      debug: (_msg: string) => {},
      trace: (_msg: string) => {},
      warn: (msg: string) => warns.push(msg),
      error: (msg: string) => warns.push(msg),
    } satisfies Logger,
    logs,
    warns,
  };
}

/** Create a temp directory with .beastmode structure. */
function createTempProject(): string {
  const tmp = mkdtempSync(join(tmpdir(), "beastmode-cancel-test-"));
  mkdirSync(join(tmp, ".beastmode", "state"), { recursive: true });
  mkdirSync(join(tmp, ".beastmode", "artifacts", "design"), { recursive: true });
  mkdirSync(join(tmp, ".beastmode", "artifacts", "plan"), { recursive: true });
  mkdirSync(join(tmp, ".beastmode", "artifacts", "implement"), { recursive: true });
  mkdirSync(join(tmp, ".beastmode", "artifacts", "validate"), { recursive: true });
  mkdirSync(join(tmp, ".beastmode", "artifacts", "release"), { recursive: true });
  mkdirSync(join(tmp, ".beastmode", "artifacts", "research"), { recursive: true });
  return tmp;
}

/** Write a minimal valid manifest into .beastmode/state/. */
function writeManifest(
  projectRoot: string,
  slug: string,
  opts?: { github?: { epic: number; repo: string } },
) {
  const manifest = {
    slug,
    epic: slug,
    phase: "design",
    features: [],
    artifacts: {},
    blocked: null,
    github: opts?.github,
    lastUpdated: new Date().toISOString(),
  };
  const filename = `2026-01-01-${slug}.manifest.json`;
  writeFileSync(
    join(projectRoot, ".beastmode", "state", filename),
    JSON.stringify(manifest, null, 2),
  );
}

/** Create artifact files for a given epic name. */
function createArtifactFiles(projectRoot: string, epic: string) {
  // Matching files (should be deleted)
  writeFileSync(
    join(projectRoot, ".beastmode", "artifacts", "design", `2026-01-01-${epic}.md`),
    "# Design",
  );
  writeFileSync(
    join(projectRoot, ".beastmode", "artifacts", "design", `2026-01-01-${epic}.output.json`),
    "{}",
  );
  writeFileSync(
    join(projectRoot, ".beastmode", "artifacts", "plan", `2026-01-01-${epic}-feature.md`),
    "# Plan",
  );
  writeFileSync(
    join(projectRoot, ".beastmode", "artifacts", "plan", `2026-01-01-${epic}-feature.tasks.json`),
    "[]",
  );
  writeFileSync(
    join(projectRoot, ".beastmode", "artifacts", "implement", `2026-01-01-${epic}-feature.md`),
    "# Implement",
  );

  // Non-matching file in research (should NOT be deleted)
  writeFileSync(
    join(projectRoot, ".beastmode", "artifacts", "research", `2026-01-01-${epic}-something.md`),
    "# Research",
  );

  // Non-matching file in design (different epic name)
  writeFileSync(
    join(projectRoot, ".beastmode", "artifacts", "design", `2026-01-01-other-epic.md`),
    "# Other design",
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeEach(() => {
  tmpDir = createTempProject();
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe("cancelEpic", () => {
  test("full cleanup with manifest found", async () => {
    const slug = "test-epic";
    writeManifest(tmpDir, slug, { github: { epic: 42, repo: "owner/repo" } });
    createArtifactFiles(tmpDir, slug);

    const { logger, logs, warns } = createCapturingLogger();
    const result = await cancelEpic({
      identifier: slug,
      projectRoot: tmpDir,
      githubEnabled: false, // skip GitHub to avoid real gh calls
      force: true,
      logger,
    });

    // Steps 1-3 (worktree, archive-tag, phase-tags) will warn because there is
    // no real git repo at tmpDir. Steps 4 (artifacts), 5 (github — skipped), and
    // 6 (manifest) should succeed.
    expect(result.cleaned).toContain("artifacts");
    expect(result.cleaned).toContain("manifest");

    // Verify artifacts were actually deleted
    expect(
      existsSync(join(tmpDir, ".beastmode", "artifacts", "design", `2026-01-01-${slug}.md`)),
    ).toBe(false);
    expect(
      existsSync(join(tmpDir, ".beastmode", "artifacts", "design", `2026-01-01-${slug}.output.json`)),
    ).toBe(false);
    expect(
      existsSync(join(tmpDir, ".beastmode", "artifacts", "plan", `2026-01-01-${slug}-feature.md`)),
    ).toBe(false);

    // Verify manifest was deleted
    expect(
      existsSync(join(tmpDir, ".beastmode", "state", `2026-01-01-${slug}.manifest.json`)),
    ).toBe(false);

    // The total of cleaned + warned should cover all attempted steps
    const allSteps = [...result.cleaned, ...result.warned];
    expect(allSteps.length).toBeGreaterThanOrEqual(4);
  });

  test("idempotent re-run with no manifest", async () => {
    // No manifest written — identifier used directly as slug/epic
    const { logger } = createCapturingLogger();
    const result = await cancelEpic({
      identifier: "nonexistent-epic",
      projectRoot: tmpDir,
      githubEnabled: false,
      force: true,
      logger,
    });

    // All steps should still execute (warn-and-continue for git steps).
    // Manifest step should succeed (store.remove returns false but no throw).
    expect(result.cleaned).toContain("manifest");
    // Artifacts step should succeed (just finds 0 files to delete).
    expect(result.cleaned).toContain("artifacts");

    // Git-based steps will be in warned since tmpDir is not a git repo
    const allSteps = [...result.cleaned, ...result.warned];
    expect(allSteps).toContain("worktree");
    expect(allSteps).toContain("archive-tag");
    expect(allSteps).toContain("phase-tags");
  });

  test("each step warn-and-continue — all steps execute regardless of git state", async () => {
    // Set up a manifest so we get all step categories
    const slug = "warn-test";
    writeManifest(tmpDir, slug);
    createArtifactFiles(tmpDir, slug);

    const { logger } = createCapturingLogger();
    const result = await cancelEpic({
      identifier: slug,
      projectRoot: tmpDir,
      githubEnabled: false,
      force: true,
      logger,
    });

    // The underlying git calls use allowFailure: true, so steps 1-3
    // complete without throwing even outside a git repo. All steps
    // should appear somewhere in cleaned or warned.
    const allSteps = [...result.cleaned, ...result.warned];
    expect(allSteps).toContain("worktree");
    expect(allSteps).toContain("archive-tag");
    expect(allSteps).toContain("phase-tags");
    expect(allSteps).toContain("artifacts");
    expect(allSteps).toContain("manifest");

    // Filesystem-based steps should definitely be in cleaned
    expect(result.cleaned).toContain("artifacts");
    expect(result.cleaned).toContain("manifest");

    // Total steps = 5 (github skipped because disabled)
    expect(allSteps.length).toBe(5);
  });

  test("artifact glob matching — only matching files deleted, research untouched", async () => {
    const slug = "glob-test";
    writeManifest(tmpDir, slug);
    createArtifactFiles(tmpDir, slug);

    const { logger } = createCapturingLogger();
    await cancelEpic({
      identifier: slug,
      projectRoot: tmpDir,
      githubEnabled: false,
      force: true,
      logger,
    });

    // Matching files deleted (contains -<epic>- or -<epic>.)
    expect(
      existsSync(join(tmpDir, ".beastmode", "artifacts", "design", `2026-01-01-${slug}.md`)),
    ).toBe(false);
    expect(
      existsSync(join(tmpDir, ".beastmode", "artifacts", "design", `2026-01-01-${slug}.output.json`)),
    ).toBe(false);
    expect(
      existsSync(join(tmpDir, ".beastmode", "artifacts", "plan", `2026-01-01-${slug}-feature.md`)),
    ).toBe(false);
    expect(
      existsSync(
        join(tmpDir, ".beastmode", "artifacts", "plan", `2026-01-01-${slug}-feature.tasks.json`),
      ),
    ).toBe(false);
    expect(
      existsSync(
        join(tmpDir, ".beastmode", "artifacts", "implement", `2026-01-01-${slug}-feature.md`),
      ),
    ).toBe(false);

    // Research directory NOT scanned — file should still exist
    expect(
      existsSync(
        join(tmpDir, ".beastmode", "artifacts", "research", `2026-01-01-${slug}-something.md`),
      ),
    ).toBe(true);

    // Non-matching file in design should still exist
    expect(
      existsSync(join(tmpDir, ".beastmode", "artifacts", "design", "2026-01-01-other-epic.md")),
    ).toBe(true);
  });

  test("GitHub close skipped when githubEnabled is false", async () => {
    const slug = "no-github";
    writeManifest(tmpDir, slug, { github: { epic: 99, repo: "owner/repo" } });

    const { logger } = createCapturingLogger();
    const result = await cancelEpic({
      identifier: slug,
      projectRoot: tmpDir,
      githubEnabled: false,
      force: true,
      logger,
    });

    // github-issue should not appear in cleaned or warned
    expect(result.cleaned).not.toContain("github-issue");
    expect(result.warned).not.toContain("github-issue");
  });

  test("GitHub close skipped when manifest has no issue number", async () => {
    const slug = "no-issue";
    // Manifest without github field
    writeManifest(tmpDir, slug);

    const { logger } = createCapturingLogger();
    const result = await cancelEpic({
      identifier: slug,
      projectRoot: tmpDir,
      githubEnabled: true, // enabled, but no issue number
      force: true,
      logger,
    });

    // github-issue should not appear since githubEpicNumber is undefined
    expect(result.cleaned).not.toContain("github-issue");
    expect(result.warned).not.toContain("github-issue");
  });
});
