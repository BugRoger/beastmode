/**
 * Unit tests for phase gates in sync.ts.
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
  // already set
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

describe("readPrdSections phase gate", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "prd-gate-"));
  });

  test("skips at design phase with debug log", async () => {
    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "design",
      features: [],
      artifacts: { design: ["missing.md"] },
    };

    await syncGitHub(epic, {}, makeConfig(), makeResolved(), {
      logger,
      projectRoot: tmpDir,
    });

    const warns = logger.calls.filter(
      (c) => c.level === "warn" && c.msg.includes("readPrdSections"),
    );
    expect(warns).toHaveLength(0);

    const debugs = logger.calls.filter(
      (c) => c.level === "debug" && c.msg.includes("skipped"),
    );
    expect(debugs.length).toBeGreaterThan(0);
  });

  test("reads at plan phase", async () => {
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
      phase: "plan",
      features: [],
      artifacts: { design: ["2026-04-06-abc.md"] },
    };

    await syncGitHub(
      epic,
      { "bm-1": { issue: 10 } },
      makeConfig(),
      makeResolved(),
      { logger, projectRoot: tmpDir },
    );

    const debugCalls = logger.calls.filter((c) => c.level === "debug");
    const extracted = debugCalls.find(
      (c) => c.msg.includes("extracted") || c.msg.includes("sections"),
    );
    expect(extracted).toBeDefined();
  });
});

describe("syncFeature plan file phase gate", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "plan-gate-"));
  });

  test("skips at design phase with debug log", async () => {
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

    const warns = logger.calls.filter(
      (c) =>
        c.level === "warn" &&
        c.msg.includes("plan") &&
        c.msg.includes("does not exist"),
    );
    expect(warns).toHaveLength(0);
  });

  test("skips at plan phase with debug log", async () => {
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

    const warns = logger.calls.filter(
      (c) =>
        c.level === "warn" &&
        c.msg.includes("plan") &&
        c.msg.includes("does not exist"),
    );
    expect(warns).toHaveLength(0);
  });

  test("reads at implement phase", async () => {
    const planDir = join(tmpDir, ".beastmode", "artifacts", "plan");
    mkdirSync(planDir, { recursive: true });
    writeFileSync(join(planDir, "plan.md"), "## User Stories\nTest\n");

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

describe("readPrdSections error downgrade", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "prd-level-"));
  });

  test("file read exception logged at warn, not error", async () => {
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
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

    await syncGitHub(
      epic,
      { "bm-1": { issue: 10 } },
      makeConfig(),
      makeResolved(),
      { logger, projectRoot: tmpDir },
    );

    const errors = logger.calls.filter(
      (c) => c.level === "error" && c.msg.includes("readPrdSections"),
    );
    expect(errors).toHaveLength(0);

    const warns = logger.calls.filter(
      (c) =>
        c.level === "warn" &&
        c.msg.includes("readPrdSections") &&
        c.msg.includes("failed"),
    );
    expect(warns).toHaveLength(1);
  });
});

describe("phase context enrichment", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "phase-ctx-"));
  });

  test("warn calls carry phase in context data", async () => {
    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "implement",
      features: [],
      artifacts: { design: ["missing.md"] },
    };

    await syncGitHub(
      epic,
      { "bm-1": { issue: 10 } },
      makeConfig(),
      makeResolved(),
      { logger, projectRoot: tmpDir },
    );

    const warns = logger.calls.filter((c) => c.level === "warn");
    // All sync-engine warns should carry phase
    for (const w of warns) {
      expect(w.data?.phase).toBe("implement");
    }
  });

  test("debug calls carry phase in context data", async () => {
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

    await syncGitHub(
      epic,
      { "bm-1": { issue: 10 } },
      makeConfig(),
      makeResolved(),
      { logger, projectRoot: tmpDir },
    );

    const debugCalls = logger.calls.filter(
      (c) => c.level === "debug" && c.msg.includes("readPrdSections"),
    );
    for (const d of debugCalls) {
      expect(d.data?.phase).toBe("implement");
    }
  });
});
