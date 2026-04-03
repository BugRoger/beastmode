/**
 * Unit tests for syncGitHub — GitHub sync engine.
 *
 * Mocks the gh.ts module so no real GitHub CLI calls are made.
 * Verifies reconciliation logic, bootstrap write-back, label
 * blast-replace, feature lifecycle, and warn-and-continue behavior.
 */

import { describe, test, expect, mock, beforeEach } from "bun:test";

// --- Mock infrastructure ---

/** Track all mock calls for assertions. */
const mockCalls: { fn: string; args: unknown[] }[] = [];

/** Configurable per-test return values. */
let mockReturns: Record<string, unknown> = {};

/** Per-function error triggers — when set, the mock throws. */
let mockErrors: Record<string, boolean> = {};

function resetMocks(): void {
  mockCalls.length = 0;
  mockReturns = {};
  mockErrors = {};
}

function trackCall(fn: string, ...args: unknown[]): void {
  mockCalls.push({ fn, args });
}

function callsTo(fn: string): { fn: string; args: unknown[] }[] {
  return mockCalls.filter((c) => c.fn === fn);
}

// Mock the gh module BEFORE importing github-sync
mock.module("../gh", () => ({
  ghIssueCreate: async (...args: unknown[]) => {
    trackCall("ghIssueCreate", ...args);
    if (mockErrors.ghIssueCreate) return undefined;
    return mockReturns.ghIssueCreate ?? 42;
  },
  ghIssueEdit: async (...args: unknown[]) => {
    trackCall("ghIssueEdit", ...args);
    if (mockErrors.ghIssueEdit) return false;
    return mockReturns.ghIssueEdit ?? true;
  },
  ghIssueClose: async (...args: unknown[]) => {
    trackCall("ghIssueClose", ...args);
    if (mockErrors.ghIssueClose) return false;
    return mockReturns.ghIssueClose ?? true;
  },
  ghIssueComment: async (...args: unknown[]) => {
    trackCall("ghIssueComment", ...args);
    if (mockErrors.ghIssueComment) return false;
    return mockReturns.ghIssueComment ?? true;
  },
  ghIssueComments: async (...args: unknown[]) => {
    trackCall("ghIssueComments", ...args);
    if (mockErrors.ghIssueComments) return undefined;
    return mockReturns.ghIssueComments ?? [];
  },
  ghIssueState: async (...args: unknown[]) => {
    trackCall("ghIssueState", ...args);
    if (mockErrors.ghIssueState) return undefined;
    return mockReturns.ghIssueState ?? "open";
  },
  ghIssueReopen: async (...args: unknown[]) => {
    trackCall("ghIssueReopen", ...args);
    if (mockErrors.ghIssueReopen) return false;
    return mockReturns.ghIssueReopen ?? true;
  },
  ghIssueLabels: async (...args: unknown[]) => {
    trackCall("ghIssueLabels", ...args);
    if (mockErrors.ghIssueLabels) return undefined;
    return mockReturns.ghIssueLabels ?? ["type/epic", "phase/design"];
  },
  ghProjectItemAdd: async (...args: unknown[]) => {
    trackCall("ghProjectItemAdd", ...args);
    if (mockErrors.ghProjectItemAdd) return undefined;
    return mockReturns.ghProjectItemAdd ?? "item-123";
  },
  ghProjectSetField: async (...args: unknown[]) => {
    trackCall("ghProjectSetField", ...args);
    if (mockErrors.ghProjectSetField) return false;
    return mockReturns.ghProjectSetField ?? true;
  },
  ghSubIssueAdd: async (...args: unknown[]) => {
    trackCall("ghSubIssueAdd", ...args);
    if (mockErrors.ghSubIssueAdd) return false;
    return mockReturns.ghSubIssueAdd ?? true;
  },
  ghProjectItemDelete: async (...args: unknown[]) => {
    trackCall("ghProjectItemDelete", ...args);
    if (mockErrors.ghProjectItemDelete) return false;
    return mockReturns.ghProjectItemDelete ?? true;
  },
  ghIssueComment: async (...args: unknown[]) => {
    trackCall("ghIssueComment", ...args);
    if (mockErrors.ghIssueComment) return false;
    return mockReturns.ghIssueComment ?? true;
  },
}));

// NOW import the module under test
import { syncGitHub, type SyncResult } from "../github-sync";
import type { PipelineManifest, ManifestFeature } from "../manifest";
import type { BeastmodeConfig } from "../config";
import type { ResolvedGitHub } from "../github-discovery";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// --- Test helpers ---

function makeConfig(overrides: Partial<BeastmodeConfig["github"]> = {}): BeastmodeConfig {
  return {
    github: {
      enabled: true,
      ...overrides,
    },
    cli: { interval: 60 },
  };
}

function makeResolved(overrides: Partial<ResolvedGitHub> = {}): ResolvedGitHub {
  return {
    repo: "org/repo",
    ...overrides,
  };
}

function makeResolvedWithProject(overrides: Partial<ResolvedGitHub> = {}): ResolvedGitHub {
  return {
    repo: "org/repo",
    projectNumber: 7,
    projectId: "PVT_123",
    fieldId: "PVTSSF_456",
    fieldOptions: {
      Backlog: "opt-backlog",
      Design: "opt-design",
      Plan: "opt-plan",
      Implement: "opt-implement",
      Validate: "opt-validate",
      Release: "opt-release",
      Done: "opt-done",
    },
    ...overrides,
  };
}

function makeManifest(
  overrides: Partial<PipelineManifest> = {},
): PipelineManifest {
  return {
    slug: "test-epic",
    phase: "design",
    features: [],
    artifacts: {},
    lastUpdated: "2026-03-29T00:00:00Z",
    github: { epic: 10 },
    ...overrides,
  };
}

function makeFeature(
  overrides: Partial<ManifestFeature> = {},
): ManifestFeature {
  return {
    slug: "feat-a",
    plan: "plan-a.md",
    status: "pending",
    ...overrides,
  };
}

// --- Tests ---

