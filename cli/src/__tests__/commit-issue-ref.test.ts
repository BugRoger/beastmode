import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseImplBranch,
  resolveIssueNumber,
  appendIssueRef,
  amendCommitWithIssueRef,
} from "../git/commit-issue-ref.js";
import { git } from "../git/worktree.js";
import type { PipelineManifest } from "../manifest/store.js";

// --- Pure function tests (no git repo needed) ---

describe("parseImplBranch", () => {
  test("parses valid impl branch name", () => {
    const result = parseImplBranch("impl/my-epic-5aa1b9--commit-issue-refs");
    expect(result).toEqual({ slug: "my-epic-5aa1b9", feature: "commit-issue-refs" });
  });

  test("parses impl branch with hyphenated slug and feature", () => {
    const result = parseImplBranch("impl/foo-bar-baz--my-feature");
    expect(result).toEqual({ slug: "foo-bar-baz", feature: "my-feature" });
  });

  test("returns undefined for feature branch", () => {
    expect(parseImplBranch("feature/my-epic")).toBeUndefined();
  });

  test("returns undefined for main branch", () => {
    expect(parseImplBranch("main")).toBeUndefined();
  });

  test("returns undefined for empty string", () => {
    expect(parseImplBranch("")).toBeUndefined();
  });

  test("returns undefined for impl/ without double-dash", () => {
    expect(parseImplBranch("impl/no-double-dash")).toBeUndefined();
  });
});

describe("resolveIssueNumber", () => {
  const manifest: PipelineManifest = {
    slug: "my-epic-5aa1b9",
    epic: "my-epic",
    phase: "implement",
    features: [
      {
        slug: "commit-issue-refs",
        plan: "plan.md",
        status: "in-progress",
        github: { issue: 99 },
      },
      {
        slug: "other-feature",
        plan: "other.md",
        status: "pending",
      },
    ],
    artifacts: {},
    github: { epic: 42, repo: "owner/repo" },
    lastUpdated: "2026-04-05T00:00:00Z",
  };

  test("resolves feature issue for impl branch", () => {
    expect(resolveIssueNumber("impl/my-epic-5aa1b9--commit-issue-refs", manifest)).toBe(99);
  });

  test("returns undefined for impl branch with unknown feature", () => {
    expect(resolveIssueNumber("impl/my-epic-5aa1b9--unknown-feature", manifest)).toBeUndefined();
  });

  test("returns undefined for impl branch feature without github issue", () => {
    expect(resolveIssueNumber("impl/my-epic-5aa1b9--other-feature", manifest)).toBeUndefined();
  });

  test("resolves epic issue for feature branch", () => {
    expect(resolveIssueNumber("feature/my-epic-5aa1b9", manifest)).toBe(42);
  });

  test("resolves epic issue for main branch", () => {
    expect(resolveIssueNumber("main", manifest)).toBe(42);
  });

  test("resolves epic issue for master branch", () => {
    expect(resolveIssueNumber("master", manifest)).toBe(42);
  });

  test("returns undefined for unrecognized branch", () => {
    expect(resolveIssueNumber("develop", manifest)).toBeUndefined();
  });

  test("returns undefined when manifest has no github", () => {
    const noGithub: PipelineManifest = { ...manifest, github: undefined };
    expect(resolveIssueNumber("feature/my-epic", noGithub)).toBeUndefined();
  });
});

describe("appendIssueRef", () => {
  test("appends issue ref to simple message", () => {
    expect(appendIssueRef("design(epic): checkpoint", 42)).toBe("design(epic): checkpoint (#42)");
  });

  test("preserves message body", () => {
    const msg = "design(epic): checkpoint\n\nDetailed description here.";
    const result = appendIssueRef(msg, 42);
    expect(result).toBe("design(epic): checkpoint (#42)\n\nDetailed description here.");
  });

  test("does not double-append if already has issue ref", () => {
    const msg = "design(epic): checkpoint (#42)";
    expect(appendIssueRef(msg, 42)).toBe(msg);
  });

  test("does not double-append with different issue number", () => {
    const msg = "design(epic): checkpoint (#99)";
    expect(appendIssueRef(msg, 42)).toBe(msg);
  });

  test("appends to impl task commit", () => {
    expect(appendIssueRef("feat(commit-issue-refs): add parsing", 99))
      .toBe("feat(commit-issue-refs): add parsing (#99)");
  });

  test("appends to release commit", () => {
    expect(appendIssueRef("release(my-epic): v1.0.0", 42))
      .toBe("release(my-epic): v1.0.0 (#42)");
  });
});

