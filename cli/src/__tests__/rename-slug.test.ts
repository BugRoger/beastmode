import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  mkdirSync,
  writeFileSync,
  rmSync,
  readFileSync,
  existsSync,
  readdirSync,
} from "fs";
import { resolve } from "path";
import { execSync } from "child_process";
import { renameEpicSlug, findAvailableSlug } from "../rename-slug";

const TEST_ROOT = resolve(import.meta.dir, "../../.test-rename-slug");

function cleanup(): void {
  if (existsSync(TEST_ROOT)) {
    // Prune worktrees before deleting so git doesn't complain
    try {
      execSync("git worktree prune", { cwd: TEST_ROOT, stdio: "ignore" });
    } catch {}
    rmSync(TEST_ROOT, { recursive: true, force: true });
  }
}

function setupTestRepo(): void {
  cleanup();
  mkdirSync(TEST_ROOT, { recursive: true });

  // Init a real git repo with an initial commit
  execSync("git init", { cwd: TEST_ROOT, stdio: "ignore" });
  execSync("git commit --allow-empty -m 'init'", {
    cwd: TEST_ROOT,
    stdio: "ignore",
  });

  // Create .beastmode/state/ and .claude/worktrees/ dirs
  mkdirSync(resolve(TEST_ROOT, ".beastmode", "state"), { recursive: true });
  mkdirSync(resolve(TEST_ROOT, ".claude", "worktrees"), { recursive: true });
}

function createTestWorktree(slug: string): void {
  const branch = `feature/${slug}`;
  const wtPath = resolve(TEST_ROOT, ".claude", "worktrees", slug);

  // Create the branch from HEAD
  execSync(`git branch ${branch}`, { cwd: TEST_ROOT, stdio: "ignore" });

  // Create the worktree pointing at that branch
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

function branchExists(branch: string): boolean {
  try {
    execSync(`git show-ref --verify refs/heads/${branch}`, {
      cwd: TEST_ROOT,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function findManifestFile(slug: string): string | undefined {
  const dir = resolve(TEST_ROOT, ".beastmode", "state");
  if (!existsSync(dir)) return undefined;
  const files = readdirSync(dir);
  return files.find((f) => f.endsWith(`-${slug}.manifest.json`));
}

function readManifest(slug: string): Record<string, unknown> {
  const dir = resolve(TEST_ROOT, ".beastmode", "state");
  const file = findManifestFile(slug);
  if (!file) throw new Error(`No manifest found for slug: ${slug}`);
  return JSON.parse(readFileSync(resolve(dir, file), "utf-8"));
}

describe("renameEpicSlug", () => {
  beforeEach(() => setupTestRepo());
  afterEach(() => cleanup());

  test("renames all 5 targets on happy path", async () => {
    createTestWorktree("abc123");
    createTestManifest("abc123");

    const result = await renameEpicSlug({
      hexSlug: "abc123",
      realSlug: "my-feature",
      projectRoot: TEST_ROOT,
    });

    // Result shape
    expect(result.renamed).toBe(true);
    expect(result.finalSlug).toBe("my-feature");
    expect(result.completedSteps.length).toBeGreaterThanOrEqual(4);

    // Branch renamed
    expect(branchExists("feature/my-feature")).toBe(true);
    expect(branchExists("feature/abc123")).toBe(false);

    // Worktree directory renamed
    const newWtPath = resolve(
      TEST_ROOT,
      ".claude",
      "worktrees",
      "my-feature",
    );
    const oldWtPath = resolve(TEST_ROOT, ".claude", "worktrees", "abc123");
    expect(existsSync(newWtPath)).toBe(true);
    expect(existsSync(oldWtPath)).toBe(false);

    // Manifest file renamed
    expect(findManifestFile("my-feature")).toBeDefined();
    expect(findManifestFile("abc123")).toBeUndefined();

    // Manifest internals updated
    const manifest = readManifest("my-feature");
    expect(manifest.slug).toBe("my-feature");
    const worktree = manifest.worktree as Record<string, string>;
    expect(worktree.branch).toBe("feature/my-feature");
  });

  test("auto-suffixes on slug collision", async () => {
    createTestWorktree("abc123");
    createTestManifest("abc123");

    // Create a colliding branch so "my-feature" is taken
    execSync("git branch feature/my-feature", {
      cwd: TEST_ROOT,
      stdio: "ignore",
    });

    const result = await renameEpicSlug({
      hexSlug: "abc123",
      realSlug: "my-feature",
      projectRoot: TEST_ROOT,
    });

    expect(result.finalSlug).toBe("my-feature-v2");
    expect(branchExists("feature/my-feature-v2")).toBe(true);
    expect(result.renamed).toBe(true);
  });

  test("aborts remaining steps on failure", async () => {
    // Create the branch but NOT a worktree directory — branch rename
    // succeeds, but worktree directory rename will fail (no dir to move)
    execSync("git branch feature/abc123", {
      cwd: TEST_ROOT,
      stdio: "ignore",
    });
    createTestManifest("abc123");

    const result = await renameEpicSlug({
      hexSlug: "abc123",
      realSlug: "target",
      projectRoot: TEST_ROOT,
    });

    // Rename should have reported failure
    expect(result.renamed).toBe(false);
    expect(result.error).toBeDefined();
    expect(typeof result.error).toBe("string");

    // Branch rename (step 1) should have completed before abort
    expect(result.completedSteps.length).toBeGreaterThanOrEqual(1);
    expect(branchExists("feature/target")).toBe(true);
  });

  test("returns early when hexSlug equals realSlug", async () => {
    const result = await renameEpicSlug({
      hexSlug: "same",
      realSlug: "same",
      projectRoot: TEST_ROOT,
    });

    expect(result.renamed).toBe(false);
    expect(result.finalSlug).toBe("same");
    expect(result.error).toBeUndefined();
    expect(result.completedSteps).toEqual([]);
  });
});

describe("findAvailableSlug", () => {
  beforeEach(() => setupTestRepo());
  afterEach(() => cleanup());

  test("returns target slug when no collision", async () => {
    const slug = await findAvailableSlug("my-feature", {
      projectRoot: TEST_ROOT,
    });
    expect(slug).toBe("my-feature");
  });

  test("suffixes -v2 on first collision", async () => {
    execSync("git branch feature/my-feature", {
      cwd: TEST_ROOT,
      stdio: "ignore",
    });

    const slug = await findAvailableSlug("my-feature", {
      projectRoot: TEST_ROOT,
    });
    expect(slug).toBe("my-feature-v2");
  });

  test("increments suffix on multiple collisions", async () => {
    execSync("git branch feature/my-feature", {
      cwd: TEST_ROOT,
      stdio: "ignore",
    });
    execSync("git branch feature/my-feature-v2", {
      cwd: TEST_ROOT,
      stdio: "ignore",
    });

    const slug = await findAvailableSlug("my-feature", {
      projectRoot: TEST_ROOT,
    });
    expect(slug).toBe("my-feature-v3");
  });
});
