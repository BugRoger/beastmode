import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseImplBranch,
  resolveIssueNumber,
  appendIssueRef,
  amendCommitWithIssueRef,
  resolveCommitIssueNumber,
  resolveRangeStart,
  amendCommitsInRange,
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

describe("resolveCommitIssueNumber", () => {
  const manifest: PipelineManifest = {
    slug: "my-epic-5aa1b9",
    epic: "my-epic",
    phase: "implement",
    features: [
      {
        slug: "commit-traceability",
        plan: "plan.md",
        status: "in-progress",
        github: { issue: 99 },
      },
      {
        slug: "body-enrichment",
        plan: "other.md",
        status: "completed",
        github: { issue: 88 },
      },
    ],
    artifacts: {},
    github: { epic: 42, repo: "owner/repo" },
    lastUpdated: "2026-04-05T00:00:00Z",
  };

  test("returns epic issue for phase checkpoint commit", () => {
    expect(resolveCommitIssueNumber("implement(my-epic): checkpoint", manifest)).toBe(42);
  });

  test("returns epic issue for design checkpoint", () => {
    expect(resolveCommitIssueNumber("design(my-epic): checkpoint", manifest)).toBe(42);
  });

  test("returns feature issue for feat(<feature>): prefix", () => {
    expect(resolveCommitIssueNumber("feat(commit-traceability): add parsing", manifest)).toBe(99);
  });

  test("returns feature issue for implement(<slug>--<feature>): prefix", () => {
    expect(resolveCommitIssueNumber("implement(my-epic-5aa1b9--commit-traceability): checkpoint", manifest)).toBe(99);
  });

  test("returns epic issue for unrecognized commit message format", () => {
    expect(resolveCommitIssueNumber("some random commit", manifest)).toBe(42);
  });

  test("falls back to epic when feature slug not found", () => {
    expect(resolveCommitIssueNumber("feat(unknown-feature): something", manifest)).toBe(42);
  });

  test("returns undefined when no github on manifest", () => {
    const noGithub: PipelineManifest = { ...manifest, github: undefined };
    expect(resolveCommitIssueNumber("design(my-epic): checkpoint", noGithub)).toBeUndefined();
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

describe("resolveRangeStart", () => {
  let repoDir: string;

  beforeAll(async () => {
    repoDir = await mkdtemp(join(tmpdir(), "beastmode-range-start-"));
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

  test("returns previous phase tag SHA for plan phase", async () => {
    await git(["checkout", "-b", "feature/test-slug"], { cwd: repoDir });
    await Bun.write(join(repoDir, "d.txt"), "d\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "design checkpoint"], { cwd: repoDir });
    await git(["tag", "beastmode/test-slug/design"], { cwd: repoDir });

    await Bun.write(join(repoDir, "p.txt"), "p\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "plan checkpoint"], { cwd: repoDir });

    const result = await resolveRangeStart("test-slug", "plan", { cwd: repoDir });
    const tagSha = (await git(["rev-parse", "beastmode/test-slug/design"], { cwd: repoDir })).stdout;
    expect(result).toBe(tagSha);

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "feature/test-slug"], { cwd: repoDir });
    await git(["tag", "-d", "beastmode/test-slug/design"], { cwd: repoDir });
  });

  test("returns merge-base for design phase (no previous tag)", async () => {
    await git(["checkout", "-b", "feature/new-slug"], { cwd: repoDir });
    await Bun.write(join(repoDir, "n.txt"), "n\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "design checkpoint"], { cwd: repoDir });

    const result = await resolveRangeStart("new-slug", "design", { cwd: repoDir });
    const mergeBase = (await git(["merge-base", "main", "HEAD"], { cwd: repoDir })).stdout;
    expect(result).toBe(mergeBase);

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "feature/new-slug"], { cwd: repoDir });
  });

  test("falls back to merge-base when previous phase tag is missing", async () => {
    await git(["checkout", "-b", "feature/missing-tag"], { cwd: repoDir });
    await Bun.write(join(repoDir, "m.txt"), "m\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "plan checkpoint"], { cwd: repoDir });

    const result = await resolveRangeStart("missing-tag", "plan", { cwd: repoDir });
    const mergeBase = (await git(["merge-base", "main", "HEAD"], { cwd: repoDir })).stdout;
    expect(result).toBe(mergeBase);

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "feature/missing-tag"], { cwd: repoDir });
  });
});

describe("amendCommitsInRange", () => {
  let repoDir: string;

  const manifest: PipelineManifest = {
    slug: "test-epic-abc123",
    epic: "test-epic",
    phase: "plan",
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
    repoDir = await mkdtemp(join(tmpdir(), "beastmode-range-amend-"));
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

  test("amends multiple commits with epic issue ref", async () => {
    await git(["checkout", "-b", "feature/test-epic-abc123-multi"], { cwd: repoDir });
    await git(["tag", "beastmode/test-epic-abc123/design-multi"], { cwd: repoDir });

    await Bun.write(join(repoDir, "f1.txt"), "f1\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "plan(test-epic): first change"], { cwd: repoDir });

    await Bun.write(join(repoDir, "f2.txt"), "f2\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "plan(test-epic): second change"], { cwd: repoDir });

    const result = await amendCommitsInRange(manifest, "test-epic-abc123", "plan", {
      cwd: repoDir,
      rangeStartOverride: "beastmode/test-epic-abc123/design-multi",
    });

    expect(result.amended).toBe(2);
    expect(result.skipped).toBe(0);

    const log = await git(["log", "--format=%s", "beastmode/test-epic-abc123/design-multi..HEAD"], { cwd: repoDir });
    const subjects = log.stdout.split("\n").filter(Boolean);
    expect(subjects).toEqual([
      "plan(test-epic): second change (#42)",
      "plan(test-epic): first change (#42)",
    ]);

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "feature/test-epic-abc123-multi"], { cwd: repoDir });
    await git(["tag", "-d", "beastmode/test-epic-abc123/design-multi"], { cwd: repoDir });
  });

  test("skips commits that already have issue refs", async () => {
    await git(["checkout", "-b", "feature/test-epic-abc123-skip"], { cwd: repoDir });
    await git(["tag", "beastmode/test-epic-abc123/design-skip"], { cwd: repoDir });

    await Bun.write(join(repoDir, "s1.txt"), "s1\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "plan(test-epic): already done (#42)"], { cwd: repoDir });

    await Bun.write(join(repoDir, "s2.txt"), "s2\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "plan(test-epic): needs ref"], { cwd: repoDir });

    const result = await amendCommitsInRange(manifest, "test-epic-abc123", "plan", {
      cwd: repoDir,
      rangeStartOverride: "beastmode/test-epic-abc123/design-skip",
    });

    expect(result.amended).toBe(1);
    expect(result.skipped).toBe(1);

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "feature/test-epic-abc123-skip"], { cwd: repoDir });
    await git(["tag", "-d", "beastmode/test-epic-abc123/design-skip"], { cwd: repoDir });
  });

  test("no-op when all commits already have refs", async () => {
    await git(["checkout", "-b", "feature/test-epic-abc123-noop"], { cwd: repoDir });
    await git(["tag", "beastmode/test-epic-abc123/design-noop"], { cwd: repoDir });

    await Bun.write(join(repoDir, "n1.txt"), "n1\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "plan(test-epic): done (#42)"], { cwd: repoDir });

    const result = await amendCommitsInRange(manifest, "test-epic-abc123", "plan", {
      cwd: repoDir,
      rangeStartOverride: "beastmode/test-epic-abc123/design-noop",
    });

    expect(result.amended).toBe(0);
    expect(result.skipped).toBe(1);

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "feature/test-epic-abc123-noop"], { cwd: repoDir });
    await git(["tag", "-d", "beastmode/test-epic-abc123/design-noop"], { cwd: repoDir });
  });

  test("routes feat(<feature>) commits to feature issue ref", async () => {
    await git(["checkout", "-b", "feature/test-epic-abc123-route"], { cwd: repoDir });
    await git(["tag", "beastmode/test-epic-abc123/design-route"], { cwd: repoDir });

    await Bun.write(join(repoDir, "r1.txt"), "r1\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "feat(my-feature): add parsing"], { cwd: repoDir });

    await Bun.write(join(repoDir, "r2.txt"), "r2\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "implement(test-epic): checkpoint"], { cwd: repoDir });

    const result = await amendCommitsInRange(manifest, "test-epic-abc123", "plan", {
      cwd: repoDir,
      rangeStartOverride: "beastmode/test-epic-abc123/design-route",
    });

    expect(result.amended).toBe(2);

    const log = await git(["log", "--format=%s", "beastmode/test-epic-abc123/design-route..HEAD"], { cwd: repoDir });
    const subjects = log.stdout.split("\n").filter(Boolean);
    expect(subjects).toEqual([
      "implement(test-epic): checkpoint (#42)",
      "feat(my-feature): add parsing (#77)",
    ]);

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "feature/test-epic-abc123-route"], { cwd: repoDir });
    await git(["tag", "-d", "beastmode/test-epic-abc123/design-route"], { cwd: repoDir });
  });

  test("uses merge-base for design phase", async () => {
    await git(["checkout", "-b", "feature/test-epic-abc123-des"], { cwd: repoDir });

    await Bun.write(join(repoDir, "d1.txt"), "d1\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "design(test-epic): checkpoint"], { cwd: repoDir });

    const result = await amendCommitsInRange(manifest, "test-epic-abc123", "design", { cwd: repoDir });

    expect(result.amended).toBe(1);

    const log = await git(["log", "-1", "--format=%s"], { cwd: repoDir });
    expect(log.stdout).toBe("design(test-epic): checkpoint (#42)");

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "feature/test-epic-abc123-des"], { cwd: repoDir });
  });

  test("returns zero when manifest has no github", async () => {
    const noGithub: PipelineManifest = { ...manifest, github: undefined };
    const result = await amendCommitsInRange(noGithub, "test-epic-abc123", "plan", { cwd: repoDir });
    expect(result.amended).toBe(0);
    expect(result.skipped).toBe(0);
  });
});
