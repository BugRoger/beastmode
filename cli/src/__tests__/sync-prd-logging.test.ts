/**
 * Unit tests for readPrdSections debug logging.
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// --- Mock Bun globals ---
try {
  Object.defineProperty(globalThis, 'Bun', {
    value: {
      CryptoHasher: class {
        constructor(_algo: string) {}
        update(_data: string) {}
        digest(_format: string) { return "abc123"; }
      },
      spawnSync: (_args: string[]) => ({ success: true, stdout: "", stderr: "" }),
    },
    configurable: true,
  });
} catch {
  // Bun might already be set, ignore
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

describe("readPrdSections logging", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "prd-log-"));
  });

  test("logs stored artifact path at debug level with path in structured data", async () => {
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    writeFileSync(join(designDir, "2026-04-06-abc.md"), "## Problem Statement\nTest\n");

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "design",
      features: [],
      artifacts: { design: ["2026-04-06-abc.md"] },
    };

    await syncGitHub(epic, {}, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const debugCalls = logger.calls.filter(c => c.level === "debug");
    const storedLog = debugCalls.find(c => c.msg.includes("stored") && c.data?.path === "2026-04-06-abc.md");
    expect(storedLog).toBeDefined();
  });

  test("logs resolved absolute path at debug level with path in structured data", async () => {
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    writeFileSync(join(designDir, "2026-04-06-abc.md"), "## Problem Statement\nTest\n");

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "design",
      features: [],
      artifacts: { design: ["2026-04-06-abc.md"] },
    };

    await syncGitHub(epic, {}, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const debugCalls = logger.calls.filter(c => c.level === "debug");
    const resolvedLog = debugCalls.find(c => c.msg.includes("resolved") && c.data?.path?.toString().includes(tmpDir));
    expect(resolvedLog).toBeDefined();
  });

  test("logs warning when design artifact file does not exist", async () => {
    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "design",
      features: [],
      artifacts: { design: ["missing.md"] },
    };

    await syncGitHub(epic, {}, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const warns = logger.calls.filter(c => c.level === "warn");
    const missingWarn = warns.find(c => c.data?.path !== undefined && (c.msg.includes("not found") || c.msg.includes("does not exist")));
    expect(missingWarn).toBeDefined();
  });

  test("logs extracted section names at debug level", async () => {
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    writeFileSync(
      join(designDir, "2026-04-06-abc.md"),
      "## Problem Statement\nP\n\n## Solution\nS\n\n## User Stories\nU\n",
    );

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "design",
      features: [],
      artifacts: { design: ["2026-04-06-abc.md"] },
    };

    await syncGitHub(epic, {}, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const debugCalls = logger.calls.filter(c => c.level === "debug");
    const sectionLog = debugCalls.find(c => c.msg.includes("extracted") || c.msg.includes("sections"));
    expect(sectionLog).toBeDefined();
  });

  test("logs error with path context when file read throws", async () => {
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    // Create a subdirectory where a file is expected — readFileSync throws on directories
    mkdirSync(join(designDir, "2026-04-06-abc.md"), { recursive: true });

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "design",
      features: [],
      artifacts: { design: ["2026-04-06-abc.md"] },
    };

    await syncGitHub(epic, {}, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const errorCalls = logger.calls.filter(c => c.level === "error");
    const readError = errorCalls.find(c => c.data?.path !== undefined);
    expect(readError).toBeDefined();
  });
});

