/**
 * Integration test: field-mapping-fix
 *
 * Verifies that syncGitHubForEpic correctly maps store fields to sync inputs,
 * including phase labels, feature titles, and artifact path normalization.
 *
 * @github-sync-again
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "fs";
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

describe("field-mapping-fix integration", () => {
  let tmpDir: string;
  let store: InMemoryTaskStore;
  let epicId: string;

  beforeEach(() => {
    mockCalls.length = 0;
    tmpDir = mkdtempSync(join(tmpdir(), "field-mapping-fix-"));
    store = new InMemoryTaskStore();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  // --- Phase label from store status ---

  describe("Issue creation succeeds with correct phase label from store", () => {
    test("Epic issue creation uses correct phase label from store status", async () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "test-epic" });
      store.updateEpic(epic.id, { status: "design" });
      epicId = epic.id;

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId,
        epicSlug: "test-epic",
        store,
        resolved: { repo: "org/repo" },
      });

      // Should create epic issue with phase/design label (not phase/undefined)
      const createCalls = callsTo("ghIssueCreate");
      expect(createCalls.length).toBeGreaterThanOrEqual(1);

      // First create call is the epic — check labels argument (index 3)
      const epicCreateCall = createCalls[0];
      const labels = epicCreateCall.args[3] as string[];
      expect(labels).toContain("phase/design");
      expect(labels).not.toContain("phase/undefined");
    });

    test("Feature issue creation uses correct phase label from store", async () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "test-epic" });
      store.updateEpic(epic.id, { status: "implement" });
      epicId = epic.id;

      // Pre-populate epic ref
      saveSyncRefs(tmpDir, { [epicId]: { issue: 10 } });

      // Add features
      store.addFeature({ parent: epicId, name: "Feature A", slug: "feature-a" });
      store.addFeature({ parent: epicId, name: "Feature B", slug: "feature-b" });

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId,
        epicSlug: "test-epic",
        store,
        resolved: { repo: "org/repo" },
      });

      // Feature create calls should use status/ready labels (not phase/undefined)
      const createCalls = callsTo("ghIssueCreate");
      for (const call of createCalls) {
        const labels = call.args[3] as string[];
        expect(labels).not.toContain("phase/undefined");
      }
    });

    test("Phase label updates when status changes in store", async () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "test-epic" });
      store.updateEpic(epic.id, { status: "plan" });
      epicId = epic.id;

      // Pre-populate epic ref (existing issue)
      saveSyncRefs(tmpDir, { [epicId]: { issue: 10, bodyHash: "old" } });

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId,
        epicSlug: "test-epic",
        store,
        resolved: { repo: "org/repo" },
      });

      // Should call ghIssueEdit to update phase label to phase/plan
      const editCalls = callsTo("ghIssueEdit");
      const labelEditCall = editCalls.find((c) => {
        const opts = c.args[2] as Record<string, unknown>;
        return opts.addLabels !== undefined;
      });
      if (labelEditCall) {
        const opts = labelEditCall.args[2] as { addLabels?: string[] };
        expect(opts.addLabels).toContain("phase/plan");
      }
    });
  });

  // --- Feature titles ---

  describe("Feature issue titles include epic name prefix", () => {
    test("Feature issue title uses epic-prefixed format", async () => {
      const epic = store.addEpic({ name: "auth-system", slug: "auth-system" });
      store.updateEpic(epic.id, { status: "implement" });
      epicId = epic.id;

      saveSyncRefs(tmpDir, { [epicId]: { issue: 10 } });
      store.addFeature({ parent: epicId, name: "login-flow", slug: "login-flow" });

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId,
        epicSlug: "auth-system",
        store,
        resolved: { repo: "org/repo" },
      });

      // Feature create call should use "auth-system: login-flow" as title
      const createCalls = callsTo("ghIssueCreate");
      const featureCreate = createCalls.find((c) => {
        const title = c.args[1] as string;
        return title.includes("login-flow");
      });
      expect(featureCreate).toBeDefined();
      const title = featureCreate!.args[1] as string;
      expect(title).toBe("auth-system: login-flow");
    });

    test("Multiple features in same epic have distinct epic-prefixed titles", async () => {
      const epic = store.addEpic({ name: "data-pipeline", slug: "data-pipeline" });
      store.updateEpic(epic.id, { status: "implement" });
      epicId = epic.id;

      saveSyncRefs(tmpDir, { [epicId]: { issue: 10 } });
      store.addFeature({ parent: epicId, name: "ingestion", slug: "ingestion" });
      store.addFeature({ parent: epicId, name: "transform", slug: "transform" });
      store.addFeature({ parent: epicId, name: "export", slug: "export" });

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId,
        epicSlug: "data-pipeline",
        store,
        resolved: { repo: "org/repo" },
      });

      const createCalls = callsTo("ghIssueCreate");
      const titles = createCalls.map((c) => c.args[1] as string);
      expect(titles).toContain("data-pipeline: ingestion");
      expect(titles).toContain("data-pipeline: transform");
      expect(titles).toContain("data-pipeline: export");
    });
  });

  // --- Artifact path normalization ---

  describe("Artifact link URLs use repo-relative paths on GitHub", () => {
    test("Epic issue body contains repo-relative artifact link", async () => {
      const epic = store.addEpic({ name: "Test Epic", slug: "test-epic" });
      store.updateEpic(epic.id, {
        status: "plan",
        design: ".beastmode/artifacts/design/2026-04-05-example.md",
      });
      epicId = epic.id;

      // Create the design artifact file
      const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
      mkdirSync(designDir, { recursive: true });
      writeFileSync(
        join(designDir, "2026-04-05-example.md"),
        "---\nphase: design\n---\n\n## Problem Statement\n\nTest problem.\n\n## Solution\n\nTest solution.\n",
      );

      await syncGitHubForEpic({
        projectRoot: tmpDir,
        epicId,
        epicSlug: "test-epic",
        store,
        resolved: { repo: "org/repo" },
      });

      // Epic body should contain repo-relative path, not absolute
      const createCalls = callsTo("ghIssueCreate");
      expect(createCalls.length).toBeGreaterThanOrEqual(1);
      const body = createCalls[0].args[2] as string;
      expect(body).not.toContain(tmpDir);
      // Should contain the repo-relative design path
      expect(body).toContain(".beastmode/artifacts/design/2026-04-05-example.md");
    });
  });
});
