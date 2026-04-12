import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  resolveIssueNumber,
  appendIssueRef,
  amendCommitWithIssueRef,
  resolveCommitIssueNumber,
  resolveRangeStart,
  amendCommitsInRange,
  type IssueRefFeature,
} from "../git/commit-issue-ref.js";
import { git } from "../git/worktree.js";
import type { SyncRefs } from "../github/sync-refs.js";
import type { Logger } from "../logger.js";

function createSpyLogger(): Logger & { messages: string[] } {
  const messages: string[] = [];
  const spy: Logger & { messages: string[] } = {
    messages,
    info(msg: string) { messages.push(`info: ${msg}`); },
    debug(msg: string) { messages.push(`debug: ${msg}`); },
    warn(msg: string) { messages.push(`warn: ${msg}`); },
    error(msg: string) { messages.push(`error: ${msg}`); },
    child() { return spy; },
  };
  return spy;
}

// --- Pure function tests (no git repo needed) ---

describe("resolveIssueNumber", () => {
  const syncRefs: SyncRefs = {
    "epic-id-42": { issue: 42 },
    "feature-id-99": { issue: 99 },
  };

  const features: IssueRefFeature[] = [
    { id: "feature-id-99", slug: "commit-issue-refs" },
    { id: "feature-id-88", slug: "other-feature" },
  ];

  const epicId = "epic-id-42";

  test("resolves epic issue for feature branch", () => {
    expect(resolveIssueNumber("feature/my-epic-5aa1b9", syncRefs, epicId, features)).toBe(42);
  });

  test("resolves epic issue for main branch", () => {
    expect(resolveIssueNumber("main", syncRefs, epicId, features)).toBe(42);
  });

  test("resolves epic issue for master branch", () => {
    expect(resolveIssueNumber("master", syncRefs, epicId, features)).toBe(42);
  });

  test("returns undefined for unrecognized branch", () => {
    expect(resolveIssueNumber("develop", syncRefs, epicId, features)).toBeUndefined();
  });

  test("returns undefined when epic has no sync ref", () => {
    const emptySyncRefs: SyncRefs = {};
    expect(resolveIssueNumber("feature/my-epic", emptySyncRefs, epicId, features)).toBeUndefined();
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
  const syncRefs: SyncRefs = {
    "epic-id-42": { issue: 42 },
    "feature-id-99": { issue: 99 },
    "feature-id-88": { issue: 88 },
  };

  const features: IssueRefFeature[] = [
    { id: "feature-id-99", slug: "commit-traceability" },
    { id: "feature-id-88", slug: "body-enrichment" },
  ];

  const epicId = "epic-id-42";

  test("returns epic issue for phase checkpoint commit", () => {
    expect(resolveCommitIssueNumber("implement(my-epic): checkpoint", syncRefs, epicId, features)).toBe(42);
  });

  test("returns epic issue for design checkpoint", () => {
    expect(resolveCommitIssueNumber("design(my-epic): checkpoint", syncRefs, epicId, features)).toBe(42);
  });

  test("returns feature issue for feat(<feature>): prefix", () => {
    expect(resolveCommitIssueNumber("feat(commit-traceability): add parsing", syncRefs, epicId, features)).toBe(99);
  });

  test("returns epic issue for unrecognized commit message format", () => {
    expect(resolveCommitIssueNumber("some random commit", syncRefs, epicId, features)).toBe(42);
  });

  test("falls back to epic when feature slug not found", () => {
    expect(resolveCommitIssueNumber("feat(unknown-feature): something", syncRefs, epicId, features)).toBe(42);
  });

  test("returns undefined when no sync ref for epic", () => {
    const emptySyncRefs: SyncRefs = {};
    expect(resolveCommitIssueNumber("design(my-epic): checkpoint", emptySyncRefs, epicId, features)).toBeUndefined();
  });
});

// --- Integration tests (real git repo) ---

describe("amendCommitWithIssueRef", () => {
  let repoDir: string;

  const syncRefs: SyncRefs = {
    "epic-id-42": { issue: 42 },
    "feature-id-77": { issue: 77 },
  };

  const features: IssueRefFeature[] = [
    { id: "feature-id-77", slug: "my-feature" },
  ];

  const epicId = "epic-id-42";

  beforeAll(async () => {
    repoDir = await mkdtemp(join(tmpdir(), "beastmode-issue-ref-test-"));
    await git(["init", "-b", "main"], { cwd: repoDir });
    await git(["config", "user.email", "test@test.com"], { cwd: repoDir });
    await git(["config", "user.name", "Test"], { cwd: repoDir });
    writeFileSync(join(repoDir, "README.md"), "# Test\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "initial commit"], { cwd: repoDir });
  });

  afterAll(async () => {
    await rm(repoDir, { recursive: true, force: true });
  });

  test("amends checkpoint commit on feature branch with epic ref", async () => {
    await git(["checkout", "-b", "feature/test-epic-abc123"], { cwd: repoDir });
    writeFileSync(join(repoDir, "file.txt"), "content\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "design(test-epic): checkpoint"], { cwd: repoDir });

    const result = await amendCommitWithIssueRef(syncRefs, epicId, features, { cwd: repoDir });

    expect(result.amended).toBe(true);
    expect(result.issueNumber).toBe(42);

    const log = await git(["log", "-1", "--format=%s"], { cwd: repoDir });
    expect(log.stdout).toBe("design(test-epic): checkpoint (#42)");

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "feature/test-epic-abc123"], { cwd: repoDir });
  });

  test("amends release commit on main with epic ref", async () => {
    writeFileSync(join(repoDir, "release.txt"), "release content\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "release(test-epic): v1.0.0"], { cwd: repoDir });

    const result = await amendCommitWithIssueRef(syncRefs, epicId, features, { cwd: repoDir });

    expect(result.amended).toBe(true);
    expect(result.issueNumber).toBe(42);

    const log = await git(["log", "-1", "--format=%s"], { cwd: repoDir });
    expect(log.stdout).toBe("release(test-epic): v1.0.0 (#42)");
  });

  test("no-op when epic has no sync ref", async () => {
    writeFileSync(join(repoDir, "noop.txt"), "noop\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "some commit"], { cwd: repoDir });

    const emptySyncRefs: SyncRefs = {};
    const result = await amendCommitWithIssueRef(emptySyncRefs, epicId, features, { cwd: repoDir });

    expect(result.amended).toBe(false);

    const log = await git(["log", "-1", "--format=%s"], { cwd: repoDir });
    expect(log.stdout).toBe("some commit");
  });

  test("no-op when commit already has issue ref", async () => {
    writeFileSync(join(repoDir, "already.txt"), "already\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "design(test-epic): checkpoint (#42)"], { cwd: repoDir });

    const result = await amendCommitWithIssueRef(syncRefs, epicId, features, { cwd: repoDir });

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
    writeFileSync(join(repoDir, "README.md"), "# Test\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "initial commit"], { cwd: repoDir });
  });

  afterAll(async () => {
    await rm(repoDir, { recursive: true, force: true });
  });

  test("returns previous phase tag SHA for plan phase", async () => {
    await git(["checkout", "-b", "feature/test-slug"], { cwd: repoDir });
    writeFileSync(join(repoDir, "d.txt"), "d\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "design checkpoint"], { cwd: repoDir });
    await git(["tag", "beastmode/test-slug/design"], { cwd: repoDir });

    writeFileSync(join(repoDir, "p.txt"), "p\n");
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
    writeFileSync(join(repoDir, "n.txt"), "n\n");
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
    writeFileSync(join(repoDir, "m.txt"), "m\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "plan checkpoint"], { cwd: repoDir });

    const result = await resolveRangeStart("missing-tag", "plan", { cwd: repoDir });
    const mergeBase = (await git(["merge-base", "main", "HEAD"], { cwd: repoDir })).stdout;
    expect(result).toBe(mergeBase);

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "feature/missing-tag"], { cwd: repoDir });
  });

  test("logs tag resolution attempt and success", async () => {
    const logger = createSpyLogger();
    await git(["checkout", "-b", "feature/log-tag-hit"], { cwd: repoDir });
    writeFileSync(join(repoDir, "lt1.txt"), "lt1\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "design checkpoint"], { cwd: repoDir });
    await git(["tag", "beastmode/log-tag-hit/design"], { cwd: repoDir });

    writeFileSync(join(repoDir, "lt2.txt"), "lt2\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "plan checkpoint"], { cwd: repoDir });

    await resolveRangeStart("log-tag-hit", "plan", { cwd: repoDir, logger });

    expect(logger.messages.some((m) => m.includes("beastmode/log-tag-hit/design"))).toBe(true);
    expect(logger.messages.some((m) => m.includes("resolved"))).toBe(true);

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "feature/log-tag-hit"], { cwd: repoDir });
    await git(["tag", "-d", "beastmode/log-tag-hit/design"], { cwd: repoDir });
  });

  test("logs merge-base fallback when tag missing", async () => {
    const logger = createSpyLogger();
    await git(["checkout", "-b", "feature/log-mb-fallback"], { cwd: repoDir });
    writeFileSync(join(repoDir, "lm1.txt"), "lm1\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "plan checkpoint"], { cwd: repoDir });

    await resolveRangeStart("log-mb-fallback", "plan", { cwd: repoDir, logger });

    expect(logger.messages.some((m) => m.includes("merge-base"))).toBe(true);

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "feature/log-mb-fallback"], { cwd: repoDir });
  });
});

describe("amendCommitsInRange", () => {
  let repoDir: string;

  const syncRefs: SyncRefs = {
    "epic-id-42": { issue: 42 },
    "feature-id-77": { issue: 77 },
  };

  const features: IssueRefFeature[] = [
    { id: "feature-id-77", slug: "my-feature" },
  ];

  const epicId = "epic-id-42";

  beforeAll(async () => {
    repoDir = await mkdtemp(join(tmpdir(), "beastmode-range-amend-"));
    await git(["init", "-b", "main"], { cwd: repoDir });
    await git(["config", "user.email", "test@test.com"], { cwd: repoDir });
    await git(["config", "user.name", "Test"], { cwd: repoDir });
    writeFileSync(join(repoDir, "README.md"), "# Test\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "initial commit"], { cwd: repoDir });
  });

  afterAll(async () => {
    await rm(repoDir, { recursive: true, force: true });
  });

  test("amends multiple commits with epic issue ref", async () => {
    await git(["checkout", "-b", "feature/test-epic-abc123-multi"], { cwd: repoDir });
    await git(["tag", "beastmode/test-epic-abc123/design-multi"], { cwd: repoDir });

    writeFileSync(join(repoDir, "f1.txt"), "f1\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "plan(test-epic): first change"], { cwd: repoDir });

    writeFileSync(join(repoDir, "f2.txt"), "f2\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "plan(test-epic): second change"], { cwd: repoDir });

    const result = await amendCommitsInRange(syncRefs, epicId, features, "test-epic-abc123", "plan", {
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

    writeFileSync(join(repoDir, "s1.txt"), "s1\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "plan(test-epic): already done (#42)"], { cwd: repoDir });

    writeFileSync(join(repoDir, "s2.txt"), "s2\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "plan(test-epic): needs ref"], { cwd: repoDir });

    const result = await amendCommitsInRange(syncRefs, epicId, features, "test-epic-abc123", "plan", {
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

    writeFileSync(join(repoDir, "n1.txt"), "n1\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "plan(test-epic): done (#42)"], { cwd: repoDir });

    const result = await amendCommitsInRange(syncRefs, epicId, features, "test-epic-abc123", "plan", {
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

    writeFileSync(join(repoDir, "r1.txt"), "r1\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "feat(my-feature): add parsing"], { cwd: repoDir });

    writeFileSync(join(repoDir, "r2.txt"), "r2\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "implement(test-epic): checkpoint"], { cwd: repoDir });

    const result = await amendCommitsInRange(syncRefs, epicId, features, "test-epic-abc123", "plan", {
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

    writeFileSync(join(repoDir, "d1.txt"), "d1\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "design(test-epic): checkpoint"], { cwd: repoDir });

    const result = await amendCommitsInRange(syncRefs, epicId, features, "test-epic-abc123", "design", { cwd: repoDir });

    expect(result.amended).toBe(1);

    const log = await git(["log", "-1", "--format=%s"], { cwd: repoDir });
    expect(log.stdout).toBe("design(test-epic): checkpoint (#42)");

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "feature/test-epic-abc123-des"], { cwd: repoDir });
  });

  test("returns zero when epic has no sync ref", async () => {
    const emptySyncRefs: SyncRefs = {};
    const result = await amendCommitsInRange(emptySyncRefs, epicId, features, "test-epic-abc123", "plan", { cwd: repoDir });
    expect(result.amended).toBe(0);
    expect(result.skipped).toBe(0);
  });

  test("logs debug when epic has no sync ref (exit 1)", async () => {
    const logger = createSpyLogger();
    const emptySyncRefs: SyncRefs = {};
    await amendCommitsInRange(emptySyncRefs, epicId, features, "test-epic-abc123", "plan", { cwd: repoDir, logger });
    expect(logger.messages.some((m) => m.includes("no epic issue"))).toBe(true);
  });

  test("logs debug when range start resolution fails (exit 2)", async () => {
    const logger = createSpyLogger();
    await amendCommitsInRange(syncRefs, epicId, features, "nonexistent-slug", "design", {
      cwd: repoDir,
      rangeStartOverride: "nonexistent-ref-abc123",
      logger,
    });
    expect(logger.messages.some((m) => m.includes("range start"))).toBe(true);
  });

  test("logs debug when all commits already have refs (exit 5)", async () => {
    const logger = createSpyLogger();
    await git(["checkout", "-b", "feature/test-epic-abc123-log5"], { cwd: repoDir });
    await git(["tag", "beastmode/test-epic-abc123/design-log5"], { cwd: repoDir });

    writeFileSync(join(repoDir, "l5.txt"), "l5\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "plan(test-epic): done (#42)"], { cwd: repoDir });

    await amendCommitsInRange(syncRefs, epicId, features, "test-epic-abc123", "plan", {
      cwd: repoDir,
      rangeStartOverride: "beastmode/test-epic-abc123/design-log5",
      logger,
    });

    expect(logger.messages.some((m) => m.includes("already have refs"))).toBe(true);

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "feature/test-epic-abc123-log5"], { cwd: repoDir });
    await git(["tag", "-d", "beastmode/test-epic-abc123/design-log5"], { cwd: repoDir });
  });
});
