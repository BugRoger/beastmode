import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for the design-phase args rejection guard in phase.ts.
 *
 * The phaseCommand function calls process.exit(1) when design receives
 * positional args. We mock process.exit and the git helpers to test
 * this in isolation.
 */

// Create mocks with vi.hoisted before vi.mock calls
const mockIsInsideWorktree = vi.hoisted(() => vi.fn(async () => false));
const mockResolveMainCheckoutRoot = vi.hoisted(() => vi.fn(async () => "/mock/root"));

// Mock git helpers to avoid real filesystem checks
vi.mock("../git/index.js", () => ({
  isInsideWorktree: mockIsInsideWorktree,
  resolveMainCheckoutRoot: mockResolveMainCheckoutRoot,
}));

// Create store mock
const mockJsonFileStore = vi.hoisted(() => {
  return vi.fn(function (this: any) {
    this.load = vi.fn();
  } as any);
});

// Mock store to avoid real filesystem reads
vi.mock("../store/index.js", () => ({
  JsonFileStore: mockJsonFileStore,
  resolveIdentifier: vi.fn(),
}));

// Mock config to avoid filesystem reads
vi.mock("../config.js", () => ({
  loadConfig: vi.fn(() => ({
    hitl: { model: "test", timeout: 30, design: "", plan: "", implement: "", validate: "", release: "" },
    "file-permissions": { timeout: 60, "claude-settings": "" },
    github: { enabled: false },
  })),
  getCategoryProse: vi.fn(() => ""),
}));

// Mock logger to capture error messages
const mockError = vi.hoisted(() => vi.fn());
vi.mock("../logger.js", () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: mockError,
    child: vi.fn(),
  })),
  createStdioSink: vi.fn(),
}));

describe("phaseCommand design args guard", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockError.mockClear();
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as any);
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  test("design with positional args prints error and exits with code 1", async () => {
    const { phaseCommand } = await import("../commands/phase");

    await expect(
      phaseCommand("design", ["something"], {
        hitl: { timeout: 30, design: "", plan: "", implement: "", validate: "", release: "" },
        "file-permissions": { timeout: 60, "claude-settings": "" },
        github: { enabled: false },
        cli: {},
      }),
    ).rejects.toThrow("process.exit called");

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(mockError).toHaveBeenCalledWith(
      expect.stringContaining("topic argument was removed"),
    );
  });

  test("design with multiple positional args also rejects", async () => {
    const { phaseCommand } = await import("../commands/phase");

    await expect(
      phaseCommand("design", ["some", "topic"], {
        hitl: { timeout: 30, design: "", plan: "", implement: "", validate: "", release: "" },
        "file-permissions": { timeout: 60, "claude-settings": "" },
        github: { enabled: false },
        cli: {},
      }),
    ).rejects.toThrow("process.exit called");

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test("design with empty args does not exit early", async () => {
    // This test verifies the happy path doesn't trigger the guard.
    // It will still fail downstream (no real filesystem), but it should
    // NOT call process.exit(1) from the args guard.
    const { phaseCommand } = await import("../commands/phase");

    // The function will throw/exit for other reasons (mocked deps),
    // but it should NOT be the args guard that triggers it.
    try {
      await phaseCommand("design", [], {
        hitl: { timeout: 30, design: "", plan: "", implement: "", validate: "", release: "" },
        "file-permissions": { timeout: 60, "claude-settings": "" },
        github: { enabled: false },
        cli: {},
      });
    } catch {
      // Expected -- downstream mocks are incomplete
    }

    // The args guard specifically calls exit(1) with the topic-removed message.
    // If exit was called, it should NOT have been called with our specific message.
    const topicRemovedCalls = mockError.mock.calls.filter(
      (call: any[]) => typeof call[0] === "string" && call[0].includes("topic argument was removed"),
    );
    expect(topicRemovedCalls).toHaveLength(0);
  });
});