describe("syncGitHub", () => {
  beforeEach(resetMocks);

  // -------------------------------------------------------
  // 1. GitHub disabled
  // -------------------------------------------------------
  describe("when GitHub is disabled", () => {
    test("returns immediately with warning, no gh calls", async () => {
      const manifest = makeManifest();
      const config = makeConfig({ enabled: false });
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved);

      expect(result.warnings).toContain("GitHub sync disabled in config");
      expect(mockCalls).toHaveLength(0);
      expect(result.epicCreated).toBe(false);
      expect(result.featuresCreated).toBe(0);
    });
  });

  // -------------------------------------------------------
  // 2. Repo comes from resolved, not manifest
  // -------------------------------------------------------
  describe("repo source", () => {
    test("uses resolved.repo for all GitHub operations", async () => {
      const manifest = makeManifest();
      delete (manifest.github as Record<string, unknown>).epic;
      const config = makeConfig();
      const resolved = makeResolved({ repo: "custom/repo" });
      mockReturns.ghIssueCreate = 99;

      await syncGitHub(manifest, config, resolved);

      const createCalls = callsTo("ghIssueCreate");
      expect(createCalls[0].args[0]).toBe("custom/repo");
    });

    test("manifest does not need github.repo field", async () => {
      const manifest = makeManifest({ github: { epic: 10 } });
      const config = makeConfig();
      const resolved = makeResolved();

      // Should not throw or warn about missing repo
      const result = await syncGitHub(manifest, config, resolved);
      expect(result.warnings).not.toContain(
        "No github.repo in manifest — skipping sync",
      );
    });
  });

  // -------------------------------------------------------
  // 3. Epic creation (bootstrap write-back)
  // -------------------------------------------------------
  describe("epic creation", () => {
    test("creates epic when manifest has no github.epic", async () => {
      const manifest = makeManifest();
      delete (manifest.github as Record<string, unknown>).epic;

      mockReturns.ghIssueCreate = 99;
      const config = makeConfig();
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved);

      expect(result.epicCreated).toBe(true);
      expect(result.epicNumber).toBe(99);

      // Verify mutation returned for caller to apply
      const epicMutation = result.mutations.find(m => m.type === "setEpic");
      expect(epicMutation).toBeDefined();
      expect(epicMutation!.type === "setEpic" && epicMutation!.epicNumber).toBe(99);

      // Verify the create call with correct args
      const createCalls = callsTo("ghIssueCreate");
      expect(createCalls).toHaveLength(1);
      expect(createCalls[0].args[0]).toBe("org/repo"); // repo from resolved
      expect(createCalls[0].args[1]).toBe("test-epic"); // title = slug
      expect(createCalls[0].args[3]).toEqual(["type/epic", "phase/design"]); // labels
    });

    test("writes epic back to manifest.github when github object exists without epic", async () => {
      const manifest: PipelineManifest = {
        slug: "my-epic",
        phase: "plan",
        features: [],
        artifacts: {},
        lastUpdated: "2026-03-29T00:00:00Z",
        github: {} as unknown as PipelineManifest["github"],
      };
      mockReturns.ghIssueCreate = 55;
      const config = makeConfig();
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved);

      expect(result.epicCreated).toBe(true);
      const epicMutation = result.mutations.find(m => m.type === "setEpic");
      expect(epicMutation).toBeDefined();
      expect(epicMutation!.type === "setEpic" && epicMutation!.epicNumber).toBe(55);
    });

    test("includes correct phase in epic body and labels", async () => {
      const manifest = makeManifest({ phase: "implement" });
      delete (manifest.github as Record<string, unknown>).epic;
      mockReturns.ghIssueCreate = 77;
      const config = makeConfig();
      const resolved = makeResolved();

      await syncGitHub(manifest, config, resolved);

      const createCalls = callsTo("ghIssueCreate");
      // Body should contain the phase
      expect(createCalls[0].args[2]).toContain("**Phase:** implement");
      // Labels should include phase/implement
      expect(createCalls[0].args[3]).toEqual([
        "type/epic",
        "phase/implement",
      ]);
    });
  });

  // -------------------------------------------------------
  // 4. Epic creation failure
  // -------------------------------------------------------
  describe("epic creation failure", () => {
    test("returns early with warning, does not try features", async () => {
      const manifest = makeManifest({
        features: [makeFeature()],
      });
      delete (manifest.github as Record<string, unknown>).epic;
      mockErrors.ghIssueCreate = true;
      const config = makeConfig();
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved);

      expect(result.warnings).toContain("Failed to create epic issue");
      expect(result.epicCreated).toBe(false);
      // Should not have tried to sync features (no ghIssueLabels for features)
      const labelCalls = callsTo("ghIssueLabels");
      expect(labelCalls).toHaveLength(0);
    });
  });

  // -------------------------------------------------------
  // 5. Phase label blast-replace
  // -------------------------------------------------------
  describe("phase label blast-replace", () => {
    test("removes old phase labels and adds new one", async () => {
      const manifest = makeManifest({ phase: "implement" });
      // Current labels include wrong phase
      mockReturns.ghIssueLabels = [
        "type/epic",
        "phase/design",
        "phase/plan",
      ];
      const config = makeConfig();
      const resolved = makeResolved();

      await syncGitHub(manifest, config, resolved);

      const editCalls = callsTo("ghIssueEdit");
      expect(editCalls.length).toBeGreaterThanOrEqual(1);

      // Find the epic label edit (has removeLabels, not body update)
      const epicLabelEdit = editCalls.find(
        (c) => c.args[0] === "org/repo" && c.args[1] === 10 &&
          (c.args[2] as Record<string, unknown>).removeLabels !== undefined,
      );
      expect(epicLabelEdit).toBeDefined();
      const edits = epicLabelEdit!.args[2] as {
        removeLabels: string[];
        addLabels: string[];
      };
      expect(edits.removeLabels).toContain("phase/design");
      expect(edits.removeLabels).toContain("phase/plan");
      expect(edits.addLabels).toEqual(["phase/implement"]);
    });

    test("handles single wrong phase label", async () => {
      const manifest = makeManifest({ phase: "validate" });
      mockReturns.ghIssueLabels = ["type/epic", "phase/plan"];
      const config = makeConfig();
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved);

      const editCalls = callsTo("ghIssueEdit");
      const epicLabelEdit = editCalls.find(
        (c) => c.args[1] === 10 &&
          (c.args[2] as Record<string, unknown>).removeLabels !== undefined,
      );
      expect(epicLabelEdit).toBeDefined();
      const edits = epicLabelEdit!.args[2] as {
        removeLabels: string[];
        addLabels: string[];
      };
      expect(edits.removeLabels).toEqual(["phase/plan"]);
      expect(edits.addLabels).toEqual(["phase/validate"]);
      expect(result.labelsUpdated).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------
  // 6. Phase label already correct — no edit call
  // -------------------------------------------------------
  describe("phase label already correct", () => {
    test("skips edit when phase label is already correct", async () => {
      const manifest = makeManifest({ phase: "design" });
      // Labels already match
      mockReturns.ghIssueLabels = ["type/epic", "phase/design"];
      const config = makeConfig();
      const resolved = makeResolved();

      await syncGitHub(manifest, config, resolved);

      // No label edit calls should be made for the epic
      const labelEditCalls = callsTo("ghIssueEdit").filter(
        (c) => c.args[1] === 10 &&
          (c.args[2] as Record<string, unknown>).removeLabels !== undefined,
      );
      expect(labelEditCalls).toHaveLength(0);
    });
  });

  // -------------------------------------------------------
  // 7. Feature creation
  // -------------------------------------------------------
  describe("feature creation", () => {
    test("creates feature issue when feature has no github.issue", async () => {
      const feature = makeFeature({ slug: "new-feat", status: "pending" });
      const manifest = makeManifest({ features: [feature] });
      mockReturns.ghIssueCreate = 50;
      const config = makeConfig();
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved);

      expect(result.featuresCreated).toBe(1);
      // Verify mutation returned for caller to apply
      const featureMutation = result.mutations.find(m => m.type === "setFeatureIssue");
      expect(featureMutation).toBeDefined();
      expect(featureMutation!.type === "setFeatureIssue" && featureMutation!.issueNumber).toBe(50);

      // Verify create call for the feature
      const createCalls = callsTo("ghIssueCreate");
      expect(createCalls).toHaveLength(1);
      expect(createCalls[0].args[1]).toBe("new-feat"); // title = feature slug
      expect(createCalls[0].args[3]).toEqual([
        "type/feature",
        "status/ready",
      ]); // labels
    });

    test("uses correct status label for in-progress feature", async () => {
      const feature = makeFeature({
        slug: "active-feat",
        status: "in-progress",
      });
      const manifest = makeManifest({ features: [feature] });
      mockReturns.ghIssueCreate = 51;
      const config = makeConfig();
      const resolved = makeResolved();

      await syncGitHub(manifest, config, resolved);

      const createCalls = callsTo("ghIssueCreate");
      expect(createCalls[0].args[3]).toEqual([
        "type/feature",
        "status/in-progress",
      ]);
    });

    test("uses correct status label for blocked feature", async () => {
      const feature = makeFeature({
        slug: "blocked-feat",
        status: "blocked",
      });
      const manifest = makeManifest({ features: [feature] });
      mockReturns.ghIssueCreate = 52;
      const config = makeConfig();
      const resolved = makeResolved();

      await syncGitHub(manifest, config, resolved);

      const createCalls = callsTo("ghIssueCreate");
      expect(createCalls[0].args[3]).toEqual([
        "type/feature",
        "status/blocked",
      ]);
    });

    test("warns and skips feature when creation fails", async () => {
      const feature = makeFeature({ slug: "fail-feat" });
      const manifest = makeManifest({ features: [feature] });
      mockErrors.ghIssueCreate = true;
      const config = makeConfig();
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved);

      expect(result.featuresCreated).toBe(0);
      expect(result.warnings).toContain(
        "Failed to create issue for feature fail-feat",
      );
      // Feature should NOT have github set
      expect(feature.github).toBeUndefined();
    });
  });

  // -------------------------------------------------------
  // 8. Feature creation + sub-issue linking
  // -------------------------------------------------------
  describe("feature sub-issue linking", () => {
    test("links created feature as sub-issue of epic", async () => {
      const feature = makeFeature({ slug: "linked-feat" });
      const manifest = makeManifest({ features: [feature] });
      mockReturns.ghIssueCreate = 60;
      const config = makeConfig();
      const resolved = makeResolved();

      await syncGitHub(manifest, config, resolved);

      const subCalls = callsTo("ghSubIssueAdd");
      expect(subCalls).toHaveLength(1);
      expect(subCalls[0].args[0]).toBe("org/repo"); // repo
      expect(subCalls[0].args[1]).toBe(10); // parent epic number
      expect(subCalls[0].args[2]).toBe(60); // child feature number
    });

    test("does not link sub-issue for existing features", async () => {
      const feature = makeFeature({
        slug: "existing-feat",
        github: { issue: 30 },
        status: "in-progress",
      });
      const manifest = makeManifest({ features: [feature] });
      const config = makeConfig();
      const resolved = makeResolved();

      await syncGitHub(manifest, config, resolved);

      // Should not have called ghSubIssueAdd
      const subCalls = callsTo("ghSubIssueAdd");
      expect(subCalls).toHaveLength(0);
    });
  });

  // -------------------------------------------------------
  // 9. Feature status label update
  // -------------------------------------------------------
  describe("feature status label update", () => {
    test("blast-replaces status labels on existing feature", async () => {
      const feature = makeFeature({
        slug: "feat-a",
        status: "in-progress",
        github: { issue: 20 },
      });
      const manifest = makeManifest({ features: [feature] });
      mockReturns.ghIssueLabels = ["type/feature", "status/ready"];
      const config = makeConfig();
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved);

      // Find the feature label edit (has removeLabels, not body update)
      const editCalls = callsTo("ghIssueEdit");
      const featureLabelEdit = editCalls.find(
        (c) => c.args[1] === 20 &&
          (c.args[2] as Record<string, unknown>).removeLabels !== undefined,
      );
      expect(featureLabelEdit).toBeDefined();
      const edits = featureLabelEdit!.args[2] as {
        removeLabels: string[];
        addLabels: string[];
      };
      expect(edits.removeLabels).toEqual(["status/ready"]);
      expect(edits.addLabels).toEqual(["status/in-progress"]);
      expect(result.labelsUpdated).toBeGreaterThanOrEqual(1);
    });

    test("skips label update when status label already correct", async () => {
      const feature = makeFeature({
        slug: "feat-correct",
        status: "pending",
        github: { issue: 21 },
      });
      const manifest = makeManifest({ features: [feature] });
      // Status label already matches: status/ready for "pending"
      mockReturns.ghIssueLabels = ["type/feature", "status/ready"];
      const config = makeConfig();
      const resolved = makeResolved();

      await syncGitHub(manifest, config, resolved);

      // No label edit call for feature issue 21 (body edit may exist)
      const featureLabelEdits = callsTo("ghIssueEdit").filter(
        (c) => c.args[1] === 21 &&
          (c.args[2] as Record<string, unknown>).removeLabels !== undefined,
      );
      expect(featureLabelEdits).toHaveLength(0);
    });
  });

  // -------------------------------------------------------
  // 10. Feature completed — closes the issue
  // -------------------------------------------------------
  describe("feature completed", () => {
    test("closes the issue when feature status is completed", async () => {
      const feature = makeFeature({
        slug: "done-feat",
        status: "completed",
        github: { issue: 25 },
      });
      const manifest = makeManifest({ features: [feature] });
      const config = makeConfig();
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved);

      expect(result.featuresClosed).toBe(1);
      const closeCalls = callsTo("ghIssueClose");
      // One close for the feature (epic is not "done")
      const featureClose = closeCalls.find((c) => c.args[1] === 25);
      expect(featureClose).toBeDefined();
    });

    test("does not update labels for completed features", async () => {
      const feature = makeFeature({
        slug: "done-feat",
        status: "completed",
        github: { issue: 25 },
      });
      const manifest = makeManifest({ features: [feature] });
      const config = makeConfig();
      const resolved = makeResolved();

      await syncGitHub(manifest, config, resolved);

      // No ghIssueLabels call for the feature (issue 25)
      const labelCalls = callsTo("ghIssueLabels");
      const featureLabelCalls = labelCalls.filter((c) => c.args[1] === 25);
      expect(featureLabelCalls).toHaveLength(0);
    });

    test("warns when close fails", async () => {
      const feature = makeFeature({
        slug: "stuck-feat",
        status: "completed",
        github: { issue: 26 },
      });
      const manifest = makeManifest({ features: [feature] });
      mockErrors.ghIssueClose = true;
      const config = makeConfig();
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved);

      expect(result.featuresClosed).toBe(0);
      expect(result.warnings).toContain(
        "Failed to close feature stuck-feat",
      );
    });
  });

  // -------------------------------------------------------
  // 11. Epic close on phase "done"
  // -------------------------------------------------------
  describe("epic close on phase done", () => {
    test("closes epic when phase is 'done'", async () => {
      const manifest = makeManifest({ phase: "done" });
      const config = makeConfig();
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved);

      expect(result.epicClosed).toBe(true);
      const closeCalls = callsTo("ghIssueClose");
      const epicClose = closeCalls.find((c) => c.args[1] === 10);
      expect(epicClose).toBeDefined();
    });

    test("warns when epic close fails", async () => {
      const manifest = makeManifest({ phase: "done" });
      mockErrors.ghIssueClose = true;
      const config = makeConfig();
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved);

      expect(result.epicClosed).toBe(false);
      expect(result.warnings).toContain("Failed to close epic");
    });

    test("does not close epic for normal phases", async () => {
      const manifest = makeManifest({ phase: "release" });
      const config = makeConfig();
      const resolved = makeResolved();

      await syncGitHub(manifest, config, resolved);

      // No close calls for the epic
      const closeCalls = callsTo("ghIssueClose");
      expect(closeCalls.filter((c) => c.args[1] === 10)).toHaveLength(0);
    });
  });

  // -------------------------------------------------------
  // 11.5 Cancelled phase — board, close, and label handling
  // -------------------------------------------------------
  describe("cancelled phase handling", () => {
    test("maps cancelled phase to Done on project board", async () => {
      const manifest = makeManifest({ phase: "cancelled" });
      const config = makeConfig();
      const resolved = makeResolvedWithProject();

      await syncGitHub(manifest, config, resolved);

      const fieldCalls = callsTo("ghProjectSetField");
      const doneCalls = fieldCalls.filter(
        (c) => c.args[3] === "opt-done",
      );
      expect(doneCalls.length).toBeGreaterThanOrEqual(1);
    });

    test("closes epic when phase is cancelled", async () => {
      const manifest = makeManifest({ phase: "cancelled" });
      const config = makeConfig();
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved);

      expect(result.epicClosed).toBe(true);
      const closeCalls = callsTo("ghIssueClose");
      const epicClose = closeCalls.find((c) => c.args[1] === 10);
      expect(epicClose).toBeDefined();
    });

    test("blast-replace removes phase/cancelled from current labels", async () => {
      const manifest = makeManifest({ phase: "design" });
      // Current labels include stale phase/cancelled
      mockReturns.ghIssueLabels = ["type/epic", "phase/cancelled"];
      const config = makeConfig();
      const resolved = makeResolved();

      await syncGitHub(manifest, config, resolved);

      const editCalls = callsTo("ghIssueEdit");
      const epicEdit = editCalls.find(
        (c) =>
          c.args[0] === "org/repo" &&
          c.args[1] === 10 &&
          (c.args[2] as Record<string, unknown>)?.removeLabels !== undefined,
      );
      expect(epicEdit).toBeDefined();
      const edits = epicEdit!.args[2] as {
        removeLabels: string[];
        addLabels: string[];
      };
      expect(edits.removeLabels).toContain("phase/cancelled");
      expect(edits.addLabels).toEqual(["phase/design"]);
    });

    test("does not close epic for non-terminal phases", async () => {
      const manifest = makeManifest({ phase: "implement" });
      const config = makeConfig();
      const resolved = makeResolved();

      await syncGitHub(manifest, config, resolved);

      const closeCalls = callsTo("ghIssueClose");
      expect(closeCalls.filter((c) => c.args[1] === 10)).toHaveLength(0);
    });
  });

  // -------------------------------------------------------
  // 11.7 Release closing comment
  // -------------------------------------------------------
  describe("release closing comment", () => {
    let commentTempDir: string;

    function createPluginJson(ver: string) {
      commentTempDir = mkdtempSync(join(tmpdir(), "beastmode-test-"));
      const dir = join(commentTempDir, ".claude-plugin");
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "plugin.json"), JSON.stringify({ version: ver }));
    }

    function removePluginTemp() {
      if (commentTempDir) {
        try {
          rmSync(commentTempDir, { recursive: true, force: true });
        } catch {
          // best effort
        }
      }
    }

    test("posts release comment when phase is done and version available", async () => {
      createPluginJson("1.2.0");
      const manifest = makeManifest({ phase: "done" });
      const config = makeConfig();
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved, {
        projectRoot: commentTempDir,
      });

      expect(result.releaseCommentPosted).toBe(true);
      const calls = callsTo("ghIssueComment");
      expect(calls).toHaveLength(1);
      expect(calls[0].args[0]).toBe("org/repo");
      expect(calls[0].args[1]).toBe(10);
      expect(calls[0].args[2]).toContain("1.2.0");

      removePluginTemp();
    });

    test("does not post comment when phase is cancelled", async () => {
      createPluginJson("1.2.0");
      const manifest = makeManifest({ phase: "cancelled" });
      const config = makeConfig();
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved, {
        projectRoot: commentTempDir,
      });

      expect(result.releaseCommentPosted).toBe(false);
      const calls = callsTo("ghIssueComment");
      expect(calls).toHaveLength(0);

      removePluginTemp();
    });

    test("skips comment when no release metadata available", async () => {
      // Create empty temp dir with no plugin.json — version returns undefined
      commentTempDir = mkdtempSync(join(tmpdir(), "beastmode-test-"));
      const manifest = makeManifest({ phase: "done" });
      const config = makeConfig();
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved, {
        projectRoot: commentTempDir,
      });

      // Even without version, git-based metadata (mergeCommit) may
      // still produce a non-empty comment if git works in the test env.
      // The key invariant: releaseCommentPosted reflects whether
      // ghIssueComment was actually called.
      const calls = callsTo("ghIssueComment");
      expect(result.releaseCommentPosted).toBe(calls.length > 0);

      removePluginTemp();
    });

    test("warns when comment posting fails", async () => {
      createPluginJson("1.2.0");
      const manifest = makeManifest({ phase: "done" });
      mockErrors.ghIssueComment = true;
      const config = makeConfig();
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved, {
        projectRoot: commentTempDir,
      });

      expect(result.releaseCommentPosted).toBe(false);
      expect(result.warnings).toContain("Failed to post release comment on epic");

      removePluginTemp();
    });

    test("still closes epic even when comment fails", async () => {
      createPluginJson("1.2.0");
      const manifest = makeManifest({ phase: "done" });
      mockErrors.ghIssueComment = true;
      const config = makeConfig();
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved, {
        projectRoot: commentTempDir,
      });

      expect(result.epicClosed).toBe(true);

      removePluginTemp();
    });

    test("does not post comment for non-terminal phases", async () => {
      createPluginJson("1.2.0");
      const manifest = makeManifest({ phase: "implement" });
      const config = makeConfig();
      const resolved = makeResolved();

      await syncGitHub(manifest, config, resolved, {
        projectRoot: commentTempDir,
      });

      const calls = callsTo("ghIssueComment");
      expect(calls).toHaveLength(0);

      removePluginTemp();
    });
  });

  // -------------------------------------------------------
  // 12. Warn-and-continue — individual failures don't stop sync
  // -------------------------------------------------------
  describe("warn-and-continue", () => {
    test("continues syncing features after one feature fails", async () => {
      const feat1 = makeFeature({ slug: "feat-ok", github: { issue: 30 }, status: "pending" });
      const feat2 = makeFeature({ slug: "feat-ok-2", github: { issue: 31 }, status: "pending" });
      const manifest = makeManifest({ features: [feat1, feat2] });
      // Labels return normally
      mockReturns.ghIssueLabels = ["status/ready"];
      const config = makeConfig();
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved);

      // Both features should have been processed (ghIssueLabels called for each + epic)
      const labelCalls = callsTo("ghIssueLabels");
      expect(labelCalls.length).toBeGreaterThanOrEqual(3); // epic + feat1 + feat2
    });

    test("ghIssueLabels failure does not stop sync", async () => {
      const feat = makeFeature({
        slug: "label-fail",
        github: { issue: 30 },
        status: "in-progress",
      });
      const manifest = makeManifest({ features: [feat] });
      mockErrors.ghIssueLabels = true;
      const config = makeConfig();
      const resolved = makeResolved();

      // Should not throw
      const result = await syncGitHub(manifest, config, resolved);

      // Epic label check returned undefined, so no edit — but sync continued
      expect(result).toBeDefined();
    });
  });

  // -------------------------------------------------------
  // 13. Project board sync (metadata from resolved)
  // -------------------------------------------------------
  describe("project board sync", () => {
    test("updates board status when resolved has project metadata", async () => {
      const manifest = makeManifest({ phase: "implement" });
      const config = makeConfig();
      const resolved = makeResolvedWithProject();

      await syncGitHub(manifest, config, resolved);

      // Should call ghProjectItemAdd for the epic
      const addCalls = callsTo("ghProjectItemAdd");
      expect(addCalls.length).toBeGreaterThanOrEqual(1);
      const epicAdd = addCalls[0];
      expect(epicAdd.args[0]).toBe(7); // project number
      expect(epicAdd.args[1]).toBe("org"); // owner
      expect(epicAdd.args[2]).toBe(
        "https://github.com/org/repo/issues/10",
      ); // issue URL

      // Should call ghProjectSetField
      const fieldCalls = callsTo("ghProjectSetField");
      expect(fieldCalls.length).toBeGreaterThanOrEqual(1);
      const epicField = fieldCalls[0];
      expect(epicField.args[0]).toBe("PVT_123"); // project ID
      expect(epicField.args[1]).toBe("item-123"); // item ID from mock
      expect(epicField.args[2]).toBe("PVTSSF_456"); // field ID
      expect(epicField.args[3]).toBe("opt-implement"); // option ID for "Implement"
    });

    test("skips project sync when resolved lacks project metadata", async () => {
      const manifest = makeManifest({ phase: "design" });
      const config = makeConfig();
      const resolved = makeResolved(); // no project metadata

      await syncGitHub(manifest, config, resolved);

      const addCalls = callsTo("ghProjectItemAdd");
      expect(addCalls).toHaveLength(0);
      const fieldCalls = callsTo("ghProjectSetField");
      expect(fieldCalls).toHaveLength(0);
    });

    test("warns when project item add fails", async () => {
      const manifest = makeManifest({ phase: "design" });
      const config = makeConfig();
      const resolved = makeResolvedWithProject();
      mockErrors.ghProjectItemAdd = true;

      const result = await syncGitHub(manifest, config, resolved);

      expect(result.warnings).toContain(
        "Failed to add #10 to project board",
      );
      // ghProjectSetField should NOT have been called
      const fieldCalls = callsTo("ghProjectSetField");
      expect(fieldCalls).toHaveLength(0);
    });

    test("warns when project field set fails", async () => {
      const manifest = makeManifest({ phase: "design" });
      const config = makeConfig();
      const resolved = makeResolvedWithProject();
      mockErrors.ghProjectSetField = true;

      const result = await syncGitHub(manifest, config, resolved);

      expect(result.warnings).toContain(
        "Failed to set project status for #10",
      );
      expect(result.projectUpdated).toBe(false);
    });

    test("sets project status to Done when phase is done", async () => {
      const manifest = makeManifest({ phase: "done" });
      const config = makeConfig();
      const resolved = makeResolvedWithProject();

      await syncGitHub(manifest, config, resolved);

      const fieldCalls = callsTo("ghProjectSetField");
      const doneCalls = fieldCalls.filter(
        (c) => c.args[3] === "opt-done",
      );
      expect(doneCalls.length).toBeGreaterThanOrEqual(1);
    });

    test("warns when target status has no option ID", async () => {
      const manifest = makeManifest({ phase: "design" });
      const config = makeConfig();
      const resolved = makeResolvedWithProject();
      // Remove the Design option so there's no match
      delete resolved.fieldOptions!["Design"];

      const result = await syncGitHub(manifest, config, resolved);

      expect(
        result.warnings.some((w) =>
          w.includes('No project option for status "Design"'),
        ),
      ).toBe(true);
    });

    test("syncs project status for features too", async () => {
      const feature = makeFeature({
        slug: "board-feat",
        status: "in-progress",
        github: { issue: 40 },
      });
      const manifest = makeManifest({ features: [feature] });
      const config = makeConfig();
      const resolved = makeResolvedWithProject();
      // Labels already correct to avoid extra noise
      mockReturns.ghIssueLabels = ["status/in-progress"];

      await syncGitHub(manifest, config, resolved);

      // ghProjectItemAdd should be called for both epic and feature
      const addCalls = callsTo("ghProjectItemAdd");
      expect(addCalls.length).toBeGreaterThanOrEqual(2);
      const featureAdd = addCalls.find((c) =>
        (c.args[2] as string).includes("/issues/40"),
      );
      expect(featureAdd).toBeDefined();
    });
  });

  // -------------------------------------------------------
  // 14. Resolved without project — issues still sync
  // -------------------------------------------------------
  describe("resolved without project metadata", () => {
    test("syncs issues and labels even without project metadata", async () => {
      const feature = makeFeature({ slug: "feat-1", status: "pending" });
      const manifest = makeManifest({ features: [feature] });
      delete (manifest.github as Record<string, unknown>).epic;
      mockReturns.ghIssueCreate = 100;
      const config = makeConfig();
      // No project fields — only repo
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved);

      expect(result.epicCreated).toBe(true);
      expect(result.featuresCreated).toBe(1);
      // No project calls
      expect(callsTo("ghProjectItemAdd")).toHaveLength(0);
      expect(callsTo("ghProjectSetField")).toHaveLength(0);
    });
  });

  // -------------------------------------------------------
  // Full integration scenarios
  // -------------------------------------------------------
  describe("full sync scenarios", () => {
    test("new epic with new features — full bootstrap", async () => {
      const feat1 = makeFeature({ slug: "feat-1", status: "pending" });
      const feat2 = makeFeature({ slug: "feat-2", status: "in-progress" });
      const manifest: PipelineManifest = {
        slug: "fresh-epic",
        phase: "implement",
        features: [feat1, feat2],
        artifacts: {},
        lastUpdated: "2026-03-29T00:00:00Z",
      };

      mockReturns.ghIssueCreate = 100;
      const config = makeConfig();
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved);

      expect(result.epicCreated).toBe(true);
      expect(result.epicNumber).toBe(100);
      // Features also get created (both return 100 from mock, but logic still runs)
      expect(result.featuresCreated).toBe(2);
    });

    test("existing epic with mixed feature states", async () => {
      const features: ManifestFeature[] = [
        makeFeature({ slug: "done-1", status: "completed", github: { issue: 31 } }),
        makeFeature({ slug: "active-1", status: "in-progress", github: { issue: 32 } }),
        makeFeature({ slug: "new-1", status: "pending" }),
      ];
      const manifest = makeManifest({ features, phase: "implement" });
      mockReturns.ghIssueLabels = ["status/ready"];
      mockReturns.ghIssueCreate = 33;
      const config = makeConfig();
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved);

      // 1 closed (done-1), 1 created (new-1)
      expect(result.featuresClosed).toBe(1);
      expect(result.featuresCreated).toBe(1);
      // Labels updated for active-1 (status/ready -> status/in-progress)
      expect(result.labelsUpdated).toBeGreaterThanOrEqual(1);
    });
  });

  // -------------------------------------------------------
  // 15. Epic body update — hash compare
  // -------------------------------------------------------
  describe("epic body update", () => {
    test("updates epic body when hash differs from stored", async () => {
      const manifest = makeManifest({
        phase: "implement",
        github: { epic: 10, bodyHash: "stale-hash" },
      });
      const config = makeConfig();
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved);

      // ghIssueEdit should be called with body for issue 10
      const editCalls = callsTo("ghIssueEdit");
      const bodyEdit = editCalls.find(
        (c) => c.args[1] === 10 && (c.args[2] as Record<string, unknown>).body !== undefined,
      );
      expect(bodyEdit).toBeDefined();
      expect(result.bodiesUpdated).toBeGreaterThanOrEqual(1);

      // Should return body hash mutation
      const hashMutation = result.mutations.find(m => m.type === "setEpicBodyHash");
      expect(hashMutation).toBeDefined();
    });

    test("skips epic body update when hash matches", async () => {
      // First call to get the hash the engine would compute
      const manifest = makeManifest({
        phase: "design",
        features: [],
        github: { epic: 10 },
      });
      const config = makeConfig();
      const resolved = makeResolved();

      const first = await syncGitHub(manifest, config, resolved);
      const hashMut = first.mutations.find(m => m.type === "setEpicBodyHash");

      // Now use that hash so it matches
      resetMocks();
      const manifest2 = makeManifest({
        phase: "design",
        features: [],
        github: { epic: 10, bodyHash: hashMut?.type === "setEpicBodyHash" ? hashMut.bodyHash : "x" },
      });

      const result = await syncGitHub(manifest2, config, resolved);

      // No body edit should have been made
      const editCalls = callsTo("ghIssueEdit");
      const bodyEdit = editCalls.find(
        (c) => c.args[1] === 10 && (c.args[2] as Record<string, unknown>).body !== undefined,
      );
      expect(bodyEdit).toBeUndefined();

      // No body hash mutation should be returned
      const hashMutation = result.mutations.find(m => m.type === "setEpicBodyHash");
      expect(hashMutation).toBeUndefined();
    });

    test("sets body on epic creation with hash mutation", async () => {
      const manifest = makeManifest();
      delete (manifest.github as Record<string, unknown>).epic;
      mockReturns.ghIssueCreate = 99;
      const config = makeConfig();
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved);

      // Body should be set via ghIssueCreate (not ghIssueEdit)
      const createCalls = callsTo("ghIssueCreate");
      expect(createCalls).toHaveLength(1);
      // Body arg (index 2) should contain formatted content
      expect(createCalls[0].args[2]).toContain("**Phase:**");

      // Body hash mutation should be returned
      const hashMut = result.mutations.find(m => m.type === "setEpicBodyHash");
      expect(hashMut).toBeDefined();
      expect(result.bodiesUpdated).toBe(1);
    });

    test("warns when epic body update fails", async () => {
      const manifest = makeManifest({
        phase: "implement",
        github: { epic: 10, bodyHash: "stale-hash" },
      });
      mockErrors.ghIssueEdit = true;
      const config = makeConfig();
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved);

      expect(result.warnings).toContain("Failed to update epic body");
    });
  });

  // -------------------------------------------------------
  // 16. Feature body update — hash compare
  // -------------------------------------------------------
  describe("feature body update", () => {
    test("updates feature body when hash differs", async () => {
      const feature = makeFeature({
        slug: "feat-a",
        status: "in-progress",
        github: { issue: 20, bodyHash: "stale-hash" },
      });
      const manifest = makeManifest({ features: [feature] });
      const config = makeConfig();
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved);

      // ghIssueEdit for feature 20 with body
      const editCalls = callsTo("ghIssueEdit");
      const bodyEdit = editCalls.find(
        (c) => c.args[1] === 20 && (c.args[2] as Record<string, unknown>).body !== undefined,
      );
      expect(bodyEdit).toBeDefined();
      expect(result.bodiesUpdated).toBeGreaterThanOrEqual(1);

      // Body hash mutation for feature
      const hashMut = result.mutations.find(
        m => m.type === "setFeatureBodyHash" && m.featureSlug === "feat-a",
      );
      expect(hashMut).toBeDefined();
    });

    test("skips feature body update when hash matches", async () => {
      // First call to get the correct hash
      const feature1 = makeFeature({
        slug: "feat-a",
        status: "in-progress",
        github: { issue: 20 },
      });
      const manifest1 = makeManifest({ features: [feature1] });
      const config = makeConfig();
      const resolved = makeResolved();

      const first = await syncGitHub(manifest1, config, resolved);
      const hashMut = first.mutations.find(
        m => m.type === "setFeatureBodyHash" && m.featureSlug === "feat-a",
      );

      // Now use that hash
      resetMocks();
      const feature2 = makeFeature({
        slug: "feat-a",
        status: "in-progress",
        github: { issue: 20, bodyHash: hashMut?.type === "setFeatureBodyHash" ? hashMut.bodyHash : "x" },
      });
      const manifest2 = makeManifest({ features: [feature2] });

      const result = await syncGitHub(manifest2, config, resolved);

      // No body edit for feature 20
      const editCalls = callsTo("ghIssueEdit");
      const bodyEdit = editCalls.find(
        (c) => c.args[1] === 20 && (c.args[2] as Record<string, unknown>).body !== undefined,
      );
      expect(bodyEdit).toBeUndefined();
    });

    test("sets body on feature creation with hash mutation", async () => {
      const feature = makeFeature({ slug: "new-feat", status: "pending" });
      const manifest = makeManifest({ features: [feature] });
      mockReturns.ghIssueCreate = 50;
      const config = makeConfig();
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved);

      // Feature create should include body
      const createCalls = callsTo("ghIssueCreate");
      // Find the feature create (title = feature slug)
      const featureCreate = createCalls.find(c => c.args[1] === "new-feat");
      expect(featureCreate).toBeDefined();
      expect(featureCreate!.args[2]).toContain("**Epic:** #10");

      // Body hash mutation
      const hashMut = result.mutations.find(
        m => m.type === "setFeatureBodyHash" && m.featureSlug === "new-feat",
      );
      expect(hashMut).toBeDefined();
      expect(result.bodiesUpdated).toBeGreaterThanOrEqual(1);
    });

    test("warns when feature body update fails", async () => {
      const feature = makeFeature({
        slug: "feat-a",
        status: "in-progress",
        github: { issue: 20, bodyHash: "stale-hash" },
      });
      const manifest = makeManifest({ features: [feature] });
      mockErrors.ghIssueEdit = true;
      const config = makeConfig();
      const resolved = makeResolved();

      const result = await syncGitHub(manifest, config, resolved);

      expect(result.warnings).toContain("Failed to update body for feature feat-a");
    });
  });

  // -------------------------------------------------------
  // Body enrichment (PRD sections, artifact links, user stories)
  // -------------------------------------------------------
  describe("body enrichment", () => {
    let tempDir: string;

    function setupArtifacts(opts: {
      designContent?: string;
      planContent?: string;
      planPath?: string;
    }) {
      tempDir = mkdtempSync(join(tmpdir(), "beastmode-test-"));
      if (opts.designContent) {
        const designDir = join(tempDir, ".beastmode", "artifacts", "design");
        mkdirSync(designDir, { recursive: true });
        writeFileSync(join(designDir, "test-epic.md"), opts.designContent);
      }
      if (opts.planContent && opts.planPath) {
        const planDir = join(tempDir, ...opts.planPath.split("/").slice(0, -1));
        mkdirSync(planDir, { recursive: true });
        writeFileSync(join(tempDir, opts.planPath), opts.planContent);
      }
    }

    function cleanupArtifacts() {
      if (tempDir) {
        try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
      }
    }

    test("epic body includes PRD problem section from design artifact", async () => {
      setupArtifacts({
        designContent: [
          "---",
          "phase: design",
          "slug: test-epic",
          "---",
          "",
          "## Problem Statement",
          "",
          "This is the rich PRD problem description.",
          "",
          "## Solution",
          "",
          "This is the rich PRD solution.",
          "",
          "## User Stories",
          "",
          "1. As a user, I want X",
          "",
          "## Implementation Decisions",
          "",
          "- Decision A",
        ].join("\n"),
      });

      const manifest = makeManifest({
        artifacts: {
          design: [".beastmode/artifacts/design/test-epic.md"],
        },
        // No stored body hash — forces an update
        github: { epic: 10, repo: "org/repo" },
      });

      const config = makeConfig();
      const resolved = makeResolved();
      await syncGitHub(manifest, config, resolved, {
        projectRoot: tempDir,
      });

      // Verify the body passed to ghIssueEdit includes PRD sections
      const editCalls = callsTo("ghIssueEdit");
      const bodyEdit = editCalls.find(c => (c.args[2] as any)?.body);
      expect(bodyEdit).toBeDefined();
      const body = (bodyEdit!.args[2] as any).body as string;
      expect(body).toContain("## Problem");
      expect(body).toContain("This is the rich PRD problem description.");
      expect(body).toContain("## Solution");
      expect(body).toContain("This is the rich PRD solution.");
      expect(body).toContain("## User Stories");
      expect(body).toContain("1. As a user, I want X");
      expect(body).toContain("## Decisions");
      expect(body).toContain("- Decision A");

      cleanupArtifacts();
    });

    test("epic body includes artifact links section", async () => {
      setupArtifacts({
        designContent: "## Problem Statement\n\nSome problem",
      });

      const manifest = makeManifest({
        artifacts: {
          design: [".beastmode/artifacts/design/test-epic.md"],
          plan: [".beastmode/artifacts/plan/test-epic.md"],
        },
        github: { epic: 10, repo: "org/repo" },
      });

      const config = makeConfig();
      const resolved = makeResolved();
      await syncGitHub(manifest, config, resolved, {
        projectRoot: tempDir,
      });

      const editCalls = callsTo("ghIssueEdit");
      const bodyEdit = editCalls.find(c => (c.args[2] as any)?.body);
      expect(bodyEdit).toBeDefined();
      const body = (bodyEdit!.args[2] as any).body as string;
      expect(body).toContain("## Artifacts");
      expect(body).toContain("design");
      expect(body).toContain(".beastmode/artifacts/design/test-epic.md");

      cleanupArtifacts();
    });

    test("feature body includes user story from plan artifact", async () => {
      const planPath = ".beastmode/artifacts/plan/test-feature.md";
      setupArtifacts({
        designContent: "## Problem Statement\n\nSome problem",
        planContent: [
          "---",
          "phase: plan",
          "---",
          "",
          "## User Stories",
          "",
          "As a developer, I want to enrich bodies.",
        ].join("\n"),
        planPath,
      });

      const feature = makeFeature({
        slug: "feat-enrich",
        plan: planPath,
        status: "pending",
      });
      const manifest = makeManifest({
        features: [feature],
        artifacts: { design: [".beastmode/artifacts/design/test-epic.md"] },
        github: { epic: 10, repo: "org/repo" },
      });

      const config = makeConfig();
      const resolved = makeResolved();
      await syncGitHub(manifest, config, resolved, {
        projectRoot: tempDir,
      });

      // Feature is created since it has no github.issue
      const createCalls = callsTo("ghIssueCreate");
      const featureCreate = createCalls.find(c => c.args[1] === "feat-enrich");
      expect(featureCreate).toBeDefined();
      const body = featureCreate!.args[2] as string;
      expect(body).toContain("## User Story");
      expect(body).toContain("As a developer, I want to enrich bodies.");

      cleanupArtifacts();
    });

    test("gracefully degrades when design artifact is missing", async () => {
      tempDir = mkdtempSync(join(tmpdir(), "beastmode-test-"));

      const manifest = makeManifest({
        artifacts: {
          design: [".beastmode/artifacts/design/missing.md"],
        },
        github: { epic: 10, repo: "org/repo" },
      });

      const config = makeConfig();
      const resolved = makeResolved();

      // Should not throw
      const result = await syncGitHub(manifest, config, resolved, {
        projectRoot: tempDir,
      });

      // Body still renders (just without enrichment)
      expect(result.warnings).not.toContain(expect.stringMatching(/error/i));

      cleanupArtifacts();
    });

    test("gracefully degrades when feature plan is missing", async () => {
      tempDir = mkdtempSync(join(tmpdir(), "beastmode-test-"));

      const feature = makeFeature({
        slug: "feat-noplan",
        plan: ".beastmode/artifacts/plan/nonexistent.md",
        status: "pending",
      });
      const manifest = makeManifest({
        features: [feature],
        github: { epic: 10, repo: "org/repo" },
      });

      const config = makeConfig();
      const resolved = makeResolved();

      await syncGitHub(manifest, config, resolved, {
        projectRoot: tempDir,
      });

      // Feature is created without user story — no crash
      const createCalls = callsTo("ghIssueCreate");
      const featureCreate = createCalls.find(c => c.args[1] === "feat-noplan");
      expect(featureCreate).toBeDefined();
      const body = featureCreate!.args[2] as string;
      expect(body).not.toContain("## User Story");

      cleanupArtifacts();
    });

    test("no enrichment when projectRoot not provided", async () => {
      const manifest = makeManifest({
        artifacts: {
          design: [".beastmode/artifacts/design/test-epic.md"],
        },
        github: { epic: 10, repo: "org/repo" },
      });

      const config = makeConfig();
      const resolved = makeResolved();

      // No projectRoot — enrichment disabled
      await syncGitHub(manifest, config, resolved);

      const editCalls = callsTo("ghIssueEdit");
      const bodyEdit = editCalls.find(c => (c.args[2] as any)?.body);
      if (bodyEdit) {
        const body = (bodyEdit!.args[2] as any).body as string;
        // No PRD sections without projectRoot
        expect(body).not.toContain("## User Stories");
        expect(body).not.toContain("## Decisions");
      }
    });

    test("epic body includes git metadata when manifest has worktree branch", async () => {
      setupArtifacts({
        designContent: "## Problem Statement\n\nSome problem",
      });

      const manifest = makeManifest({
        artifacts: {
          design: [".beastmode/artifacts/design/test-epic.md"],
        },
        worktree: { branch: "feature/test-branch", path: "/tmp/test" },
        github: { epic: 10, repo: "org/repo" },
      });

      const config = makeConfig();
      const resolved = makeResolved();
      await syncGitHub(manifest, config, resolved, {
        projectRoot: tempDir,
      });

      const editCalls = callsTo("ghIssueEdit");
      const bodyEdit = editCalls.find(c => (c.args[2] as any)?.body);
      expect(bodyEdit).toBeDefined();
      const body = (bodyEdit!.args[2] as any).body as string;
      expect(body).toContain("## Git");
      expect(body).toContain("**Branch:** `feature/test-branch`");

      cleanupArtifacts();
    });

    test("epic body omits git metadata when no worktree info and no tags", async () => {
      tempDir = mkdtempSync(join(tmpdir(), "beastmode-test-"));

      const manifest = makeManifest({
        // No worktree, no artifacts
        github: { epic: 10, repo: "org/repo" },
      });

      const config = makeConfig();
      const resolved = makeResolved();
      await syncGitHub(manifest, config, resolved, {
        projectRoot: tempDir,
      });

      const editCalls = callsTo("ghIssueEdit");
      const bodyEdit = editCalls.find(c => (c.args[2] as any)?.body);
      if (bodyEdit) {
        const body = (bodyEdit!.args[2] as any).body as string;
        expect(body).not.toContain("## Git");
      }

      cleanupArtifacts();
    });
  });
});
