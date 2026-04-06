/**
 * Integration test for artifact path normalization.
 * Exercises readPrdSections, syncFeature plan reading, and buildArtifactsMap
 * through the syncGitHubForEpic entry point with various path formats.
 *
 * @fix-worktree-paths
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
  ghIssueClose: async (...args: unknown[]) => {
    trackCall("ghIssueClose", ...args);
    return true;
  },
  ghIssueReopen: async () => true,
  ghIssueComment: async () => true,
  ghIssueComments: async () => [],
  ghIssueState: async () => "open",
  ghIssueLabels: async (...args: unknown[]) => {
    trackCall("ghIssueLabels", ...args);
    return ["type/epic", "phase/implement"];
  },
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

The logging system is broken.

## Solution

Fix the logging pipeline.

## User Stories

1. As a developer, I want consistent logs.

## Implementation Decisions

- Use structured logging

## Testing Decisions

- Unit test each adapter

## Out of Scope

- Dashboard
`;

const PLAN_CONTENT = `---
phase: plan
---

## User Stories

1. As a user, I want enriched features.

## What to Build

Build the normalization layer.

## Acceptance Criteria

- [ ] Paths resolve correctly
`;

describe("Artifact Path Normalization Integration", () => {
  let tmpDir: string;
  let store: InMemoryTaskStore;
  let designDir: string;
  let planDir: string;

  beforeEach(() => {
    mockCalls.length = 0;
    tmpDir = mkdtempSync(join(tmpdir(), "artifact-path-norm-"));
    store = new InMemoryTaskStore();

    designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    planDir = join(tmpDir, ".beastmode", "artifacts", "plan");
    mkdirSync(designDir, { recursive: true });
    mkdirSync(planDir, { recursive: true });

    writeFileSync(join(designDir, "2026-04-05-test.md"), DESIGN_CONTENT);
    writeFileSync(join(planDir, "2026-04-05-test-my-feat.md"), PLAN_CONTENT);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  // --- Epic body enrichment with path normalization (US1, US4) ---

  describe("Epic body contains full PRD when design path is an absolute worktree path", () => {
    test("body contains all six PRD sections", async () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "test-epic" });
      const absPath = join(tmpDir, ".beastmode", "artifacts", "design", "2026-04-05-test.md");
      store.updateEpic(epic.id, { status: "plan", design: absPath });

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId: epic.id,
        epicSlug: "test-epic",
        store,
        resolved: { repo: "org/repo" },
      });

      const createCalls = callsTo("ghIssueCreate");
      expect(createCalls.length).toBeGreaterThanOrEqual(1);
      const body = createCalls[0].args[2] as string;
      expect(body).toContain("The logging system is broken");
      expect(body).toContain("Fix the logging pipeline");
      expect(body).toContain("As a developer, I want consistent logs");
      expect(body).toContain("Use structured logging");
      expect(body).toContain("Unit test each adapter");
      expect(body).toContain("Dashboard");
    });
  });

  describe("Epic body contains full PRD when design path is a bare filename", () => {
    test("body contains PRD sections", async () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "test-epic" });
      store.updateEpic(epic.id, { status: "plan", design: "2026-04-05-test.md" });

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId: epic.id,
        epicSlug: "test-epic",
        store,
        resolved: { repo: "org/repo" },
      });

      const createCalls = callsTo("ghIssueCreate");
      expect(createCalls.length).toBeGreaterThanOrEqual(1);
      const body = createCalls[0].args[2] as string;
      expect(body).toContain("The logging system is broken");
      expect(body).toContain("Fix the logging pipeline");
      expect(body).toContain("As a developer, I want consistent logs");
      expect(body).toContain("Use structured logging");
    });
  });

  describe("Epic body contains full PRD when design path is repo-relative", () => {
    test("body contains PRD sections", async () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "test-epic" });
      store.updateEpic(epic.id, {
        status: "plan",
        design: ".beastmode/artifacts/design/2026-04-05-test.md",
      });

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId: epic.id,
        epicSlug: "test-epic",
        store,
        resolved: { repo: "org/repo" },
      });

      const createCalls = callsTo("ghIssueCreate");
      expect(createCalls.length).toBeGreaterThanOrEqual(1);
      const body = createCalls[0].args[2] as string;
      expect(body).toContain("The logging system is broken");
      expect(body).toContain("Fix the logging pipeline");
    });
  });

  // --- Feature body enrichment with path normalization (US2) ---

  describe("Feature body contains plan sections when plan path is a bare filename", () => {
    test("body contains user story, what to build, acceptance criteria", async () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "test-epic" });
      store.updateEpic(epic.id, { status: "implement" });
      const feat = store.addFeature({
        parent: epic.id,
        name: "my-feat",
        slug: "my-feat",
        description: "A feature",
      });
      store.updateFeature(feat.id, { plan: "2026-04-05-test-my-feat.md" });
      saveSyncRefs(tmpDir, { [epic.id]: { issue: 10 } });

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId: epic.id,
        epicSlug: "test-epic",
        store,
        resolved: { repo: "org/repo" },
      });

      const createCalls = callsTo("ghIssueCreate");
      const featureCreate = createCalls.find((c) => {
        const title = c.args[1] as string;
        return title.includes("my-feat");
      });
      expect(featureCreate).toBeDefined();
      const body = featureCreate!.args[2] as string;
      expect(body).toContain("As a user, I want enriched features");
      expect(body).toContain("Build the normalization layer");
      expect(body).toContain("Paths resolve correctly");
    });
  });

  describe("Feature body contains plan sections when plan path is repo-relative", () => {
    test("body contains user story and what to build", async () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "test-epic" });
      store.updateEpic(epic.id, { status: "implement" });
      const feat = store.addFeature({
        parent: epic.id,
        name: "my-feat",
        slug: "my-feat",
        description: "A feature",
      });
      store.updateFeature(feat.id, {
        plan: ".beastmode/artifacts/plan/2026-04-05-test-my-feat.md",
      });
      saveSyncRefs(tmpDir, { [epic.id]: { issue: 10 } });

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId: epic.id,
        epicSlug: "test-epic",
        store,
        resolved: { repo: "org/repo" },
      });

      const createCalls = callsTo("ghIssueCreate");
      const featureCreate = createCalls.find((c) => {
        const title = c.args[1] as string;
        return title.includes("my-feat");
      });
      expect(featureCreate).toBeDefined();
      const body = featureCreate!.args[2] as string;
      expect(body).toContain("As a user, I want enriched features");
      expect(body).toContain("Build the normalization layer");
    });
  });

  // --- Artifact links table display (US4) ---

  describe("Artifact table shows clean repo-relative paths from absolute inputs", () => {
    test("artifact rows use repo-relative paths, no worktree prefix", async () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "test-epic" });
      const absDesign = join(tmpDir, ".beastmode", "artifacts", "design", "2026-04-05-test.md");
      store.updateEpic(epic.id, { status: "plan", design: absDesign });

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId: epic.id,
        epicSlug: "test-epic",
        store,
        resolved: { repo: "org/repo" },
      });

      const createCalls = callsTo("ghIssueCreate");
      expect(createCalls.length).toBeGreaterThanOrEqual(1);
      const body = createCalls[0].args[2] as string;

      // Artifact table should use repo-relative paths
      expect(body).toContain(".beastmode/artifacts/design/");
      // Should NOT contain absolute tmpDir path in the artifact table
      expect(body).not.toContain(tmpDir);
    });
  });

  describe("Artifact table shows clean paths from bare filename inputs", () => {
    test("artifact rows display repo-relative paths", async () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "test-epic" });
      store.updateEpic(epic.id, { status: "plan", design: "2026-04-05-test.md" });

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId: epic.id,
        epicSlug: "test-epic",
        store,
        resolved: { repo: "org/repo" },
      });

      const createCalls = callsTo("ghIssueCreate");
      expect(createCalls.length).toBeGreaterThanOrEqual(1);
      const body = createCalls[0].args[2] as string;
      expect(body).toContain(".beastmode/artifacts/design/");
    });
  });

  // --- Epic body never contains absolute filesystem paths (US4) ---

  describe("Epic body never contains absolute filesystem paths", () => {
    test("no absolute paths in rendered body when stored as absolute worktree paths", async () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "test-epic" });
      const absDesign = join(tmpDir, ".beastmode", "artifacts", "design", "2026-04-05-test.md");
      store.updateEpic(epic.id, { status: "plan", design: absDesign });

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId: epic.id,
        epicSlug: "test-epic",
        store,
        resolved: { repo: "org/repo" },
      });

      const createCalls = callsTo("ghIssueCreate");
      expect(createCalls.length).toBeGreaterThanOrEqual(1);
      const body = createCalls[0].args[2] as string;

      // No absolute filesystem path should appear anywhere in the body
      expect(body).not.toMatch(/\/(Users|home|tmp|var)\//);
    });
  });
});
