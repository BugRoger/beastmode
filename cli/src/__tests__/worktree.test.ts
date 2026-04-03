import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { git, gitCheck, create, enter, remove, ensureWorktree, exists, resolveMainBranch, rebase, implBranchName, createImplBranch } from "../git/worktree.js";

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
    expect(info.mainBranch).toBe("main");
    expect(info.forkPoint).toBeDefined();
    expect(info.forkPoint).toMatch(/^[0-9a-f]{40}$/);

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
    expect(info.mainBranch).toBe("main");
    expect(info.forkPoint).toBeDefined();

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
    expect(info1.mainBranch).toBe(info2.mainBranch);
    expect(info1.forkPoint).toBe(info2.forkPoint);

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

describe("worktree exists", () => {
  test("returns false when no worktree exists for slug", async () => {
    const result = await exists("nonexistent-slug", { cwd: repoDir });
    expect(result).toBe(false);
  });

  test("returns true when worktree exists for slug", async () => {
    await create("test-exists-check", { cwd: repoDir });

    const result = await exists("test-exists-check", { cwd: repoDir });
    expect(result).toBe(true);

    // Clean up
    await remove("test-exists-check", { cwd: repoDir });
  });

  test("returns false after worktree is removed", async () => {
    await create("test-exists-removed", { cwd: repoDir });
    await remove("test-exists-removed", { cwd: repoDir });

    const result = await exists("test-exists-removed", { cwd: repoDir });
    expect(result).toBe(false);
  });
});

