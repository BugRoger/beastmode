/**
 * Integration tests for sync-log-cleanup feature.
 *
 * Covers: phase gates, log level classification, phase context enrichment.
 * Expected to FAIL before implementation (RED state).
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// --- Mock Bun globals ---
try {
  Object.defineProperty(globalThis, "Bun", {
    value: {
      CryptoHasher: class {
        constructor(_algo: string) {}
        update(_data: string) {}
        digest(_format: string) {
          return "abc123";
        }
      },
      spawnSync: (_args: string[]) => ({
        success: true,
        stdout: "",
        stderr: "",
      }),
    },
    configurable: true,
  });
} catch {
  // Bun might already be set
}

// --- Mock gh CLI ---
vi.mock("../github/cli", () => ({
  ghIssueCreate: async () => 42,
  ghIssueEdit: async () => true,
  ghIssueClose: async () => true,
  ghIssueComment: async () => true,
  ghIssueComments: async () => [],
  ghIssueState: async () => "open",
  ghIssueReopen: async () => true,
  ghIssueLabels: async () => ["type/epic", "phase/design"],
  ghProjectItemAdd: async () => "item-123",
  ghProjectSetField: async () => true,
  ghSubIssueAdd: async () => true,
  ghProjectItemDelete: async () => true,
}));

import { syncGitHub } from "../github/sync";
import type { EpicSyncInput } from "../github/sync";
import type { BeastmodeConfig } from "../config";
import type { ResolvedGitHub } from "../github/discovery";
import type { Logger } from "../logger";

function createSpyLogger(): Logger & {
  calls: { level: string; msg: string; data?: Record<string, unknown> }[];
} {
  const calls: {
    level: string;
    msg: string;
    data?: Record<string, unknown>;
  }[] = [];
  const logger: any = {
    calls,
    info: (msg: string, data?: Record<string, unknown>) =>
      calls.push({ level: "info", msg, data }),
    debug: (msg: string, data?: Record<string, unknown>) =>
      calls.push({ level: "debug", msg, data }),
    warn: (msg: string, data?: Record<string, unknown>) =>
      calls.push({ level: "warn", msg, data }),
    error: (msg: string, data?: Record<string, unknown>) =>
      calls.push({ level: "error", msg, data }),
    child: (ctx: Record<string, unknown>) => {
      const childLogger: any = {
        calls,
        info: (msg: string, data?: Record<string, unknown>) =>
          calls.push({ level: "info", msg, data: { ...ctx, ...data } }),
        debug: (msg: string, data?: Record<string, unknown>) =>
          calls.push({ level: "debug", msg, data: { ...ctx, ...data } }),
        warn: (msg: string, data?: Record<string, unknown>) =>
          calls.push({ level: "warn", msg, data: { ...ctx, ...data } }),
        error: (msg: string, data?: Record<string, unknown>) =>
          calls.push({ level: "error", msg, data: { ...ctx, ...data } }),
        child: (_ctx2: Record<string, unknown>) => childLogger,
      };
      return childLogger;
    },
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

// ============================================================================
// Feature 1: Phase-aware artifact gating
// ============================================================================

describe("sync phase-aware artifact gating", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "sync-gate-"));
  });

  test("design-phase sync skips PRD artifact read without logging a warning", async () => {
    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "design",
      features: [],
      artifacts: { design: ["2026-04-06-abc.md"] },
    };

    await syncGitHub(epic, {}, makeConfig(), makeResolved(), {
      logger,
      projectRoot: tmpDir,
    });

    const warns = logger.calls.filter((c) => c.level === "warn");
    const prdWarns = warns.filter(
      (c) =>
        c.msg.includes("design artifact") || c.msg.includes("readPrdSections"),
    );
    expect(prdWarns).toHaveLength(0);
  });

  test("design-phase sync skips plan file reads without logging a warning", async () => {
    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "design",
      features: [
        { id: "bm-1.1", slug: "feat-a", status: "pending", plan: "plan.md" },
      ],
    };

    await syncGitHub(
      epic,
      { "bm-1": { issue: 10 } },
      makeConfig(),
      makeResolved(),
      { logger, projectRoot: tmpDir },
    );

    const warns = logger.calls.filter((c) => c.level === "warn");
    const planWarns = warns.filter(
      (c) => c.msg.includes("plan") && c.msg.includes("does not exist"),
    );
    expect(planWarns).toHaveLength(0);
  });

  test("plan-phase sync skips plan file reads without logging a warning", async () => {
    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "plan",
      features: [
        { id: "bm-1.1", slug: "feat-a", status: "pending", plan: "plan.md" },
      ],
    };

    await syncGitHub(
      epic,
      { "bm-1": { issue: 10 } },
      makeConfig(),
      makeResolved(),
      { logger, projectRoot: tmpDir },
    );

    const warns = logger.calls.filter((c) => c.level === "warn");
    const planWarns = warns.filter(
      (c) => c.msg.includes("plan") && c.msg.includes("does not exist"),
    );
    expect(planWarns).toHaveLength(0);
  });

  test("implement-phase sync reads design artifact normally", async () => {
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    writeFileSync(
      join(designDir, "2026-04-06-abc.md"),
      "## Problem Statement\nTest\n",
    );

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "implement",
      features: [],
      artifacts: { design: ["2026-04-06-abc.md"] },
    };

    await syncGitHub(epic, { "bm-1": { issue: 10 } }, makeConfig(), makeResolved(), {
      logger,
      projectRoot: tmpDir,
    });

    const debugCalls = logger.calls.filter((c) => c.level === "debug");
    const extracted = debugCalls.find(
      (c) => c.msg.includes("extracted") || c.msg.includes("sections"),
    );
    expect(extracted).toBeDefined();
  });

  test("implement-phase sync reads plan files normally", async () => {
    const planDir = join(tmpDir, ".beastmode", "artifacts", "plan");
    mkdirSync(planDir, { recursive: true });
    writeFileSync(
      join(planDir, "plan.md"),
      "## User Stories\nTest\n\n## What to Build\nStuff\n",
    );

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "implement",
      features: [
        { id: "bm-1.1", slug: "feat-a", status: "pending", plan: "plan.md" },
      ],
    };

    await syncGitHub(
      epic,
      { "bm-1": { issue: 10 } },
      makeConfig(),
      makeResolved(),
      { logger, projectRoot: tmpDir },
    );

    const debugCalls = logger.calls.filter((c) => c.level === "debug");
    const planLog = debugCalls.find(
      (c) => c.msg.includes("plan") && c.msg.includes("stored"),
    );
    expect(planLog).toBeDefined();
  });
});

// ============================================================================
// Feature 2: Log level classification
// ============================================================================

describe("sync log level classification", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "sync-level-"));
  });

  test("readPrdSections file read exception logged at warn, not error", async () => {
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    // Create a directory where a file is expected — readFileSync throws on directories
    mkdirSync(join(designDir, "2026-04-06-abc.md"), { recursive: true });

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "implement",
      features: [],
      artifacts: { design: ["2026-04-06-abc.md"] },
    };

    await syncGitHub(epic, { "bm-1": { issue: 10 } }, makeConfig(), makeResolved(), {
      logger,
      projectRoot: tmpDir,
    });

    const errorCalls = logger.calls.filter(
      (c) =>
        c.level === "error" &&
        c.msg.includes("readPrdSections") &&
        c.msg.includes("failed"),
    );
    expect(errorCalls).toHaveLength(0);

    const warnCalls = logger.calls.filter(
      (c) =>
        c.level === "warn" &&
        c.msg.includes("readPrdSections") &&
        c.msg.includes("failed"),
    );
    expect(warnCalls).toHaveLength(1);
  });
});

// ============================================================================
// Feature 3: Phase context enrichment
// ============================================================================

describe("sync warning phase context", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "sync-ctx-"));
  });

  test("sync warning includes phase in log context", async () => {
    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "implement",
      features: [],
      artifacts: { design: ["missing.md"] },
    };

    await syncGitHub(epic, { "bm-1": { issue: 10 } }, makeConfig(), makeResolved(), {
      logger,
      projectRoot: tmpDir,
    });

    const warns = logger.calls.filter((c) => c.level === "warn");
    const withPhase = warns.filter((c) => c.data?.phase === "implement");
    expect(withPhase.length).toBeGreaterThan(0);
  });

  test("debug entries from sync also carry phase context", async () => {
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    writeFileSync(
      join(designDir, "2026-04-06-abc.md"),
      "## Problem Statement\nTest\n",
    );

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "implement",
      features: [],
      artifacts: { design: ["2026-04-06-abc.md"] },
    };

    await syncGitHub(epic, { "bm-1": { issue: 10 } }, makeConfig(), makeResolved(), {
      logger,
      projectRoot: tmpDir,
    });

    const debugCalls = logger.calls.filter(
      (c) => c.level === "debug" && c.msg.includes("readPrdSections"),
    );
    for (const d of debugCalls) {
      expect(d.data?.phase).toBe("implement");
    }
  });
});
