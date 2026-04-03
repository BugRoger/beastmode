import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { reconcileStartup, parseSurfaceTitle } from "../reconcile-startup.js";
import type { ReconcileResult as _ReconcileResult } from "../reconcile-startup.js";
import type { CmuxClientLike, CmuxWorkspace } from "../cmux-types.js";
import { DispatchTracker } from "../dispatch-tracker.js";

const TEST_ROOT = resolve(import.meta.dir, "../../.test-reconcile-tmp");

function setupTestRoot(): void {
  rmSync(TEST_ROOT, { recursive: true, force: true });
  mkdirSync(resolve(TEST_ROOT, ".claude/worktrees"), { recursive: true });
  mkdirSync(resolve(TEST_ROOT, ".beastmode"), { recursive: true });
}

function teardownTestRoot(): void {
  rmSync(TEST_ROOT, { recursive: true, force: true });
}

/** Abort all sessions and suppress the AbortError rejections on their promises. */
function safeAbortAll(tracker: DispatchTracker): void {
  for (const session of tracker.getAll()) {
    session.promise.catch(() => {}); // swallow AbortError
  }
  tracker.abortAll();
}

function mockClient(overrides: Partial<CmuxClientLike> = {}): CmuxClientLike {
  return {
    listWorkspaces: async () => [],
    closeSurface: async () => {},
    closeWorkspace: async () => {},
    ...overrides,
  };
}

// --- parseSurfaceTitle tests ---

describe("parseSurfaceTitle", () => {
  it("parses single phase command", () => {
    const result = parseSurfaceTitle("beastmode plan my-epic");
    expect(result).toEqual({ phase: "plan", epicSlug: "my-epic" });
  });

  it("parses implement with feature slug", () => {
    const result = parseSurfaceTitle("beastmode implement my-epic feat-a");
    expect(result).toEqual({
      phase: "implement",
      epicSlug: "my-epic",
      featureSlug: "feat-a",
    });
  });

  it("returns null for non-beastmode title", () => {
    expect(parseSurfaceTitle("vim editor")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseSurfaceTitle("")).toBeNull();
  });

  it("parses validate phase", () => {
    const result = parseSurfaceTitle("beastmode validate my-epic");
    expect(result).toEqual({ phase: "validate", epicSlug: "my-epic" });
  });

  it("parses release phase", () => {
    const result = parseSurfaceTitle("beastmode release my-epic");
    expect(result).toEqual({ phase: "release", epicSlug: "my-epic" });
  });
});

// --- reconcileStartup tests ---

