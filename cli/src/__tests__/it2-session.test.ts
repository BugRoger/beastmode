import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import { ITermSessionFactory } from "../dispatch/it2";
import type { IIt2Client, It2Session } from "../dispatch/it2";
import type { SessionCreateOpts } from "../dispatch/factory";

const TEST_ROOT = resolve(import.meta.dirname, "../../.test-it2-session");

/** Mock worktree creation — returns the expected path without running git. */
const mockCreateWorktree = async (slug: string, opts: { cwd: string }) => ({
  path: resolve(opts.cwd, ".claude", "worktrees", slug),
});

let sessionIdCounter = 0;

function createMockIt2Client(opts?: {
  sessions?: It2Session[];
}): IIt2Client & {
  calls: Array<{ method: string; args: unknown[] }>;
  badgeArgs: Array<{ sessionId: string; text: string }>;
} {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const badgeArgs: Array<{ sessionId: string; text: string }> = [];
  const existingSessions = opts?.sessions ?? [];

  return {
    calls,
    badgeArgs,
    async ping() {
      calls.push({ method: "ping", args: [] });
      return true;
    },
    async listSessions() {
      calls.push({ method: "listSessions", args: [] });
      return existingSessions;
    },
    async listTabs() {
      calls.push({ method: "listTabs", args: [] });
      return [];
    },
    async createTab() {
      const id = `tab-${++sessionIdCounter}`;
      calls.push({ method: "createTab", args: [] });
      return id;
    },
    async splitPane(sessionId: string) {
      const id = `pane-${++sessionIdCounter}`;
      calls.push({ method: "splitPane", args: [sessionId] });
      return id;
    },
    async closeSession(sessionId: string) {
      calls.push({ method: "closeSession", args: [sessionId] });
    },
    async sendText(sessionId: string, text: string) {
      calls.push({ method: "sendText", args: [sessionId, text] });
    },
    async setBadge(sessionId: string, text: string) {
      calls.push({ method: "setBadge", args: [sessionId, text] });
      badgeArgs.push({ sessionId, text });
    },
    async setTabTitle(sessionId: string, title: string) {
      calls.push({ method: "setTabTitle", args: [sessionId, title] });
    },
    async getSessionProperty(sessionId: string, property: string) {
      calls.push({ method: "getSessionProperty", args: [sessionId, property] });
      return "";
    },
  };
}

function makeOpts(overrides?: Partial<SessionCreateOpts>): SessionCreateOpts {
  return {
    epicSlug: "my-epic",
    phase: "plan",
    args: ["my-epic"],
    projectRoot: TEST_ROOT,
    signal: new AbortController().signal,
    ...overrides,
  };
}

/** Write an output.json artifact file for a given worktree slug and phase. */
function writeOutputJson(
  worktreeSlug: string,
  phase: string,
  output: { status: string; artifacts: Record<string, unknown> },
  outputSlug?: string,
): void {
  const dir = resolve(
    TEST_ROOT,
    ".claude",
    "worktrees",
    worktreeSlug,
    ".beastmode",
    "artifacts",
    phase,
  );
  mkdirSync(dir, { recursive: true });
  const slug = outputSlug ?? worktreeSlug;
  const filename = `2026-03-30-${slug}.output.json`;
  writeFileSync(resolve(dir, filename), JSON.stringify(output));
}

/** Small delay to ensure file mtime > session start time. */
const tick = () => new Promise<void>((r) => setTimeout(r, 5));

