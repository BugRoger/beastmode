/**
 * Unit tests for path normalization fixes in sync.ts.
 * Tests readPrdSections, syncFeature plan reading, and buildArtifactsMap
 * with absolute, repo-relative, and bare filename path formats.
 */
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { InMemoryTaskStore } from "../store/in-memory";
import { saveSyncRefs } from "../github/sync-refs";

// --- Mock gh CLI ---
const mockCalls: { fn: string; args: unknown[] }[] = [];

function trackCall(fn: string, ...args: unknown[]): void {
  mockCalls.push({ fn, args });
}

function callsTo(fn: string): { fn: string; args: unknown[] }[] {
  return mockCalls.filter((c) => c.fn === fn);
}

vi.mock("../github/cli", () => ({
  ghIssueCreate: async (...args: unknown[]) => {
    trackCall("ghIssueCreate", ...args);
    return 42;
  },
  ghIssueEdit: async (...args: unknown[]) => {
    trackCall("ghIssueEdit", ...args);
    return true;
  },
  ghIssueClose: async () => true,
  ghIssueReopen: async () => true,
  ghIssueComment: async () => true,
  ghIssueComments: async () => [],
  ghIssueState: async () => "open",
  ghIssueLabels: async () => ["type/epic", "phase/plan"],
  ghProjectItemAdd: async () => "item-123",
  ghProjectItemDelete: async () => true,
  ghProjectSetField: async () => true,
  ghSubIssueAdd: async () => true,
}));

vi.mock("../github/discovery", () => ({
  discoverGitHub: async () => ({
    repo: "org/repo",
    projectNumber: 7,
    projectId: "PVT_123",
  }),
}));

vi.mock("../config", () => ({
  loadConfig: () => ({
    github: { enabled: true, "project-name": "Test Board" },
    cli: { interval: 60 },
  }),
}));

const { syncGitHubForEpic } = await import("../github/sync");

const DESIGN_CONTENT = `---
phase: design
---

## Problem Statement

Test problem statement.

## Solution

Test solution.

## User Stories

1. As a tester, I want paths to work.

## Implementation Decisions

- Use basename

## Testing Decisions

- Unit tests for all formats

## Out of Scope

- Store migration
`;

