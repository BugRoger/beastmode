import { describe, it, expect, beforeEach, mock } from "bun:test";

// ---------- module-level mocks (must precede imports) ----------

const mockWorktreeCreate = mock(async (slug: string) => ({
  slug,
  path: `/tmp/test-project/.claude/worktrees/${slug}`,
  branch: `feature/${slug}`,
}));
const mockRebase = mock(async (_phase: string, _opts?: any) => ({
  outcome: "success" as const,
  message: "rebased onto main",
}));

mock.module("../git/worktree.js", () => ({
  create: mockWorktreeCreate,
  rebase: mockRebase,
}));

const mockCleanHitlSettings = mock((_dir: string) => {});
const mockWriteHitlSettings = mock((_opts: any) => {});
const mockBuildPreToolUseHook = mock(() => ({ matcher: "AskUserQuestion", hooks: [] }));
const mockGetPhaseHitlProse = mock(() => "test prose");

mock.module("../hooks/hitl-settings.js", () => ({
  cleanHitlSettings: mockCleanHitlSettings,
  writeHitlSettings: mockWriteHitlSettings,
  buildPreToolUseHook: mockBuildPreToolUseHook,
  getPhaseHitlProse: mockGetPhaseHitlProse,
}));

const mockLoadConfig = mock((_root: string) => ({
  hitl: {
    timeout: 30,
    design: "defer design",
    plan: "defer plan",
    implement: "defer implement",
    validate: "defer validate",
    release: "defer release",
  },
  "file-permissions": {
    timeout: 30,
    "claude-settings": "defer to human on claude settings",
  },
  github: { enabled: false },
  cli: {},
}));
const mockGetCategoryProse = mock(() => "defer to human");

mock.module("../config.js", () => ({
  loadConfig: mockLoadConfig,
  getCategoryProse: mockGetCategoryProse,
}));

const mockCleanFilePermissionSettings = mock((_dir: string) => {});
const mockWriteFilePermissionSettings = mock((_opts: any) => {});
const mockBuildFilePermissionPreToolUseHooks = mock(() => []);
const mockBuildFilePermissionPostToolUseHooks = mock(() => []);

mock.module("../hooks/file-permission-settings.js", () => ({
  cleanFilePermissionSettings: mockCleanFilePermissionSettings,
  writeFilePermissionSettings: mockWriteFilePermissionSettings,
  buildFilePermissionPreToolUseHooks: mockBuildFilePermissionPreToolUseHooks,
  buildFilePermissionPostToolUseHooks: mockBuildFilePermissionPostToolUseHooks,
}));

// Mock the SDK import to throw — forces CLI fallback path
mock.module("@anthropic-ai/claude-agent-sdk", () => {
  throw new Error("SDK not available");
});

// ---------- import after mocks ----------

import { dispatchPhase } from "../commands/watch.js";

// ---------- helpers ----------

function resetMocks() {
  mockWorktreeCreate.mockClear();
  mockRebase.mockClear();
  mockCleanHitlSettings.mockClear();
  mockWriteHitlSettings.mockClear();
  mockBuildPreToolUseHook.mockClear();
  mockGetPhaseHitlProse.mockClear();
  mockLoadConfig.mockClear();
}

// ---------- tests ----------

describe("dispatchPhase — rebase and HITL", () => {
  beforeEach(resetMocks);

  it("calls rebase with phase and worktree path after worktree creation", async () => {
    const ac = new AbortController();
    const handle = await dispatchPhase({
      epicSlug: "my-epic",
      phase: "plan",
      args: ["my-epic"],
      projectRoot: "/tmp/test-project",
      signal: ac.signal,
    });

    // rebase should have been called before the promise resolves
    expect(mockRebase).toHaveBeenCalledTimes(1);
    expect(mockRebase).toHaveBeenCalledWith("plan", {
      cwd: "/tmp/test-project/.claude/worktrees/my-epic",
    });

    // Clean up: abort and await to prevent unhandled rejections
    ac.abort();
    try { await handle.promise; } catch {}
  });

  it("calls the full HITL sequence with correct arguments", async () => {
    const ac = new AbortController();
    const handle = await dispatchPhase({
      epicSlug: "my-epic",
      phase: "implement",
      args: ["my-epic", "feat-a"],
      projectRoot: "/tmp/test-project",
      signal: ac.signal,
    });

    // loadConfig called to get HITL config
    expect(mockLoadConfig).toHaveBeenCalledTimes(1);
    expect(mockLoadConfig).toHaveBeenCalledWith("/tmp/test-project");

    // cleanHitlSettings called with worktree .claude dir
    expect(mockCleanHitlSettings).toHaveBeenCalledTimes(1);
    expect(mockCleanHitlSettings).toHaveBeenCalledWith(
      "/tmp/test-project/.claude/worktrees/my-epic/.claude",
    );

    // getPhaseHitlProse called with hitl config and phase
    expect(mockGetPhaseHitlProse).toHaveBeenCalledTimes(1);

    // buildPreToolUseHook called with prose and timeout
    expect(mockBuildPreToolUseHook).toHaveBeenCalledTimes(1);
    expect(mockBuildPreToolUseHook).toHaveBeenCalledWith("test prose", 30);

    // writeHitlSettings called with claudeDir, hook, and phase
    expect(mockWriteHitlSettings).toHaveBeenCalledTimes(1);
    const writeArgs = mockWriteHitlSettings.mock.calls[0][0];
    expect(writeArgs.claudeDir).toBe(
      "/tmp/test-project/.claude/worktrees/my-epic/.claude",
    );
    expect(writeArgs.phase).toBe("implement");

    ac.abort();
    try { await handle.promise; } catch {}
  });

  it("calls rebase before HITL settings (ordering)", async () => {
    const callOrder: string[] = [];
    mockRebase.mockImplementation(async () => {
      callOrder.push("rebase");
      return { outcome: "success" as const, message: "ok" };
    });
    mockCleanHitlSettings.mockImplementation(() => {
      callOrder.push("cleanHitl");
    });

    const ac = new AbortController();
    const handle = await dispatchPhase({
      epicSlug: "my-epic",
      phase: "plan",
      args: ["my-epic"],
      projectRoot: "/tmp/test-project",
      signal: ac.signal,
    });

    expect(callOrder).toEqual(["rebase", "cleanHitl"]);

    ac.abort();
    try { await handle.promise; } catch {}
  });

  it("returns failed session result with dispatchError when SDK import fails (no CLI fallback)", async () => {
    const ac = new AbortController();
    const handle = await dispatchPhase({
      epicSlug: "my-epic",
      phase: "plan",
      args: ["my-epic"],
      projectRoot: "/tmp/test-project",
      signal: ac.signal,
    });

    // With CLI fallback removed, SDK failure should produce a failed session result
    const result = await handle.promise;
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.dispatchError).toBeDefined();
    expect(result.dispatchError).toContain("SDK not available");
  });
});