// --- Integration tests (real git repo) ---

describe("amendCommitWithIssueRef", () => {
  let repoDir: string;

  const manifest: PipelineManifest = {
    slug: "test-epic-abc123",
    epic: "test-epic",
    phase: "implement",
    features: [
      {
        slug: "my-feature",
        plan: "plan.md",
        status: "in-progress",
        github: { issue: 77 },
      },
    ],
    artifacts: {},
    github: { epic: 42, repo: "owner/repo" },
    lastUpdated: "2026-04-05T00:00:00Z",
  };

  beforeAll(async () => {
    repoDir = await mkdtemp(join(tmpdir(), "beastmode-issue-ref-test-"));
    await git(["init", "-b", "main"], { cwd: repoDir });
    await git(["config", "user.email", "test@test.com"], { cwd: repoDir });
    await git(["config", "user.name", "Test"], { cwd: repoDir });
    await Bun.write(join(repoDir, "README.md"), "# Test\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "initial commit"], { cwd: repoDir });
  });

  afterAll(async () => {
    await rm(repoDir, { recursive: true, force: true });
  });

  test("amends checkpoint commit on feature branch with epic ref", async () => {
    await git(["checkout", "-b", "feature/test-epic-abc123"], { cwd: repoDir });
    await Bun.write(join(repoDir, "file.txt"), "content\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "design(test-epic): checkpoint"], { cwd: repoDir });

    const result = await amendCommitWithIssueRef(manifest, { cwd: repoDir });

    expect(result.amended).toBe(true);
    expect(result.issueNumber).toBe(42);

    const log = await git(["log", "-1", "--format=%s"], { cwd: repoDir });
    expect(log.stdout).toBe("design(test-epic): checkpoint (#42)");

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "feature/test-epic-abc123"], { cwd: repoDir });
  });

  test("amends impl task commit on impl branch with feature ref", async () => {
    await git(["checkout", "-b", "impl/test-epic-abc123--my-feature"], { cwd: repoDir });
    await Bun.write(join(repoDir, "impl.txt"), "impl content\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "feat(my-feature): add parsing"], { cwd: repoDir });

    const result = await amendCommitWithIssueRef(manifest, { cwd: repoDir });

    expect(result.amended).toBe(true);
    expect(result.issueNumber).toBe(77);

    const log = await git(["log", "-1", "--format=%s"], { cwd: repoDir });
    expect(log.stdout).toBe("feat(my-feature): add parsing (#77)");

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "impl/test-epic-abc123--my-feature"], { cwd: repoDir });
  });

  test("amends release commit on main with epic ref", async () => {
    await Bun.write(join(repoDir, "release.txt"), "release content\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "release(test-epic): v1.0.0"], { cwd: repoDir });

    const result = await amendCommitWithIssueRef(manifest, { cwd: repoDir });

    expect(result.amended).toBe(true);
    expect(result.issueNumber).toBe(42);

    const log = await git(["log", "-1", "--format=%s"], { cwd: repoDir });
    expect(log.stdout).toBe("release(test-epic): v1.0.0 (#42)");
  });

  test("no-op when manifest has no github", async () => {
    await Bun.write(join(repoDir, "noop.txt"), "noop\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "some commit"], { cwd: repoDir });

    const noGithub: PipelineManifest = { ...manifest, github: undefined };
    const result = await amendCommitWithIssueRef(noGithub, { cwd: repoDir });

    expect(result.amended).toBe(false);

    const log = await git(["log", "-1", "--format=%s"], { cwd: repoDir });
    expect(log.stdout).toBe("some commit");
  });

  test("no-op when commit already has issue ref", async () => {
    await Bun.write(join(repoDir, "already.txt"), "already\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "design(test-epic): checkpoint (#42)"], { cwd: repoDir });

    const result = await amendCommitWithIssueRef(manifest, { cwd: repoDir });

    expect(result.amended).toBe(false);

    const log = await git(["log", "-1", "--format=%s"], { cwd: repoDir });
    expect(log.stdout).toBe("design(test-epic): checkpoint (#42)");
  });
});
