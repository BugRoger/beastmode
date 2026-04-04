import { describe, test, expect, beforeEach, afterEach } from "vitest";
import {
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
} from "fs";
import { resolve } from "path";
import { execSync } from "child_process";
import { rename } from "../manifest/store";
import { createTag, listTags } from "../git/tags";

const TEST_ROOT = resolve(import.meta.dirname, "../../.test-phase-tags-integration");

function cleanup(): void {
  if (existsSync(TEST_ROOT)) {
    try {
      execSync("git worktree prune", { cwd: TEST_ROOT, stdio: "ignore" });
    } catch {}
    rmSync(TEST_ROOT, { recursive: true, force: true });
  }
}

function setupTestRepo(): void {
  cleanup();
  mkdirSync(TEST_ROOT, { recursive: true });
  execSync("git init", { cwd: TEST_ROOT, stdio: "ignore" });
  execSync("git commit --allow-empty -m 'init'", {
    cwd: TEST_ROOT,
    stdio: "ignore",
  });
  mkdirSync(resolve(TEST_ROOT, ".beastmode", "state"), { recursive: true });
  mkdirSync(resolve(TEST_ROOT, ".claude", "worktrees"), { recursive: true });
}

function createTestWorktree(slug: string): void {
  const branch = `feature/${slug}`;
  const wtPath = resolve(TEST_ROOT, ".claude", "worktrees", slug);
  execSync(`git branch ${branch}`, { cwd: TEST_ROOT, stdio: "ignore" });
  execSync(`git worktree add ${wtPath} ${branch}`, {
    cwd: TEST_ROOT,
    stdio: "ignore",
  });
}

function createTestManifest(slug: string, extra?: object): void {
  const dir = resolve(TEST_ROOT, ".beastmode", "state");
  const date = new Date().toISOString().slice(0, 10);
  const manifest = {
    slug,
    phase: "design",
    features: [],
    artifacts: {},
    worktree: {
      branch: `feature/${slug}`,
      path: resolve(TEST_ROOT, ".claude", "worktrees", slug),
    },
    lastUpdated: new Date().toISOString(),
    ...extra,
  };
  writeFileSync(
    resolve(dir, `${date}-${slug}.manifest.json`),
    JSON.stringify(manifest, null, 2),
  );
}

describe("phase-tags integration", () => {
  beforeEach(() => setupTestRepo());
  afterEach(() => cleanup());

  test("store.rename() renames phase tags alongside branch and worktree", async () => {
    createTestWorktree("abc123");
    createTestManifest("abc123");

    // Create phase tags under the hex slug
    await createTag("abc123", "design", { cwd: TEST_ROOT });

    // Verify tag exists
    let tags = await listTags("abc123", { cwd: TEST_ROOT });
    expect(tags).toContain("beastmode/abc123/design");

    // Rename
    const result = await rename(TEST_ROOT, "abc123", "My Feature");
    expect(result.renamed).toBe(true);
    expect(result.completedSteps).toContain("tags");

    // Old tags gone, new tags present
    const oldTags = await listTags("abc123", { cwd: TEST_ROOT });
    const newTags = await listTags("my-feature", { cwd: TEST_ROOT });
    expect(oldTags).toHaveLength(0);
    expect(newTags).toContain("beastmode/my-feature/design");
  });

  test("store.rename() succeeds even when no tags exist (old epic)", async () => {
    createTestWorktree("abc123");
    createTestManifest("abc123");

    // No tags created — simulates pre-feature epic
    const result = await rename(TEST_ROOT, "abc123", "My Feature");
    expect(result.renamed).toBe(true);
    expect(result.completedSteps).toContain("tags");
  });

  test("multiple phase tags survive rename", async () => {
    createTestWorktree("abc123");
    createTestManifest("abc123");

    await createTag("abc123", "design", { cwd: TEST_ROOT });
    await createTag("abc123", "plan", { cwd: TEST_ROOT });
    await createTag("abc123", "implement", { cwd: TEST_ROOT });

    const result = await rename(TEST_ROOT, "abc123", "My Feature");
    expect(result.renamed).toBe(true);

    const newTags = await listTags("my-feature", { cwd: TEST_ROOT });
    expect(newTags).toContain("beastmode/my-feature/design");
    expect(newTags).toContain("beastmode/my-feature/plan");
    expect(newTags).toContain("beastmode/my-feature/implement");
    expect(newTags).toHaveLength(3);
  });
});
