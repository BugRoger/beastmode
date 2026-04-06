/**
 * Integration test for sync debug logging.
 * Verifies the GitHub sync path emits structured debug logs
 * for path resolution, file reads, and errors.
 *
 * @fix-worktree-paths
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// --- Mock gh CLI module ---
const mockCalls: { fn: string; args: unknown[] }[] = [];
function trackCall(fn: string, ...args: unknown[]): void {
  mockCalls.push({ fn, args });
}

vi.mock("../github/cli", () => ({
  ghIssueCreate: async (...args: unknown[]) => { trackCall("ghIssueCreate", ...args); return 42; },
  ghIssueEdit: async (...args: unknown[]) => { trackCall("ghIssueEdit", ...args); return true; },
  ghIssueClose: async (...args: unknown[]) => { trackCall("ghIssueClose", ...args); return true; },
  ghIssueComment: async (...args: unknown[]) => { trackCall("ghIssueComment", ...args); return true; },
  ghIssueComments: async (...args: unknown[]) => { trackCall("ghIssueComments", ...args); return []; },
  ghIssueState: async (...args: unknown[]) => { trackCall("ghIssueState", ...args); return "open"; },
  ghIssueReopen: async (...args: unknown[]) => { trackCall("ghIssueReopen", ...args); return true; },
  ghIssueLabels: async (...args: unknown[]) => { trackCall("ghIssueLabels", ...args); return ["type/epic", "phase/design"]; },
  ghProjectItemAdd: async (...args: unknown[]) => { trackCall("ghProjectItemAdd", ...args); return "item-123"; },
  ghProjectSetField: async (...args: unknown[]) => { trackCall("ghProjectSetField", ...args); return true; },
  ghSubIssueAdd: async (...args: unknown[]) => { trackCall("ghSubIssueAdd", ...args); return true; },
  ghProjectItemDelete: async (...args: unknown[]) => { trackCall("ghProjectItemDelete", ...args); return true; },
}));

import { syncGitHub } from "../github/sync";
import type { EpicSyncInput } from "../github/sync";
import type { BeastmodeConfig } from "../config";
import type { ResolvedGitHub } from "../github/discovery";
import type { Logger } from "../logger";

// --- Logger spy ---
function createSpyLogger(): Logger & { calls: { level: string; msg: string; data?: Record<string, unknown> }[] } {
  const calls: { level: string; msg: string; data?: Record<string, unknown> }[] = [];
  const logger: any = {
    calls,
    info: (msg: string, data?: Record<string, unknown>) => calls.push({ level: "info", msg, data }),
    debug: (msg: string, data?: Record<string, unknown>) => calls.push({ level: "debug", msg, data }),
    warn: (msg: string, data?: Record<string, unknown>) => calls.push({ level: "warn", msg, data }),
    error: (msg: string, data?: Record<string, unknown>) => calls.push({ level: "error", msg, data }),
    child: () => logger,
  };
  return logger;
}

function makeConfig(): BeastmodeConfig {
  return {
    github: { enabled: true },
    cli: { interval: 60 },
    hitl: { timeout: 30 },
    "file-permissions": { timeout: 60, "claude-settings": "" },
  };
}

function makeResolved(): ResolvedGitHub {
  return { repo: "org/repo" };
}

describe("GitHub sync path emits structured debug logs", () => {
  let tmpDir: string;

  beforeEach(() => {
    mockCalls.length = 0;
    tmpDir = mkdtempSync(join(tmpdir(), "sync-log-"));
  });

  test("Scenario: Sync logs the stored path and resolved path during PRD read", async () => {
    // Given: epic has a design artifact path stored
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    const designFile = "2026-04-06-abc123.md";
    writeFileSync(join(designDir, designFile), "## Problem Statement\nTest problem\n\n## Solution\nTest solution\n");

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-test",
      slug: "test",
      name: "Test",
      phase: "design",
      features: [],
      artifacts: { design: [designFile] },
    };

    // When: sync reads PRD sections
    await syncGitHub(epic, {}, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    // Then: logger receives debug entries with stored and resolved paths
    const debugCalls = logger.calls.filter(c => c.level === "debug");
    const storedPathLog = debugCalls.find(c => c.msg.includes("stored") && c.data?.path);
    const resolvedPathLog = debugCalls.find(c => c.msg.includes("resolved") && c.data?.path);
    expect(storedPathLog).toBeDefined();
    expect(resolvedPathLog).toBeDefined();
  });

  test("Scenario: Sync logs a warning when the design artifact file is missing", async () => {
    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-test",
      slug: "test",
      name: "Test",
      phase: "design",
      features: [],
      artifacts: { design: ["nonexistent.md"] },
    };

    await syncGitHub(epic, {}, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const warns = logger.calls.filter(c => c.level === "warn");
    const missingWarn = warns.find(c => c.msg.includes("not found") || c.msg.includes("missing") || c.msg.includes("does not exist"));
    expect(missingWarn).toBeDefined();
    expect(missingWarn!.data?.path).toBeDefined();
  });

  test("Scenario: Sync logs a warning when the feature plan file is missing", async () => {
    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-test",
      slug: "test",
      name: "Test",
      phase: "plan",
      features: [{ id: "bm-test.1", slug: "feat-a", status: "pending", plan: "nonexistent-plan.md" }],
    };

    await syncGitHub(epic, { "bm-test": { issue: 10 } }, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const warns = logger.calls.filter(c => c.level === "warn");
    const missingWarn = warns.find(c => c.msg.includes("plan") && (c.msg.includes("not found") || c.msg.includes("missing") || c.msg.includes("does not exist")));
    expect(missingWarn).toBeDefined();
  });

  test("Scenario: Sync logs section extraction results for PRD", async () => {
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    const designFile = "2026-04-06-abc123.md";
    writeFileSync(join(designDir, designFile), "## Problem Statement\nTest\n\n## Solution\nTest\n\n## User Stories\nTest\n");

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-test",
      slug: "test",
      name: "Test",
      phase: "design",
      features: [],
      artifacts: { design: [designFile] },
    };

    await syncGitHub(epic, {}, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const debugCalls = logger.calls.filter(c => c.level === "debug");
    const sectionLog = debugCalls.find(c => c.msg.includes("section") || c.msg.includes("extracted"));
    expect(sectionLog).toBeDefined();
  });

  test("Scenario: Sync logs path context with structured data fields", async () => {
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    const designFile = "2026-04-06-abc123.md";
    writeFileSync(join(designDir, designFile), "## Problem Statement\nTest\n");

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-test",
      slug: "test",
      name: "Test",
      phase: "design",
      features: [],
      artifacts: { design: [designFile] },
    };

    await syncGitHub(epic, {}, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const pathLogs = logger.calls.filter(c => c.data?.path !== undefined);
    expect(pathLogs.length).toBeGreaterThanOrEqual(1);
  });
});
