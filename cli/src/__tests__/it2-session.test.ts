import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import { ITermSessionFactory } from "../it2-session";
import type { IIt2Client, It2Tab, It2Pane } from "../it2-client";
import type { SessionCreateOpts } from "../session";

const TEST_ROOT = resolve(import.meta.dir, "../../.test-it2-session");

/** Mock worktree creation — returns the expected path without running git. */
const mockCreateWorktree = async (slug: string, opts: { cwd: string }) => ({
  path: resolve(opts.cwd, ".claude", "worktrees", slug),
});

let sessionIdCounter = 0;

function createMockIt2Client(opts?: {
  tabs?: It2Tab[];
  listPanesFails?: Set<string>;
}): IIt2Client & {
  calls: Array<{ method: string; args: unknown[] }>;
  notifyArgs: Array<{ title: string; body: string }>;
} {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const notifyArgs: Array<{ title: string; body: string }> = [];
  const existingTabs = opts?.tabs ?? [];
  const listPanesFails = opts?.listPanesFails ?? new Set<string>();

  return {
    calls,
    notifyArgs,
    async ping() {
      calls.push({ method: "ping", args: [] });
      return true;
    },
    async listTabs() {
      calls.push({ method: "listTabs", args: [] });
      return existingTabs;
    },
    async createTab(name: string) {
      const id = `tab-${++sessionIdCounter}`;
      calls.push({ method: "createTab", args: [name] });
      return { id, name };
    },
    async closeTab(sessionId: string) {
      calls.push({ method: "closeTab", args: [sessionId] });
    },
    async splitPane(sessionId: string, _vertical?: boolean) {
      const id = `pane-${++sessionIdCounter}`;
      calls.push({ method: "splitPane", args: [sessionId] });
      return { id, tabId: sessionId };
    },
    async closePane(sessionId: string) {
      calls.push({ method: "closePane", args: [sessionId] });
    },
    async sendText(sessionId: string, text: string) {
      calls.push({ method: "sendText", args: [sessionId, text] });
    },
    async listPanes(tabSessionId: string) {
      calls.push({ method: "listPanes", args: [tabSessionId] });
      if (listPanesFails.has(tabSessionId)) {
        throw new Error("session not found");
      }
      return [{ id: tabSessionId, tabId: tabSessionId }] as It2Pane[];
    },
    async setPaneTitle(sessionId: string, title: string) {
      calls.push({ method: "setPaneTitle", args: [sessionId, title] });
    },
    async notify(title: string, body: string) {
      calls.push({ method: "notify", args: [title, body] });
      notifyArgs.push({ title, body });
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
  const filename = `2026-03-30-test.output.json`;
  writeFileSync(resolve(dir, filename), JSON.stringify(output));
}

/** Small delay to ensure file mtime > session start time. */
const tick = () => new Promise<void>((r) => setTimeout(r, 50));

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

  test("creates tab named bm-{epicSlug}", async () => {
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
    expect(createTab!.args[0]).toBe("bm-my-epic");
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

    // Ensure the stale file's mtime is strictly in the past
    await tick();

    const handle = await factory.create(makeOpts());

    // The stale file should be ignored, so the promise should timeout
    const result = await handle.promise;
    expect(result.success).toBe(false); // timeout => failure
  });

  test("notification on failure", async () => {
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

    expect(mockClient.notifyArgs).toHaveLength(1);
    expect(mockClient.notifyArgs[0].title).toContain("my-epic");
    expect(mockClient.notifyArgs[0].title).toContain("failed");
  });

  test("no notification on success", async () => {
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

    expect(mockClient.notifyArgs).toHaveLength(0);
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

    const closePane = mockClient.calls.filter(
      (c) => c.method === "closePane",
    );
    expect(closePane.length).toBeGreaterThanOrEqual(1);
  });

  test("cleanup closes tab", async () => {
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

    const closeTab = mockClient.calls.find((c) => c.method === "closeTab");
    expect(closeTab).toBeDefined();
    expect(closeTab!.args[0]).toBe("tab-1"); // The tab session ID
  });

  test("reconciliation adopts live sessions", async () => {
    const liveTabs: It2Tab[] = [{ id: "existing-tab-1", name: "bm-live-epic" }];
    mockClient = createMockIt2Client({ tabs: liveTabs });

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

    // Should NOT have closed the live tab during reconciliation
    const closeTabCalls = mockClient.calls.filter(
      (c) => c.method === "closeTab",
    );
    expect(closeTabCalls).toHaveLength(0);
  });

  test("reconciliation closes stale sessions", async () => {
    const staleTabs: It2Tab[] = [
      { id: "stale-tab-1", name: "bm-dead-epic" },
    ];
    mockClient = createMockIt2Client({
      tabs: staleTabs,
      listPanesFails: new Set(["stale-tab-1"]),
    });

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

    // Should have closed the stale tab
    const closeTabCalls = mockClient.calls.filter(
      (c) => c.method === "closeTab" && c.args[0] === "stale-tab-1",
    );
    expect(closeTabCalls).toHaveLength(1);
  });

  test("reconciliation is idempotent", async () => {
    mockClient = createMockIt2Client({
      tabs: [{ id: "tab-x", name: "bm-some-epic" }],
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

    // Second create should NOT call listTabs again
    const h2 = await factory.create(
      makeOpts({ epicSlug: "some-epic", phase: "validate" }),
    );
    await tick();
    writeOutputJson("some-epic", "validate", {
      status: "completed",
      artifacts: {},
    });
    await h2.promise;

    const listTabsCalls = mockClient.calls.filter(
      (c) => c.method === "listTabs",
    );
    expect(listTabsCalls).toHaveLength(1); // Only called once
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
});
