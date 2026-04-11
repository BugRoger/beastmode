/**
 * Unit tests for sync error catch block logging.
 */

import { describe, test, expect, vi } from "vitest";
import { mkdtempSync, mkdirSync } from "fs";
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

describe("sync error catch block logging", () => {
  test("readPrdSections logs warn with path context when readFileSync throws", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "err-log-"));
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    // Create a directory where a file is expected — readFileSync throws on directories
    mkdirSync(join(designDir, "bad-artifact.md"), { recursive: true });

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "plan",
      features: [],
      artifacts: { design: ["bad-artifact.md"] },
    };

    await syncGitHub(epic, {}, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const warns = logger.calls.filter(c => c.level === "warn");
    const readErr = warns.find(c => c.data?.path !== undefined);
    expect(readErr).toBeDefined();
  });

  test("syncFeature plan reader logs error with path when readFileSync throws", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "err-log-"));
    // Create a directory where the plan file is expected
    const planDir = join(tmpDir, ".beastmode", "artifacts", "plan");
    mkdirSync(planDir, { recursive: true });
    mkdirSync(join(planDir, "bad-plan.md"), { recursive: true });

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "implement",
      features: [{ id: "bm-1.1", slug: "feat-a", status: "pending", plan: "bad-plan.md" }],
    };

    await syncGitHub(epic, { "bm-1": { issue: 10 } }, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const errors = logger.calls.filter(c => c.level === "error");
    const readErr = errors.find(c => c.data?.path !== undefined && c.msg.includes("plan"));
    expect(readErr).toBeDefined();
  });
});
