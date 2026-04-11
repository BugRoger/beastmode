/**
 * Tests for shared cancel-logic module.
 *
 * Strategy: real filesystem for artifacts (step 4) and store entity (step 6),
 * mock.module for git-dependent operations (steps 1-3) and gh CLI (step 5).
 */
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { existsSync, rmSync, mkdirSync, writeFileSync, readdirSync } from "fs";
import { resolve } from "path";

// ---------------------------------------------------------------------------
// Mock external deps BEFORE importing cancel-logic
// ---------------------------------------------------------------------------

const { mockRemoveWorktree, mockGit, mockDeleteAllTags, mockGh } = vi.hoisted(() => ({
  mockRemoveWorktree: vi.fn(async () => {}),
  mockGit: vi.fn(async () => ({ stdout: "", stderr: "", exitCode: 0 })),
  mockDeleteAllTags: vi.fn(async () => {}),
  mockGh: vi.fn(async () => ({ stdout: "", stderr: "", exitCode: 0 })),
}));

vi.mock("../git/worktree.js", () => ({
  remove: mockRemoveWorktree,
  git: mockGit,
}));
vi.mock("../git/tags.js", () => ({
  deleteAllTags: mockDeleteAllTags,
}));
vi.mock("../github/cli.js", () => ({
  gh: mockGh,
}));

// Import AFTER mocking
import { cancelEpic } from "../commands/cancel-logic.js";
import type { CancelConfig } from "../commands/cancel-logic.js";
import { createNullLogger } from "../logger.js";
import { JsonFileStore } from "../store/index.js";

// ---------------------------------------------------------------------------
// Test scaffolding
// ---------------------------------------------------------------------------

const TEST_ROOT = resolve(import.meta.dirname, "../../.test-cancel-logic");

function cleanup(): void {
  if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true });
}

function stateDir(): string {
  return resolve(TEST_ROOT, ".beastmode", "state");
}

function storePath(): string {
  return resolve(stateDir(), "store.json");
}

function artifactsDir(phase: string): string {
  return resolve(TEST_ROOT, ".beastmode", "artifacts", phase);
}

/** Create a store entity so cancel-logic can find it. */
function seedEntity(
  slug: string,
  overrides?: { epicName?: string },
): void {
  const store = new JsonFileStore(storePath());
  store.load();
  store.addEpic({ name: overrides?.epicName ?? slug });
  store.save();
}

/** Seed artifact files that should match the epic pattern. */
function seedArtifacts(epic: string, phases: string[] = ["design", "plan"]) {
  const date = new Date().toISOString().slice(0, 10);
  for (const phase of phases) {
    const dir = artifactsDir(phase);
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, `${date}-${epic}-research.md`), "content");
    writeFileSync(resolve(dir, `${date}-${epic}.output.json`), "{}");
  }
}

/** Seed artifact files that should NOT match. */
function seedUnrelatedArtifacts() {
  const dir = artifactsDir("design");
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, "2026-01-01-other-epic-research.md"), "content");
  writeFileSync(resolve(dir, "2026-01-01-other-epic.output.json"), "{}");
}