describe("ITermSessionFactory", () => {
  let mockClient: ReturnType<typeof createMockIt2Client>;

  beforeEach(() => {
    sessionIdCounter = 0;
    if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true });
    mkdirSync(TEST_ROOT, { recursive: true });
    mockClient = createMockIt2Client();
  });

  afterEach(() => {
    if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true });
  });

  test("creates tab and sets title to bm-{epicSlug}", async () => {
    const factory = new ITermSessionFactory(mockClient, {
      watchTimeoutMs: 2000,
      createWorktree: mockCreateWorktree,
    });

    const handle = await factory.create(makeOpts());
    await tick();
    writeOutputJson("my-epic", "plan", {
      status: "completed",
      artifacts: {},
    });
    await handle.promise;

    const createTab = mockClient.calls.find((c) => c.method === "createTab");
    expect(createTab).toBeDefined();

    const setTitle = mockClient.calls.find((c) => c.method === "setTabTitle");
    expect(setTitle).toBeDefined();
    expect(setTitle!.args[1]).toBe("bm-my-epic");
  });

  test("reuses existing tab for same epic", async () => {
    const factory = new ITermSessionFactory(mockClient, {
      watchTimeoutMs: 2000,
      createWorktree: mockCreateWorktree,
    });

    const h1 = await factory.create(makeOpts({ phase: "plan" }));
    await tick();
    writeOutputJson("my-epic", "plan", {
      status: "completed",
      artifacts: {},
    });
    await h1.promise;

    const h2 = await factory.create(makeOpts({ phase: "validate" }));
    await tick();
    writeOutputJson("my-epic", "validate", {
      status: "completed",
      artifacts: {},
    });
    await h2.promise;

    const createTabCalls = mockClient.calls.filter(
      (c) => c.method === "createTab",
    );
    expect(createTabCalls).toHaveLength(1); // Only created once
  });

  test("first phase uses tab session directly, second splits", async () => {
    const factory = new ITermSessionFactory(mockClient, {
      watchTimeoutMs: 2000,
      createWorktree: mockCreateWorktree,
    });

    // First phase — should NOT split
    const h1 = await factory.create(makeOpts({ phase: "plan" }));
    await tick();
    writeOutputJson("my-epic", "plan", {
      status: "completed",
      artifacts: {},
    });
    await h1.promise;

    const splitCallsAfterFirst = mockClient.calls.filter(
      (c) => c.method === "splitPane",
    );
    expect(splitCallsAfterFirst).toHaveLength(0);

    // Second phase — should split
    const h2 = await factory.create(makeOpts({ phase: "validate" }));
    await tick();
    writeOutputJson("my-epic", "validate", {
      status: "completed",
      artifacts: {},
    });
    await h2.promise;

    const splitCallsAfterSecond = mockClient.calls.filter(
      (c) => c.method === "splitPane",
    );
    expect(splitCallsAfterSecond).toHaveLength(1);
  });

  test("sends correct beastmode command", async () => {
    const factory = new ITermSessionFactory(mockClient, {
      watchTimeoutMs: 2000,
      createWorktree: mockCreateWorktree,
    });

    const handle = await factory.create(
      makeOpts({ phase: "plan", args: ["my-epic"] }),
    );
    await tick();
    writeOutputJson("my-epic", "plan", {
      status: "completed",
      artifacts: {},
    });
    await handle.promise;

    const sendText = mockClient.calls.find((c) => c.method === "sendText");
    expect(sendText).toBeDefined();
    const sentCommand = sendText!.args[1] as string;
    expect(sentCommand).toContain("cd ");
    expect(sentCommand).toContain("&& beastmode plan my-epic");
  });

  test("resolves when output.json appears", async () => {
    const factory = new ITermSessionFactory(mockClient, {
      watchTimeoutMs: 2000,
      createWorktree: mockCreateWorktree,
    });

    const handle = await factory.create(makeOpts());
    await tick();
    writeOutputJson("my-epic", "plan", {
      status: "completed",
      artifacts: { prd: "path/to/prd.md" },
    });
    const result = await handle.promise;

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  test("ignores stale output.json", async () => {
    const factory = new ITermSessionFactory(mockClient, {
      watchTimeoutMs: 1000,
      createWorktree: mockCreateWorktree,
    });
    // Pre-write a stale output.json BEFORE creating the session
    writeOutputJson("my-epic", "plan", {
      status: "completed",
      artifacts: {},
    });

    await tick();

    const handle = await factory.create(makeOpts());

    // The stale file should be ignored, so the promise should timeout
    const result = await handle.promise;
    expect(result.success).toBe(false); // timeout => failure
  });

  test("badge notification on failure", async () => {
    const factory = new ITermSessionFactory(mockClient, {
      watchTimeoutMs: 2000,
      createWorktree: mockCreateWorktree,
    });

    const handle = await factory.create(makeOpts());
    await tick();
    writeOutputJson("my-epic", "plan", {
      status: "error",
      artifacts: {},
    });
    await handle.promise;

    expect(mockClient.badgeArgs).toHaveLength(1);
    expect(mockClient.badgeArgs[0].text).toContain("ERROR");
    expect(mockClient.badgeArgs[0].text).toContain("failed");
  });

  test("no badge on success", async () => {
    const factory = new ITermSessionFactory(mockClient, {
      watchTimeoutMs: 2000,
      createWorktree: mockCreateWorktree,
    });

    const handle = await factory.create(makeOpts());
    await tick();
    writeOutputJson("my-epic", "plan", {
      status: "completed",
      artifacts: {},
    });
    await handle.promise;

    expect(mockClient.badgeArgs).toHaveLength(0);
  });

  test("closes pane after completion (split pane only)", async () => {
    const factory = new ITermSessionFactory(mockClient, {
      watchTimeoutMs: 2000,
      createWorktree: mockCreateWorktree,
    });

    // First phase uses tab directly — consume it
    const h1 = await factory.create(makeOpts({ phase: "plan" }));
    await tick();
    writeOutputJson("my-epic", "plan", {
      status: "completed",
      artifacts: {},
    });
    await h1.promise;

    // Second phase splits — this pane should be closed after completion
    const h2 = await factory.create(makeOpts({ phase: "validate" }));
    await tick();
    writeOutputJson("my-epic", "validate", {
      status: "completed",
      artifacts: {},
    });
    await h2.promise;

    const closeCalls = mockClient.calls.filter(
      (c) => c.method === "closeSession",
    );
    expect(closeCalls.length).toBeGreaterThanOrEqual(1);
  });

  test("cleanup closes tab session", async () => {
    const factory = new ITermSessionFactory(mockClient, {
      watchTimeoutMs: 2000,
      createWorktree: mockCreateWorktree,
    });

    const handle = await factory.create(makeOpts());
    await tick();
    writeOutputJson("my-epic", "plan", {
      status: "completed",
      artifacts: {},
    });
    await handle.promise;

    await factory.cleanup("my-epic");

    const closeCalls = mockClient.calls.filter(
      (c) => c.method === "closeSession" && c.args[0] === "tab-1",
    );
    expect(closeCalls).toHaveLength(1);
  });

  test("reconciliation adopts live sessions", async () => {
    const liveSessions: It2Session[] = [
      { id: "existing-tab-1", name: "bm-live-epic", tabId: "w0t1", isAlive: true },
    ];
    mockClient = createMockIt2Client({ sessions: liveSessions });

    const factory = new ITermSessionFactory(mockClient, {
      watchTimeoutMs: 2000,
      createWorktree: mockCreateWorktree,
    });

    // Trigger reconciliation by calling create for the same epic
    const handle = await factory.create(
      makeOpts({ epicSlug: "live-epic" }),
    );
    await tick();
    writeOutputJson("live-epic", "plan", {
      status: "completed",
      artifacts: {},
    });
    await handle.promise;

    // Should NOT have created a new tab — adopted the existing one
    const createTabCalls = mockClient.calls.filter(
      (c) => c.method === "createTab",
    );
    expect(createTabCalls).toHaveLength(0);

    // Should NOT have closed the live session during reconciliation
    const closeCalls = mockClient.calls.filter(
      (c) => c.method === "closeSession" && c.args[0] === "existing-tab-1",
    );
    expect(closeCalls).toHaveLength(0);
  });

  test("reconciliation closes stale sessions", async () => {
    const staleSessions: It2Session[] = [
      { id: "stale-tab-1", name: "bm-dead-epic", tabId: "w0t2", isAlive: false },
    ];
    mockClient = createMockIt2Client({ sessions: staleSessions });

    const factory = new ITermSessionFactory(mockClient, {
      watchTimeoutMs: 2000,
      createWorktree: mockCreateWorktree,
    });

    // Trigger reconciliation
    const handle = await factory.create(makeOpts());
    await tick();
    writeOutputJson("my-epic", "plan", {
      status: "completed",
      artifacts: {},
    });
    await handle.promise;

    // Should have closed the stale session
    const closeCalls = mockClient.calls.filter(
      (c) => c.method === "closeSession" && c.args[0] === "stale-tab-1",
    );
    expect(closeCalls).toHaveLength(1);
  });

  test("reconciliation is idempotent", async () => {
    mockClient = createMockIt2Client({
      sessions: [{ id: "tab-x", name: "bm-some-epic", tabId: "w0t3", isAlive: true }],
    });

    const factory = new ITermSessionFactory(mockClient, {
      watchTimeoutMs: 2000,
      createWorktree: mockCreateWorktree,
    });

    // First create triggers reconciliation
    const h1 = await factory.create(
      makeOpts({ epicSlug: "some-epic", phase: "plan" }),
    );
    await tick();
    writeOutputJson("some-epic", "plan", {
      status: "completed",
      artifacts: {},
    });
    await h1.promise;

    // Second create should NOT call listSessions again
    const h2 = await factory.create(
      makeOpts({ epicSlug: "some-epic", phase: "validate" }),
    );
    await tick();
    writeOutputJson("some-epic", "validate", {
      status: "completed",
      artifacts: {},
    });
    await h2.promise;

    const listCalls = mockClient.calls.filter(
      (c) => c.method === "listSessions",
    );
    expect(listCalls).toHaveLength(1); // Only called once
  });

  test("handle has correct worktreeSlug", async () => {
    const factory = new ITermSessionFactory(mockClient, {
      watchTimeoutMs: 2000,
      createWorktree: mockCreateWorktree,
    });

    const handle = await factory.create(makeOpts({ phase: "plan" }));
    expect(handle.worktreeSlug).toBe("my-epic");
    await tick();
    writeOutputJson("my-epic", "plan", {
      status: "completed",
      artifacts: {},
    });
    await handle.promise;
  });

  test("plan phase resolves via broad match when only per-feature outputs exist", async () => {
    const factory = new ITermSessionFactory(mockClient, {
      watchTimeoutMs: 500,
      createWorktree: mockCreateWorktree,
    });

    const handle = await factory.create(makeOpts({ phase: "plan", args: ["my-epic"] }));
    await tick();
    // Write per-feature output (does NOT match the strict suffix -my-epic.output.json)
    writeOutputJson("my-epic", "plan", { status: "completed", artifacts: { features: [] } }, "my-epic-feat-a");
    // Wait for timeout to trigger broad fallback
    const result = await handle.promise;

    expect(result.success).toBe(true);
  });

  test("implement fan-out does not resolve on different feature output", async () => {
    const factory = new ITermSessionFactory(mockClient, {
      watchTimeoutMs: 500,
      createWorktree: mockCreateWorktree,
    });

    const handle = await factory.create(makeOpts({
      phase: "implement",
      featureSlug: "feat-a",
      args: ["my-epic", "feat-a"],
    }));
    await tick();
    // Write output for a DIFFERENT feature — should NOT resolve the feat-a session
    writeOutputJson("my-epic", "implement", { status: "completed", artifacts: {} }, "my-epic-feat-b");
    const result = await handle.promise;

    // Should timeout (broad match finds feat-b which matches epic, so it resolves as success)
    // The broad match is intentional — it prevents false "failed" on timeout
    expect(result.success).toBe(true);
  });

  test("reconciliation closes live session when manifest phase is done", async () => {
    const liveSessions: It2Session[] = [
      { id: "orphan-tab-1", name: "bm-done-epic", tabId: "w0t10", isAlive: true },
    ];
    mockClient = createMockIt2Client({ sessions: liveSessions });

    // Write a "done" manifest for the epic
    const stateDir = resolve(TEST_ROOT, ".beastmode", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(
      resolve(stateDir, "2026-04-03-done-epic.manifest.json"),
      JSON.stringify({
        slug: "done-epic",
        phase: "done",
        features: [],
        artifacts: {},
        lastUpdated: new Date().toISOString(),
      }),
    );

    const factory = new ITermSessionFactory(mockClient, {
      watchTimeoutMs: 2000,
      createWorktree: mockCreateWorktree,
    });

    // Trigger reconciliation — create for a different epic to avoid tab reuse logic
    const handle = await factory.create(makeOpts({ epicSlug: "other-epic" }));
    await tick();
    writeOutputJson("other-epic", "plan", {
      status: "completed",
      artifacts: {},
    });
    await handle.promise;

    // Should have closed the orphan session
    const closeCalls = mockClient.calls.filter(
      (c) => c.method === "closeSession" && c.args[0] === "orphan-tab-1",
    );
    expect(closeCalls).toHaveLength(1);
  });

  test("reconciliation adopts live session when manifest phase is active", async () => {
    const liveSessions: It2Session[] = [
      { id: "active-tab-1", name: "bm-active-epic", tabId: "w0t11", isAlive: true },
    ];
    mockClient = createMockIt2Client({ sessions: liveSessions });

    // Write an "implement" (active) manifest for the epic
    const stateDir = resolve(TEST_ROOT, ".beastmode", "state");
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(
      resolve(stateDir, "2026-04-03-active-epic.manifest.json"),
      JSON.stringify({
        slug: "active-epic",
        phase: "implement",
        features: [],
        artifacts: {},
        lastUpdated: new Date().toISOString(),
      }),
    );

    const factory = new ITermSessionFactory(mockClient, {
      watchTimeoutMs: 2000,
      createWorktree: mockCreateWorktree,
    });

    // Trigger reconciliation — create for the same epic
    const handle = await factory.create(
      makeOpts({ epicSlug: "active-epic" }),
    );
    await tick();
    writeOutputJson("active-epic", "plan", {
      status: "completed",
      artifacts: {},
    });
    await handle.promise;

    // Should NOT have closed the session — should have adopted it
    const closeCalls = mockClient.calls.filter(
      (c) => c.method === "closeSession" && c.args[0] === "active-tab-1",
    );
    expect(closeCalls).toHaveLength(0);

    // Should NOT have created a new tab — reused the adopted one
    const createTabCalls = mockClient.calls.filter(
      (c) => c.method === "createTab",
    );
    expect(createTabCalls).toHaveLength(0);
  });

  test("reconciliation adopts live session when manifest is missing", async () => {
    const liveSessions: It2Session[] = [
      { id: "nomanifest-tab-1", name: "bm-unknown-epic", tabId: "w0t12", isAlive: true },
    ];
    mockClient = createMockIt2Client({ sessions: liveSessions });

    // No manifest written — store.load() will return undefined

    const factory = new ITermSessionFactory(mockClient, {
      watchTimeoutMs: 2000,
      createWorktree: mockCreateWorktree,
    });

    // Trigger reconciliation
    const handle = await factory.create(
      makeOpts({ epicSlug: "unknown-epic" }),
    );
    await tick();
    writeOutputJson("unknown-epic", "plan", {
      status: "completed",
      artifacts: {},
    });
    await handle.promise;

    // Should NOT have closed the session — missing manifest defaults to adoption
    const closeCalls = mockClient.calls.filter(
      (c) => c.method === "closeSession" && c.args[0] === "nomanifest-tab-1",
    );
    expect(closeCalls).toHaveLength(0);

    // Should NOT have created a new tab — reused the adopted one
    const createTabCalls = mockClient.calls.filter(
      (c) => c.method === "createTab",
    );
    expect(createTabCalls).toHaveLength(0);
  });
});
