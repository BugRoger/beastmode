/**
 * Unit tests for branch-link log level downgrade and phase context.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

const mockGhRepoNodeId = vi.hoisted(() => vi.fn());
const mockGhIssueNodeId = vi.hoisted(() => vi.fn());
const mockGhCreateLinkedBranch = vi.hoisted(() => vi.fn());

vi.mock("../github/cli.js", () => ({
  ghRepoNodeId: mockGhRepoNodeId,
  ghIssueNodeId: mockGhIssueNodeId,
  ghCreateLinkedBranch: mockGhCreateLinkedBranch,
}));

const mockGit = vi.hoisted(() =>
  vi.fn(async () => ({ stdout: "abc123", stderr: "", exitCode: 0 })),
);

vi.mock("../git/worktree.js", () => ({
  git: mockGit,
}));

import { linkBranches } from "../github/branch-link.js";
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

describe("branch-link log levels", () => {
  beforeEach(() => {
    mockGhRepoNodeId.mockReset();
    mockGhIssueNodeId.mockReset();
    mockGhCreateLinkedBranch.mockReset();
    mockGit.mockReset();
    mockGit.mockImplementation(async () => ({
      stdout: "abc123def456",
      stderr: "",
      exitCode: 0,
    }));
  });

  it("createLinkedBranch null result logged at debug, not warn", async () => {
    mockGhRepoNodeId.mockResolvedValue("R_repo123");
    mockGhIssueNodeId.mockResolvedValue("I_epic456");
    mockGhCreateLinkedBranch.mockResolvedValue(undefined);

    const logger = createSpyLogger();

    await linkBranches({
      repo: "org/repo",
      epicSlug: "my-epic",
      epicIssueNumber: 100,
      phase: "plan",
      logger,
    });

    const warns = logger.calls.filter(
      (c) =>
        c.level === "warn" && c.msg.includes("createLinkedBranch returned null"),
    );
    expect(warns).toHaveLength(0);

    const debugs = logger.calls.filter(
      (c) =>
        c.level === "debug" &&
        c.msg.includes("createLinkedBranch returned null"),
    );
    expect(debugs).toHaveLength(1);
  });

  it("warn calls include phase in context data", async () => {
    mockGhRepoNodeId.mockResolvedValue(undefined);

    const logger = createSpyLogger();

    await linkBranches({
      repo: "org/repo",
      epicSlug: "my-epic",
      epicIssueNumber: 100,
      phase: "implement",
      logger,
    });

    const warns = logger.calls.filter((c) => c.level === "warn");
    expect(warns.length).toBeGreaterThan(0);
    for (const w of warns) {
      expect(w.data?.phase).toBe("implement");
    }
  });

  it("genuine failures remain at warn level", async () => {
    mockGhRepoNodeId.mockResolvedValue("R_repo123");
    mockGhIssueNodeId.mockResolvedValue(undefined);

    const logger = createSpyLogger();

    await linkBranches({
      repo: "org/repo",
      epicSlug: "my-epic",
      epicIssueNumber: 100,
      phase: "plan",
      logger,
    });

    const warns = logger.calls.filter(
      (c) => c.level === "warn" && c.msg.includes("failed to resolve issue"),
    );
    expect(warns).toHaveLength(1);
  });
});