function baseConfig(overrides?: Partial<CancelConfig>): CancelConfig {
  return {
    identifier: "my-epic",
    projectRoot: TEST_ROOT,
    githubEnabled: false,
    force: true,
    logger: createNullLogger(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("cancelEpic", () => {
  beforeEach(() => {
    cleanup();
    mkdirSync(stateDir(), { recursive: true });
    mockRemoveWorktree.mockReset();
    mockGit.mockReset();
    mockDeleteAllTags.mockReset();
    mockGh.mockReset();
    mockRemoveWorktree.mockImplementation(async () => {});
    mockGit.mockImplementation(async () => ({ stdout: "", stderr: "", exitCode: 0 }));
    mockDeleteAllTags.mockImplementation(async () => {});
    mockGh.mockImplementation(async () => ({ stdout: "", stderr: "", exitCode: 0 }));
  });
  afterEach(() => cleanup());

  test("full cleanup — all 5 steps succeed (no github)", async () => {
    seedEntity("my-epic");

    const result = await cancelEpic(baseConfig());

    expect(result.cleaned).toContain("worktree");
    expect(result.cleaned).toContain("archive-tag");
    expect(result.cleaned).toContain("phase-tags");
    expect(result.cleaned).toContain("artifacts");
    expect(result.cleaned).toContain("store-entity");
    expect(result.warned).toHaveLength(0);
    expect(result.cleaned).toHaveLength(5);
  });

  test("idempotent — second cancel succeeds when entity already gone", async () => {
    seedEntity("my-epic");

    const first = await cancelEpic(baseConfig());
    expect(first.cleaned).toContain("store-entity");

    const store = new JsonFileStore(storePath());
    store.load();
    expect(store.find("my-epic")).toBeUndefined();

    const second = await cancelEpic(baseConfig());
    expect(second.cleaned).toContain("store-entity");
    expect(second.warned).toHaveLength(0);
  });

  test("force=true skips confirmation prompt", async () => {
    seedEntity("my-epic");

    const result = await cancelEpic(baseConfig({ force: true }));

    expect(result.cleaned.length).toBeGreaterThan(0);
    expect(result.warned).toHaveLength(0);
  });

  test("design-abandon scenario — no entity, identifier used as fallback", async () => {
    const result = await cancelEpic(
      baseConfig({ identifier: "abandoned-slug", force: true }),
    );

    expect(result.cleaned).toContain("worktree");
    expect(result.cleaned).toContain("archive-tag");
    expect(result.cleaned).toContain("phase-tags");
    expect(result.cleaned).toContain("artifacts");
    expect(result.cleaned).toContain("store-entity");
    expect(result.warned).toHaveLength(0);
  });

  test("no entity — falls back to identifier for slug", async () => {
    const result = await cancelEpic(
      baseConfig({ identifier: "raw-ident" }),
    );

    expect(mockRemoveWorktree).toHaveBeenCalledWith(
      "raw-ident",
      expect.objectContaining({ cwd: TEST_ROOT, deleteBranch: true }),
    );

    expect(mockGit).toHaveBeenCalledWith(
      ["tag", "-d", "archive/raw-ident"],
      expect.objectContaining({ cwd: TEST_ROOT }),
    );

    expect(mockDeleteAllTags).toHaveBeenCalledWith(
      "raw-ident",
      expect.objectContaining({ cwd: TEST_ROOT }),
    );

    expect(result.cleaned).toContain("worktree");
    expect(result.warned).toHaveLength(0);
  });

  test("worktree removal fails — rest continues, warned[] gets failure", async () => {
    seedEntity("my-epic");
    mockRemoveWorktree.mockImplementation(async () => {
      throw new Error("worktree not found");
    });

    const result = await cancelEpic(baseConfig());

    expect(result.warned).toContain("worktree");
    expect(result.cleaned).toContain("archive-tag");
    expect(result.cleaned).toContain("phase-tags");
    expect(result.cleaned).toContain("artifacts");
    expect(result.cleaned).toContain("store-entity");
    expect(result.cleaned).not.toContain("worktree");
  });

  test("archive tag deletion fails — rest continues", async () => {
    seedEntity("my-epic");
    mockGit.mockImplementation(async () => {
      throw new Error("tag not found");
    });

    const result = await cancelEpic(baseConfig());

    expect(result.warned).toContain("archive-tag");
    expect(result.cleaned).toContain("worktree");
    expect(result.cleaned).toContain("phase-tags");
    expect(result.cleaned).toContain("artifacts");
    expect(result.cleaned).toContain("store-entity");
  });

  test("phase tag deletion fails — rest continues", async () => {
    seedEntity("my-epic");
    mockDeleteAllTags.mockImplementation(async () => {
      throw new Error("no tags found");
    });

    const result = await cancelEpic(baseConfig());

    expect(result.warned).toContain("phase-tags");
    expect(result.cleaned).toContain("worktree");
    expect(result.cleaned).toContain("archive-tag");
    expect(result.cleaned).toContain("artifacts");
    expect(result.cleaned).toContain("store-entity");
  });

  test("githubEnabled=false skips GitHub close", async () => {
    seedEntity("my-epic");

    const result = await cancelEpic(
      baseConfig({ githubEnabled: false }),
    );

    expect(result.cleaned).not.toContain("github-issue");
    expect(result.warned).not.toContain("github-issue");
  });

  test("artifacts with -epic- and -epic. patterns are matched and deleted", async () => {
    seedEntity("my-epic");
    seedArtifacts("my-epic", ["design", "plan"]);
    seedUnrelatedArtifacts();

    const result = await cancelEpic(baseConfig());

    expect(result.cleaned).toContain("artifacts");

    const designDir = artifactsDir("design");
    const planDir = artifactsDir("plan");
    const designFiles = readdirSync(designDir);
    const planFiles = readdirSync(planDir);

    expect(designFiles).toHaveLength(2);
    expect(designFiles.every((f) => f.includes("other-epic"))).toBe(true);
    expect(planFiles).toHaveLength(0);
  });

  test("artifact dirs that do not exist are silently skipped", async () => {
    seedEntity("my-epic");

    const result = await cancelEpic(baseConfig());

    expect(result.cleaned).toContain("artifacts");
    expect(result.warned).not.toContain("artifacts");
  });

  test("artifacts with different epic name are not deleted", async () => {
    seedEntity("my-epic");
    seedUnrelatedArtifacts();

    const result = await cancelEpic(baseConfig());

    expect(result.cleaned).toContain("artifacts");
    const designFiles = readdirSync(artifactsDir("design"));
    expect(designFiles).toHaveLength(2);
  });
});
