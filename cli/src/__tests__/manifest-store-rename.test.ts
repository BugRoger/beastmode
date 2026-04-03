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
import { rename } from "../manifest/store";

const TEST_ROOT = resolve(import.meta.dir, "../../.test-manifest-rename");

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

describe("rename", () => {
  beforeEach(() => setupTestRepo());
  afterEach(() => cleanup());

  test("happy path: renames all resources", async () => {
    createTestWorktree("abc123");
    createTestManifest("abc123");

    const result = await rename(TEST_ROOT, "abc123", "My Feature");

    expect(result.renamed).toBe(true);
    expect(result.finalSlug).toBe("my-feature");
    expect(result.error).toBeUndefined();

    // Branch renamed
    expect(branchExists("feature/my-feature")).toBe(true);
    expect(branchExists("feature/abc123")).toBe(false);

    // Worktree dir renamed
    expect(existsSync(resolve(TEST_ROOT, ".claude", "worktrees", "my-feature"))).toBe(true);
    expect(existsSync(resolve(TEST_ROOT, ".claude", "worktrees", "abc123"))).toBe(false);

    // Manifest file renamed
    expect(findManifestFile("my-feature")).toBeDefined();
    expect(findManifestFile("abc123")).toBeUndefined();

    // Manifest internals updated
    const manifest = readManifest("my-feature");
    expect(manifest.slug).toBe("my-feature");
    expect(manifest.epic).toBe("my-feature");
    expect(manifest.originId).toBe("abc123");
    const wt = manifest.worktree as Record<string, string>;
    expect(wt.branch).toBe("feature/my-feature");
  });

  test("collision uses hex suffix", async () => {
    createTestWorktree("abc123");
    createTestManifest("abc123");

    // Create colliding branch
    execSync("git branch feature/my-feature", {
      cwd: TEST_ROOT,
      stdio: "ignore",
    });

    const result = await rename(TEST_ROOT, "abc123", "My Feature");

    expect(result.renamed).toBe(true);
    expect(result.finalSlug).toBe("my-feature-abc123");
    expect(branchExists("feature/my-feature-abc123")).toBe(true);

    const manifest = readManifest("my-feature-abc123");
    expect(manifest.originId).toBe("abc123");
  });

  test("rejects invalid format after slugify", async () => {
    const result = await rename(TEST_ROOT, "abc123", "!!!");

    expect(result.renamed).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain("Cannot slugify");
  });

  test("precondition failure: missing branch", async () => {
    // Create worktree dir + manifest but no branch
    mkdirSync(resolve(TEST_ROOT, ".claude", "worktrees", "abc123"), { recursive: true });
    createTestManifest("abc123");

    const result = await rename(TEST_ROOT, "abc123", "my-feature");

    expect(result.renamed).toBe(false);
    expect(result.error).toContain("Branch not found");
    expect(result.completedSteps).toEqual([]);
  });

  test("precondition failure: missing worktree dir", async () => {
    // Create branch + manifest but no worktree dir
    execSync("git branch feature/abc123", { cwd: TEST_ROOT, stdio: "ignore" });
    createTestManifest("abc123");

    const result = await rename(TEST_ROOT, "abc123", "my-feature");

    expect(result.renamed).toBe(false);
    expect(result.error).toContain("Worktree directory not found");
    expect(result.completedSteps).toEqual([]);
  });

  test("precondition failure: missing manifest", async () => {
    createTestWorktree("abc123");
    // No manifest created

    const result = await rename(TEST_ROOT, "abc123", "my-feature");

    expect(result.renamed).toBe(false);
    expect(result.error).toContain("Manifest not found");
    expect(result.completedSteps).toEqual([]);
  });

  test("no-op when slugs match", async () => {
    const result = await rename(TEST_ROOT, "same", "same");

    expect(result.renamed).toBe(false);
    expect(result.finalSlug).toBe("same");
    expect(result.error).toBeUndefined();
    expect(result.completedSteps).toEqual([]);
  });

  test("slugifies the epic name before rename", async () => {
    createTestWorktree("abc123");
    createTestManifest("abc123");

    const result = await rename(TEST_ROOT, "abc123", "My Cool Feature!");

    expect(result.renamed).toBe(true);
    expect(result.finalSlug).toBe("my-cool-feature");
  });
});