describe("readPrdSections path normalization", () => {
  let tmpDir: string;
  let store: InMemoryTaskStore;

  beforeEach(() => {
    mockCalls.length = 0;
    tmpDir = mkdtempSync(join(tmpdir(), "sync-path-norm-"));
    store = new InMemoryTaskStore();

    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    writeFileSync(join(designDir, "2026-04-05-slug.md"), DESIGN_CONTENT);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("resolves absolute worktree path to correct design file", async () => {
    const epic = store.addEpic({ name: "Test", slug: "test" });
    const absPath = join(tmpDir, ".beastmode", "artifacts", "design", "2026-04-05-slug.md");
    store.updateEpic(epic.id, { status: "plan", design: absPath });

    await syncGitHubForEpic({
      projectRoot: tmpDir,
      epicId: epic.id,
      epicSlug: "test",
      store,
      resolved: { repo: "org/repo" },
    });

    const body = callsTo("ghIssueCreate")[0]?.args[2] as string;
    expect(body).toContain("Test problem statement");
    expect(body).toContain("Test solution");
  });

  test("resolves bare filename to correct design file", async () => {
    const epic = store.addEpic({ name: "Test", slug: "test" });
    store.updateEpic(epic.id, { status: "plan", design: "2026-04-05-slug.md" });

    await syncGitHubForEpic({
      projectRoot: tmpDir,
      epicId: epic.id,
      epicSlug: "test",
      store,
      resolved: { repo: "org/repo" },
    });

    const body = callsTo("ghIssueCreate")[0]?.args[2] as string;
    expect(body).toContain("Test problem statement");
    expect(body).toContain("Test solution");
  });

  test("resolves repo-relative path to correct design file", async () => {
    const epic = store.addEpic({ name: "Test", slug: "test" });
    store.updateEpic(epic.id, {
      status: "plan",
      design: ".beastmode/artifacts/design/2026-04-05-slug.md",
    });

    await syncGitHubForEpic({
      projectRoot: tmpDir,
      epicId: epic.id,
      epicSlug: "test",
      store,
      resolved: { repo: "org/repo" },
    });

    const body = callsTo("ghIssueCreate")[0]?.args[2] as string;
    expect(body).toContain("Test problem statement");
    expect(body).toContain("Test solution");
  });

  test("extracts all six PRD sections from absolute path", async () => {
    const epic = store.addEpic({ name: "Test", slug: "test" });
    const absPath = join(tmpDir, ".beastmode", "artifacts", "design", "2026-04-05-slug.md");
    store.updateEpic(epic.id, { status: "plan", design: absPath });

    await syncGitHubForEpic({
      projectRoot: tmpDir,
      epicId: epic.id,
      epicSlug: "test",
      store,
      resolved: { repo: "org/repo" },
    });

    const body = callsTo("ghIssueCreate")[0]?.args[2] as string;
    expect(body).toContain("Test problem statement");
    expect(body).toContain("Test solution");
    expect(body).toContain("As a tester, I want paths to work");
    expect(body).toContain("Use basename");
    expect(body).toContain("Unit tests for all formats");
    expect(body).toContain("Store migration");
  });
});

const PLAN_CONTENT = `---
phase: plan
---

## User Stories

1. As a user, I want plan paths to resolve.

## What to Build

Build the plan resolver.

## Acceptance Criteria

- [ ] Plan resolves from any format
`;

describe("syncFeature plan path normalization", () => {
  let tmpDir: string;
  let store: InMemoryTaskStore;

  beforeEach(() => {
    mockCalls.length = 0;
    tmpDir = mkdtempSync(join(tmpdir(), "sync-plan-norm-"));
    store = new InMemoryTaskStore();

    const planDir = join(tmpDir, ".beastmode", "artifacts", "plan");
    mkdirSync(planDir, { recursive: true });
    writeFileSync(join(planDir, "2026-04-05-test-my-feat.md"), PLAN_CONTENT);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("resolves bare filename to correct plan file", async () => {
    const epic = store.addEpic({ name: "Test", slug: "test" });
    store.updateEpic(epic.id, { status: "implement" });
    const feat = store.addFeature({
      parent: epic.id,
      name: "my-feat",
      slug: "my-feat",
      description: "Desc",
    });
    store.updateFeature(feat.id, { plan: "2026-04-05-test-my-feat.md" });
    saveSyncRefs(tmpDir, { [epic.id]: { issue: 10 } });

    await syncGitHubForEpic({
      projectRoot: tmpDir,
      epicId: epic.id,
      epicSlug: "test",
      store,
      resolved: { repo: "org/repo" },
    });

    const featureCreate = callsTo("ghIssueCreate").find((c) =>
      (c.args[1] as string).includes("my-feat"),
    );
    expect(featureCreate).toBeDefined();
    const body = featureCreate!.args[2] as string;
    expect(body).toContain("As a user, I want plan paths to resolve");
    expect(body).toContain("Build the plan resolver");
    expect(body).toContain("Plan resolves from any format");
  });

  test("resolves repo-relative path to correct plan file", async () => {
    const epic = store.addEpic({ name: "Test", slug: "test" });
    store.updateEpic(epic.id, { status: "implement" });
    const feat = store.addFeature({
      parent: epic.id,
      name: "my-feat",
      slug: "my-feat",
      description: "Desc",
    });
    store.updateFeature(feat.id, {
      plan: ".beastmode/artifacts/plan/2026-04-05-test-my-feat.md",
    });
    saveSyncRefs(tmpDir, { [epic.id]: { issue: 10 } });

    await syncGitHubForEpic({
      projectRoot: tmpDir,
      epicId: epic.id,
      epicSlug: "test",
      store,
      resolved: { repo: "org/repo" },
    });

    const featureCreate = callsTo("ghIssueCreate").find((c) =>
      (c.args[1] as string).includes("my-feat"),
    );
    expect(featureCreate).toBeDefined();
    const body = featureCreate!.args[2] as string;
    expect(body).toContain("As a user, I want plan paths to resolve");
    expect(body).toContain("Build the plan resolver");
  });

  test("resolves absolute worktree path to correct plan file", async () => {
    const epic = store.addEpic({ name: "Test", slug: "test" });
    store.updateEpic(epic.id, { status: "implement" });
    const feat = store.addFeature({
      parent: epic.id,
      name: "my-feat",
      slug: "my-feat",
      description: "Desc",
    });
    const absPath = join(tmpDir, ".beastmode", "artifacts", "plan", "2026-04-05-test-my-feat.md");
    store.updateFeature(feat.id, { plan: absPath });
    saveSyncRefs(tmpDir, { [epic.id]: { issue: 10 } });

    await syncGitHubForEpic({
      projectRoot: tmpDir,
      epicId: epic.id,
      epicSlug: "test",
      store,
      resolved: { repo: "org/repo" },
    });

    const featureCreate = callsTo("ghIssueCreate").find((c) =>
      (c.args[1] as string).includes("my-feat"),
    );
    expect(featureCreate).toBeDefined();
    const body = featureCreate!.args[2] as string;
    expect(body).toContain("As a user, I want plan paths to resolve");
  });
});

describe("buildArtifactsMap path normalization", () => {
  let tmpDir: string;
  let store: InMemoryTaskStore;

  beforeEach(() => {
    mockCalls.length = 0;
    tmpDir = mkdtempSync(join(tmpdir(), "sync-artifacts-norm-"));
    store = new InMemoryTaskStore();

    // Create design artifact so PRD sections can be read
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    writeFileSync(
      join(designDir, "2026-04-05-slug.md"),
      "---\nphase: design\n---\n\n## Problem Statement\n\nTest.\n",
    );
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("normalizes absolute worktree path to repo-relative display path", async () => {
    const epic = store.addEpic({ name: "Test", slug: "test" });
    const absPath = "/Users/someone/.claude/worktrees/old-slug/.beastmode/artifacts/design/2026-04-05-slug.md";
    store.updateEpic(epic.id, { status: "plan", design: absPath });

    await syncGitHubForEpic({
      projectRoot: tmpDir,
      epicId: epic.id,
      epicSlug: "test",
      store,
      resolved: { repo: "org/repo" },
    });

    const body = callsTo("ghIssueCreate")[0]?.args[2] as string;
    // Artifact table should have clean path
    expect(body).toContain(".beastmode/artifacts/design/2026-04-05-slug.md");
    // Should NOT contain the stale worktree prefix
    expect(body).not.toContain("/Users/someone");
    expect(body).not.toContain("worktrees");
  });

  test("normalizes bare filename to repo-relative display path", async () => {
    const epic = store.addEpic({ name: "Test", slug: "test" });
    store.updateEpic(epic.id, { status: "plan", design: "2026-04-05-slug.md" });

    await syncGitHubForEpic({
      projectRoot: tmpDir,
      epicId: epic.id,
      epicSlug: "test",
      store,
      resolved: { repo: "org/repo" },
    });

    const body = callsTo("ghIssueCreate")[0]?.args[2] as string;
    expect(body).toContain(".beastmode/artifacts/design/2026-04-05-slug.md");
  });

  test("preserves already-correct repo-relative path", async () => {
    const epic = store.addEpic({ name: "Test", slug: "test" });
    store.updateEpic(epic.id, {
      status: "plan",
      design: ".beastmode/artifacts/design/2026-04-05-slug.md",
    });

    await syncGitHubForEpic({
      projectRoot: tmpDir,
      epicId: epic.id,
      epicSlug: "test",
      store,
      resolved: { repo: "org/repo" },
    });

    const body = callsTo("ghIssueCreate")[0]?.args[2] as string;
    expect(body).toContain(".beastmode/artifacts/design/2026-04-05-slug.md");
  });

  test("normalizes paths for all phase types", async () => {
    const epic = store.addEpic({ name: "Test", slug: "test" });
    store.updateEpic(epic.id, {
      status: "validate",
      design: "/abs/path/.beastmode/artifacts/design/design-file.md",
      validate: "/abs/path/.beastmode/artifacts/validate/validate-file.md",
    });

    await syncGitHubForEpic({
      projectRoot: tmpDir,
      epicId: epic.id,
      epicSlug: "test",
      store,
      resolved: { repo: "org/repo" },
    });

    const body = callsTo("ghIssueCreate")[0]?.args[2] as string;
    expect(body).toContain(".beastmode/artifacts/design/design-file.md");
    expect(body).toContain(".beastmode/artifacts/validate/validate-file.md");
    expect(body).not.toContain("/abs/path/");
  });
});