describe("ensureWorktree", () => {
  test("creates a new worktree when none exists", async () => {
    const info = await ensureWorktree("test-ensure-new", { cwd: repoDir });

    expect(info.slug).toBe("test-ensure-new");
    expect(info.branch).toBe("feature/test-ensure-new");
    expect(info.path).toBe(join(repoDir, ".claude/worktrees/test-ensure-new"));
    expect(info.mainBranch).toBe("main");
    expect(info.forkPoint).toBeDefined();

    // Verify worktree was actually created
    const worktreeExists = await exists("test-ensure-new", { cwd: repoDir });
    expect(worktreeExists).toBe(true);

    // Clean up
    await remove("test-ensure-new", { cwd: repoDir });
  });

  test("reuses existing worktree without modification", async () => {
    // Create the worktree first
    const info1 = await ensureWorktree("test-ensure-reuse", { cwd: repoDir });

    // Add a file so we can verify it's the same worktree
    await Bun.write(join(info1.path, "marker.txt"), "marker\n");
    await git(["add", "."], { cwd: info1.path });
    await git(["commit", "-m", "add marker"], { cwd: info1.path });

    // Ensure again — should reuse
    const info2 = await ensureWorktree("test-ensure-reuse", { cwd: repoDir });

    expect(info2.path).toBe(info1.path);
    expect(info2.branch).toBe(info1.branch);
    expect(info2.mainBranch).toBe(info1.mainBranch);
    expect(info2.forkPoint).toBe(info1.forkPoint);

    // Verify the marker file still exists (worktree was reused, not recreated)
    const markerExists = await Bun.file(join(info2.path, "marker.txt")).exists();
    expect(markerExists).toBe(true);

    // Clean up
    await remove("test-ensure-reuse", { cwd: repoDir });
  });

  test("idempotent: multiple calls return same info", async () => {
    const info1 = await ensureWorktree("test-ensure-idempotent", { cwd: repoDir });
    const info2 = await ensureWorktree("test-ensure-idempotent", { cwd: repoDir });
    const info3 = await ensureWorktree("test-ensure-idempotent", { cwd: repoDir });

    expect(info1.path).toBe(info2.path);
    expect(info2.path).toBe(info3.path);
    expect(info1.branch).toBe(info2.branch);
    expect(info1.mainBranch).toBe(info2.mainBranch);
    expect(info1.forkPoint).toBe(info2.forkPoint);

    // Clean up
    await remove("test-ensure-idempotent", { cwd: repoDir });
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

describe("resolveMainBranch", () => {
  test("falls back to 'main' when no remote is configured", async () => {
    // The test repo has no remote, so symbolic-ref will fail
    const branch = await resolveMainBranch({ cwd: repoDir });
    expect(branch).toBe("main");
  });

  test("resolves branch name from symbolic-ref when remote exists", async () => {
    // Create a second repo to act as "remote", then clone it
    const originDir = await mkdtemp(join(tmpdir(), "beastmode-origin-"));
    await git(["init", "-b", "main"], { cwd: originDir });
    await git(["config", "user.email", "test@test.com"], { cwd: originDir });
    await git(["config", "user.name", "Test"], { cwd: originDir });
    await Bun.write(join(originDir, "README.md"), "# origin\n");
    await git(["add", "."], { cwd: originDir });
    await git(["commit", "-m", "init"], { cwd: originDir });

    // Clone — this sets up refs/remotes/origin/HEAD
    const cloneDir = await mkdtemp(join(tmpdir(), "beastmode-clone-"));
    await git(["clone", originDir, cloneDir]);

    const branch = await resolveMainBranch({ cwd: cloneDir });
    expect(branch).toBe("main");

    // Clean up
    await rm(originDir, { recursive: true, force: true });
    await rm(cloneDir, { recursive: true, force: true });
  });
});

describe("fork-point tracking", () => {
  test("new branch fork-point equals main HEAD SHA", async () => {
    // Get the current main HEAD SHA
    const mainSha = (await git(["rev-parse", "HEAD"], { cwd: repoDir })).stdout;

    const info = await create("test-forkpoint-new", { cwd: repoDir });
    expect(info.forkPoint).toBe(mainSha);

    // Clean up
    await remove("test-forkpoint-new", { cwd: repoDir });
  });

  test("existing branch fork-point derived via merge-base", async () => {
    // Create a feature branch manually and add a commit to it
    await git(["branch", "feature/test-forkpoint-existing"], { cwd: repoDir });
    const expectedBase = (await git(["rev-parse", "HEAD"], { cwd: repoDir })).stdout;

    // Add a commit to main so main moves ahead
    await Bun.write(join(repoDir, "main-change.txt"), "main content\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "advance main"], { cwd: repoDir });

    // Create worktree from existing branch — fork-point should be the merge-base
    const info = await create("test-forkpoint-existing", { cwd: repoDir });
    expect(info.forkPoint).toBe(expectedBase);

    // Clean up
    await remove("test-forkpoint-existing", { cwd: repoDir });
  });

  test("forkPoint is undefined when merge-base fails", async () => {
    // Create an orphan branch — has no common ancestor with main
    const orphanWt = join(repoDir, ".claude/worktrees/test-orphan-setup");
    await git(["worktree", "add", "--detach", orphanWt], { cwd: repoDir });
    await git(["checkout", "--orphan", "feature/test-forkpoint-orphan"], { cwd: orphanWt });
    await Bun.write(join(orphanWt, "orphan.txt"), "orphan\n");
    await git(["add", "."], { cwd: orphanWt });
    await git(["commit", "-m", "orphan commit"], { cwd: orphanWt });
    await git(["worktree", "remove", orphanWt, "--force"], { cwd: repoDir });
    await git(["worktree", "prune"], { cwd: repoDir, allowFailure: true });

    // Now create the worktree from the orphan branch — merge-base will fail
    const info = await create("test-forkpoint-orphan", { cwd: repoDir });
    expect(info.forkPoint).toBeUndefined();

    // Clean up
    await remove("test-forkpoint-orphan", { cwd: repoDir });
  });
});

describe("rebase", () => {
  test("success: rebases onto main when no conflicts", async () => {
    // Create a worktree
    const info = await create("test-rebase-success", { cwd: repoDir });

    // Add a commit on main so there's something to rebase onto
    await Bun.write(join(repoDir, "main-rebase-file.txt"), "main content\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "advance main for rebase test"], { cwd: repoDir });

    // Add a non-conflicting commit in the worktree
    await Bun.write(join(info.path, "feature-file.txt"), "feature content\n");
    await git(["add", "."], { cwd: info.path });
    await git(["commit", "-m", "feature commit"], { cwd: info.path });

    const logs: string[] = [];
    const warns: string[] = [];
    const logger = {
      log: (msg: string) => logs.push(msg),
      warn: (msg: string) => warns.push(msg),
    };

    const result = await rebase("plan", { cwd: info.path, logger });

    expect(result.outcome).toBe("success");
    expect(result.message).toContain("rebased onto");
    expect(logs.length).toBe(1);
    expect(warns.length).toBe(0);

    // Clean up
    await remove("test-rebase-success", { cwd: repoDir });
  });

  test("conflict: aborts rebase and returns conflict", async () => {
    // Create a worktree
    const info = await create("test-rebase-conflict", { cwd: repoDir });

    // Create a conflicting file on main
    await Bun.write(join(repoDir, "conflict-file.txt"), "main version\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "main conflict commit"], { cwd: repoDir });

    // Create the same file with different content in the worktree
    await Bun.write(join(info.path, "conflict-file.txt"), "feature version\n");
    await git(["add", "."], { cwd: info.path });
    await git(["commit", "-m", "feature conflict commit"], { cwd: info.path });

    const logs: string[] = [];
    const warns: string[] = [];
    const logger = {
      log: (msg: string) => logs.push(msg),
      warn: (msg: string) => warns.push(msg),
    };

    const result = await rebase("implement", { cwd: info.path, logger });

    expect(result.outcome).toBe("conflict");
    expect(result.message).toContain("rebase conflict");
    expect(result.message).toContain("stale base");
    expect(warns.length).toBe(1);
    expect(logs.length).toBe(0);

    // Verify rebase was aborted (not in rebase state)
    const statusResult = await git(["status", "--porcelain"], { cwd: info.path, allowFailure: true });
    expect(statusResult.exitCode).toBe(0);

    // Clean up
    await remove("test-rebase-conflict", { cwd: repoDir });
  });

  test("design: skips rebase", async () => {
    const logs: string[] = [];
    const warns: string[] = [];
    const logger = {
      log: (msg: string) => logs.push(msg),
      warn: (msg: string) => warns.push(msg),
    };

    // No cwd needed — design phase should skip without touching git
    const result = await rebase("design", { logger });

    expect(result.outcome).toBe("skipped");
    expect(result.message).toContain("design phase");
    expect(logs.length).toBe(1);
    expect(warns.length).toBe(0);
  });
});

describe("implBranchName", () => {
  test("returns impl/<slug>--<feature> format", () => {
    expect(implBranchName("abc123", "my-feature")).toBe("impl/abc123--my-feature");
  });

  test("handles slug with hyphens", () => {
    expect(implBranchName("my-epic", "auth-flow")).toBe("impl/my-epic--auth-flow");
  });

  test("handles single-character components", () => {
    expect(implBranchName("a", "b")).toBe("impl/a--b");
  });
});

describe("createImplBranch", () => {
  test("creates impl branch from current HEAD when it does not exist", async () => {
    const headSha = (await git(["rev-parse", "HEAD"], { cwd: repoDir })).stdout;

    const branchName = await createImplBranch("test-create-impl", "feat-a", { cwd: repoDir });

    expect(branchName).toBe("impl/test-create-impl--feat-a");

    const branchExists = await gitCheck(
      ["show-ref", "--verify", "--quiet", `refs/heads/${branchName}`],
      { cwd: repoDir },
    );
    expect(branchExists).toBe(true);

    const branchSha = (await git(["rev-parse", branchName], { cwd: repoDir })).stdout;
    expect(branchSha).toBe(headSha);

    // Clean up
    await git(["branch", "-D", branchName], { cwd: repoDir, allowFailure: true });
  });

  test("skips creation and returns name when branch already exists", async () => {
    const branchName = implBranchName("test-idempotent-impl", "feat-b");

    await git(["branch", branchName], { cwd: repoDir });

    const result = await createImplBranch("test-idempotent-impl", "feat-b", { cwd: repoDir });
    expect(result).toBe(branchName);

    // Clean up
    await git(["branch", "-D", branchName], { cwd: repoDir, allowFailure: true });
  });

  test("does not conflict with feature/<slug> worktree branch", async () => {
    const info = await create("test-no-conflict", { cwd: repoDir });

    const branchName = await createImplBranch("test-no-conflict", "feat-c", { cwd: repoDir });
    expect(branchName).toBe("impl/test-no-conflict--feat-c");

    const featureExists = await gitCheck(
      ["show-ref", "--verify", "--quiet", "refs/heads/feature/test-no-conflict"],
      { cwd: repoDir },
    );
    const implExists = await gitCheck(
      ["show-ref", "--verify", "--quiet", `refs/heads/${branchName}`],
      { cwd: repoDir },
    );
    expect(featureExists).toBe(true);
    expect(implExists).toBe(true);

    // Clean up
    await git(["branch", "-D", branchName], { cwd: repoDir, allowFailure: true });
    await remove("test-no-conflict", { cwd: repoDir });
  });
});
