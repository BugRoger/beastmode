import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { git, gitCheck } from "../src/git.js";
import { create, enter, merge, remove } from "../src/worktree.js";

/**
 * Integration tests for the worktree manager.
 * Uses a temporary git repo to exercise real git operations.
 */

let repoDir: string;
let mainBranch: string;

beforeAll(async () => {
  // Create a temporary bare-ish repo with an initial commit
  repoDir = await mkdtemp(join(tmpdir(), "beastmode-wt-test-"));
  await git(["init", "-b", "main"], { cwd: repoDir });
  await git(["config", "user.email", "test@test.com"], { cwd: repoDir });
  await git(["config", "user.name", "Test"], { cwd: repoDir });
  mainBranch = "main";

  // Create an initial commit so HEAD exists
  const filePath = join(repoDir, "README.md");
  await Bun.write(filePath, "# Test repo\n");
  await git(["add", "."], { cwd: repoDir });
  await git(["commit", "-m", "initial commit"], { cwd: repoDir });
});

afterAll(async () => {
  // Clean up temp directory
  await rm(repoDir, { recursive: true, force: true });
});

describe("worktree create", () => {
  test("creates worktree with new branch when no feature branch exists", async () => {
    const info = await create("test-new", { cwd: repoDir });

    expect(info.slug).toBe("test-new");
    expect(info.branch).toBe("feature/test-new");
    expect(info.path).toBe(join(repoDir, ".claude/worktrees/test-new"));

    // Verify the branch was created
    const branchExists = await gitCheck(
      ["show-ref", "--verify", "--quiet", "refs/heads/feature/test-new"],
      { cwd: repoDir },
    );
    expect(branchExists).toBe(true);

    // Clean up
    await remove("test-new", { cwd: repoDir });
  });

  test("reuses existing local feature branch", async () => {
    // Create a feature branch manually
    await git(["branch", "feature/test-existing"], { cwd: repoDir });

    const info = await create("test-existing", { cwd: repoDir });
    expect(info.branch).toBe("feature/test-existing");

    // Verify worktree points to the existing branch
    const wtBranch = (
      await git(["rev-parse", "--abbrev-ref", "HEAD"], { cwd: info.path })
    ).stdout;
    expect(wtBranch).toBe("feature/test-existing");

    // Clean up
    await remove("test-existing", { cwd: repoDir });
  });

  test("prunes stale worktree references on create", async () => {
    // This should not throw — prune runs silently
    const info = await create("test-prune", { cwd: repoDir });
    expect(info.slug).toBe("test-prune");

    // Clean up
    await remove("test-prune", { cwd: repoDir });
  });

  test("returns existing worktree if already created", async () => {
    const info1 = await create("test-idempotent", { cwd: repoDir });
    const info2 = await create("test-idempotent", { cwd: repoDir });

    expect(info1.path).toBe(info2.path);
    expect(info1.branch).toBe(info2.branch);

    // Clean up
    await remove("test-idempotent", { cwd: repoDir });
  });
});

describe("worktree enter", () => {
  test("returns absolute path to worktree directory", () => {
    const path = enter("my-feature", { cwd: repoDir });
    expect(path).toBe(join(repoDir, ".claude/worktrees/my-feature"));
  });
});

describe("worktree merge", () => {
  test("squash-merges feature branch to main", async () => {
    // Create worktree with a change
    const info = await create("test-merge", { cwd: repoDir });

    // Add a file in the worktree
    await Bun.write(join(info.path, "feature.txt"), "feature content\n");
    await git(["add", "."], { cwd: info.path });
    await git(["commit", "-m", "add feature file"], { cwd: info.path });

    // Remove worktree first (merge needs main checkout)
    await git(["worktree", "remove", ".claude/worktrees/test-merge", "--force"], { cwd: repoDir });
    await git(["worktree", "prune"], { cwd: repoDir, allowFailure: true });

    // Merge back to main
    await merge("test-merge", { cwd: repoDir, mainBranch });

    // Verify the file exists on main
    const result = await git(["log", "--oneline", "-1"], { cwd: repoDir });
    expect(result.stdout).toContain("test-merge");

    // Clean up branch
    await git(["branch", "-D", "feature/test-merge"], {
      cwd: repoDir,
      allowFailure: true,
    });
  });
});

describe("worktree remove", () => {
  test("removes worktree directory and deletes branch", async () => {
    const info = await create("test-remove", { cwd: repoDir });
    expect(info.path).toBeTruthy();

    await remove("test-remove", { cwd: repoDir, deleteBranch: true });

    // Verify branch is gone
    const branchExists = await gitCheck(
      ["show-ref", "--verify", "--quiet", "refs/heads/feature/test-remove"],
      { cwd: repoDir },
    );
    expect(branchExists).toBe(false);
  });

  test("removes worktree but keeps branch when deleteBranch is false", async () => {
    const info = await create("test-keep-branch", { cwd: repoDir });
    await remove("test-keep-branch", { cwd: repoDir, deleteBranch: false });

    // Branch should still exist
    const branchExists = await gitCheck(
      ["show-ref", "--verify", "--quiet", "refs/heads/feature/test-keep-branch"],
      { cwd: repoDir },
    );
    expect(branchExists).toBe(true);

    // Clean up
    await git(["branch", "-D", "feature/test-keep-branch"], {
      cwd: repoDir,
      allowFailure: true,
    });
  });
});

describe("git helper", () => {
  test("git() returns stdout on success", async () => {
    const result = await git(["rev-parse", "--git-dir"], { cwd: repoDir });
    expect(result.stdout).toBe(".git");
    expect(result.exitCode).toBe(0);
  });

  test("git() throws on failure by default", async () => {
    expect(
      git(["checkout", "nonexistent-branch-xyz"], { cwd: repoDir }),
    ).rejects.toThrow();
  });

  test("git() returns result on failure when allowFailure is true", async () => {
    const result = await git(["checkout", "nonexistent-branch-xyz"], {
      cwd: repoDir,
      allowFailure: true,
    });
    expect(result.exitCode).not.toBe(0);
  });

  test("gitCheck() returns boolean", async () => {
    const exists = await gitCheck(["rev-parse", "--git-dir"], {
      cwd: repoDir,
    });
    expect(exists).toBe(true);

    const notExists = await gitCheck(
      ["show-ref", "--verify", "--quiet", "refs/heads/no-such-branch-xyz"],
      { cwd: repoDir },
    );
    expect(notExists).toBe(false);
  });
});