describe("reconcileStartup", () => {
  beforeEach(setupTestRoot);
  afterEach(teardownTestRoot);

  it("adopts live surfaces matching known epics", async () => {
    const tracker = new DispatchTracker();
    const workspaces: CmuxWorkspace[] = [
      {
        id: "ws-1",
        name: "my-epic",
        surfaces: [
          { id: "s-1", title: "beastmode plan my-epic", alive: true, pid: 12345 },
        ],
      },
    ];

    // Create worktree directory for the adopted surface
    mkdirSync(resolve(TEST_ROOT, ".claude/worktrees/my-epic"), { recursive: true });

    const client = mockClient({
      listWorkspaces: async () => workspaces,
    });

    const result = await reconcileStartup({
      client,
      tracker,
      knownEpicSlugs: ["my-epic"],
      projectRoot: TEST_ROOT,
    });

    expect(result.adopted).toBe(1);
    expect(tracker.hasActiveSession("my-epic")).toBe(true);
    expect(tracker.hasPhaseSession("my-epic", "plan")).toBe(true);

    // Cleanup: abort the adopted session's watcher
    safeAbortAll(tracker);
  });

  it("closes dead surfaces", async () => {
    const closedSurfaces: string[] = [];
    const tracker = new DispatchTracker();

    const workspaces: CmuxWorkspace[] = [
      {
        id: "ws-1",
        name: "my-epic",
        surfaces: [
          { id: "s-dead", title: "beastmode plan my-epic", alive: false },
        ],
      },
    ];

    const client = mockClient({
      listWorkspaces: async () => workspaces,
      closeSurface: async (id) => { closedSurfaces.push(id); },
    });

    const result = await reconcileStartup({
      client,
      tracker,
      knownEpicSlugs: ["my-epic"],
      projectRoot: TEST_ROOT,
    });

    expect(result.closedSurfaces).toBe(1);
    expect(closedSurfaces).toEqual(["s-dead"]);
    expect(tracker.size).toBe(0);
  });

  it("removes empty workspaces after cleanup", async () => {
    const closedWorkspaces: string[] = [];
    const tracker = new DispatchTracker();

    const workspaces: CmuxWorkspace[] = [
      {
        id: "ws-1",
        name: "my-epic",
        surfaces: [
          { id: "s-dead-1", title: "beastmode plan my-epic", alive: false },
          { id: "s-dead-2", title: "beastmode implement my-epic feat-a", alive: false },
        ],
      },
    ];

    const client = mockClient({
      listWorkspaces: async () => workspaces,
      closeSurface: async () => {},
      closeWorkspace: async (id) => { closedWorkspaces.push(id); },
    });

    const result = await reconcileStartup({
      client,
      tracker,
      knownEpicSlugs: ["my-epic"],
      projectRoot: TEST_ROOT,
    });

    expect(result.closedSurfaces).toBe(2);
    expect(result.closedWorkspaces).toBe(1);
    expect(closedWorkspaces).toEqual(["ws-1"]);
  });

  it("leaves non-matching workspaces untouched", async () => {
    const closedSurfaces: string[] = [];
    const closedWorkspaces: string[] = [];
    const tracker = new DispatchTracker();

    const workspaces: CmuxWorkspace[] = [
      {
        id: "ws-personal",
        name: "personal-stuff",
        surfaces: [
          { id: "s-1", title: "vim", alive: true },
        ],
      },
    ];

    const client = mockClient({
      listWorkspaces: async () => workspaces,
      closeSurface: async (id) => { closedSurfaces.push(id); },
      closeWorkspace: async (id) => { closedWorkspaces.push(id); },
    });

    const result = await reconcileStartup({
      client,
      tracker,
      knownEpicSlugs: ["my-epic"],
      projectRoot: TEST_ROOT,
    });

    expect(result.skipped).toBe(1);
    expect(result.adopted).toBe(0);
    expect(closedSurfaces).toHaveLength(0);
    expect(closedWorkspaces).toHaveLength(0);
  });

  it("handles empty workspace list", async () => {
    const tracker = new DispatchTracker();
    const client = mockClient({ listWorkspaces: async () => [] });

    const result = await reconcileStartup({
      client,
      tracker,
      knownEpicSlugs: ["my-epic"],
      projectRoot: TEST_ROOT,
    });

    expect(result.adopted).toBe(0);
    expect(result.closedSurfaces).toBe(0);
    expect(result.closedWorkspaces).toBe(0);
    expect(result.skipped).toBe(0);
  });

  it("handles no known epics", async () => {
    const tracker = new DispatchTracker();
    const workspaces: CmuxWorkspace[] = [
      {
        id: "ws-1",
        name: "my-epic",
        surfaces: [
          { id: "s-1", title: "beastmode plan my-epic", alive: true },
        ],
      },
    ];

    const client = mockClient({ listWorkspaces: async () => workspaces });

    const result = await reconcileStartup({
      client,
      tracker,
      knownEpicSlugs: [],
      projectRoot: TEST_ROOT,
    });

    expect(result.skipped).toBe(1);
    expect(tracker.size).toBe(0);
  });

  it("handles mixed live and dead surfaces in same workspace", async () => {
    const closedSurfaces: string[] = [];
    const closedWorkspaces: string[] = [];
    const tracker = new DispatchTracker();

    // Create worktree for the live surface
    mkdirSync(resolve(TEST_ROOT, ".claude/worktrees/my-epic"), { recursive: true });

    const workspaces: CmuxWorkspace[] = [
      {
        id: "ws-1",
        name: "my-epic",
        surfaces: [
          { id: "s-live", title: "beastmode plan my-epic", alive: true, pid: 111 },
          { id: "s-dead", title: "beastmode implement my-epic feat-a", alive: false },
        ],
      },
    ];

    const client = mockClient({
      listWorkspaces: async () => workspaces,
      closeSurface: async (id) => { closedSurfaces.push(id); },
      closeWorkspace: async (id) => { closedWorkspaces.push(id); },
    });

    const result = await reconcileStartup({
      client,
      tracker,
      knownEpicSlugs: ["my-epic"],
      projectRoot: TEST_ROOT,
    });

    expect(result.adopted).toBe(1);
    expect(result.closedSurfaces).toBe(1);
    expect(result.closedWorkspaces).toBe(0); // workspace still has live surface
    expect(closedSurfaces).toEqual(["s-dead"]);
    expect(closedWorkspaces).toHaveLength(0);
    expect(tracker.hasPhaseSession("my-epic", "plan")).toBe(true);

    safeAbortAll(tracker);
  });

  it("handles cmux unavailable gracefully", async () => {
    const tracker = new DispatchTracker();
    const client = mockClient({
      listWorkspaces: async () => { throw new Error("cmux not found"); },
    });

    const result = await reconcileStartup({
      client,
      tracker,
      knownEpicSlugs: ["my-epic"],
      projectRoot: TEST_ROOT,
    });

    expect(result.adopted).toBe(0);
    expect(result.closedSurfaces).toBe(0);
    expect(result.closedWorkspaces).toBe(0);
    expect(result.skipped).toBe(0);
  });

  it("sets correct session fields on adopted surface", async () => {
    const tracker = new DispatchTracker();

    mkdirSync(resolve(TEST_ROOT, ".claude/worktrees/my-epic-feat-a"), { recursive: true });

    const workspaces: CmuxWorkspace[] = [
      {
        id: "ws-1",
        name: "my-epic",
        surfaces: [
          { id: "s-feat", title: "beastmode implement my-epic feat-a", alive: true, pid: 999 },
        ],
      },
    ];

    const client = mockClient({ listWorkspaces: async () => workspaces });

    await reconcileStartup({
      client,
      tracker,
      knownEpicSlugs: ["my-epic"],
      projectRoot: TEST_ROOT,
    });

    expect(tracker.hasFeatureSession("my-epic", "feat-a")).toBe(true);
    expect(tracker.hasActiveSession("my-epic")).toBe(true);

    const sessions = tracker.getAll();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].epicSlug).toBe("my-epic");
    expect(sessions[0].phase).toBe("implement");
    expect(sessions[0].featureSlug).toBe("feat-a");
    expect(sessions[0].worktreeSlug).toBe("my-epic");
    expect(sessions[0].id).toStartWith("adopted-");

    safeAbortAll(tracker);
  });

  it("resolves adopted session when marker file is written", async () => {
    const tracker = new DispatchTracker();
    const worktreePath = resolve(TEST_ROOT, ".claude/worktrees/my-epic");
    mkdirSync(worktreePath, { recursive: true });

    const workspaces: CmuxWorkspace[] = [
      {
        id: "ws-1",
        name: "my-epic",
        surfaces: [
          { id: "s-1", title: "beastmode plan my-epic", alive: true, pid: 123 },
        ],
      },
    ];

    const client = mockClient({ listWorkspaces: async () => workspaces });

    await reconcileStartup({
      client,
      tracker,
      knownEpicSlugs: ["my-epic"],
      projectRoot: TEST_ROOT,
    });

    const sessions = tracker.getAll();
    expect(sessions).toHaveLength(1);

    // Give fs.watch time to initialize before writing the output
    await new Promise((r) => setTimeout(r, 200));

    // Write an output.json file — this should resolve the session promise
    const artifactDir = resolve(worktreePath, ".beastmode", "artifacts", "plan");
    mkdirSync(artifactDir, { recursive: true });
    writeFileSync(
      resolve(artifactDir, "2026-03-29-my-epic.output.json"),
      JSON.stringify({
        status: "completed",
        artifacts: { design: ".beastmode/artifacts/design/2026-03-29-my-epic.md" },
      }),
    );

    // Wait for fs.watch to pick it up
    const result = await Promise.race([
      sessions[0].promise,
      new Promise<"timeout">((r) => setTimeout(() => r("timeout"), 3000)),
    ]);

    expect(result).not.toBe("timeout");
    if (result !== "timeout") {
      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
    }

    safeAbortAll(tracker);
  });

  it("handles closeSurface failure gracefully", async () => {
    const tracker = new DispatchTracker();

    const workspaces: CmuxWorkspace[] = [
      {
        id: "ws-1",
        name: "my-epic",
        surfaces: [
          { id: "s-dead", title: "beastmode plan my-epic", alive: false },
        ],
      },
    ];

    const client = mockClient({
      listWorkspaces: async () => workspaces,
      closeSurface: async () => { throw new Error("connection refused"); },
    });

    // Should not throw
    const result = await reconcileStartup({
      client,
      tracker,
      knownEpicSlugs: ["my-epic"],
      projectRoot: TEST_ROOT,
    });

    // Surface wasn't counted as closed (failure)
    expect(result.closedSurfaces).toBe(0);
  });
});
