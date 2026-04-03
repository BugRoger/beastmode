import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import { CmuxSessionFactory } from "../dispatch/cmux";
import type { ICmuxClient } from "../dispatch/cmux";
import type { SessionCreateOpts } from "../dispatch/factory";

const TEST_ROOT = resolve(import.meta.dir, "../../.test-cmux-session");

/** Mock worktree creation — returns the expected path without running git. */
const mockCreateWorktree = async (slug: string, opts: { cwd: string }) => ({
  path: resolve(opts.cwd, ".claude", "worktrees", slug),
});

// Mock CmuxClient — tracks all calls for assertions
function createMockClient(): ICmuxClient & {
  calls: Array<{ method: string; args: unknown[] }>;
  notifyArgs: Array<{ title: string; body: string }>;
} {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const notifyArgs: Array<{ title: string; body: string }> = [];

  return {
    calls,
    notifyArgs,
    async ping() { calls.push({ method: "ping", args: [] }); return true; },
    async createWorkspace(name: string) {
      calls.push({ method: "createWorkspace", args: [name] });
      return { name, surfaces: [] };
    },
    async listWorkspaces() {
      calls.push({ method: "listWorkspaces", args: [] });
      return [];
    },
    async closeWorkspace(name: string) {
      calls.push({ method: "closeWorkspace", args: [name] });
    },
    async createSurface(workspace: string, name: string) {
      calls.push({ method: "createSurface", args: [workspace, name] });
      return { name, workspace };
    },
    async sendText(workspace: string, surface: string, text: string) {
      calls.push({ method: "sendText", args: [workspace, surface, text] });
    },
    async closeSurface(workspace: string, surface: string) {
      calls.push({ method: "closeSurface", args: [workspace, surface] });
    },
    async getSurface(workspace: string, surface: string) {
      calls.push({ method: "getSurface", args: [workspace, surface] });
      return { name: surface, workspace };
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

/** Write an output.json artifact file for a given worktree slug and phase.
 *  The slug should be the epic slug for single phases, or epic-feature for fan-out.
 */
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
  const filename = `2026-03-29-${slug}.output.json`;
  writeFileSync(resolve(dir, filename), JSON.stringify(output));
}

/** Small delay to ensure file mtime > session start time. */
const tick = () => new Promise<void>((r) => setTimeout(r, 5));

describe("CmuxSessionFactory", () => {
  let mockClient: ReturnType<typeof createMockClient>;

  beforeEach(() => {
    if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true });
    mkdirSync(TEST_ROOT, { recursive: true });
    mockClient = createMockClient();
  });

  afterEach(() => {
    if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true });
  });

  test("creates workspace named bm-{epicSlug}", async () => {
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 2000, createWorktree: mockCreateWorktree });

    const handle = await factory.create(makeOpts());
    await tick();
    writeOutputJson("my-epic", "plan", { status: "completed", artifacts: {} });
    await handle.promise;

    const createWs = mockClient.calls.find(c => c.method === "createWorkspace");
    expect(createWs).toBeDefined();
    expect(createWs!.args[0]).toBe("bm-my-epic");
  });

  test("reuses existing workspace for same epic", async () => {
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 2000, createWorktree: mockCreateWorktree });

    const h1 = await factory.create(makeOpts({ phase: "plan" }));
    await tick();
    writeOutputJson("my-epic", "plan", { status: "completed", artifacts: {} });
    await h1.promise;

    const h2 = await factory.create(makeOpts({ phase: "validate" }));
    await tick();
    writeOutputJson("my-epic", "validate", { status: "completed", artifacts: {} });
    await h2.promise;

    const createWsCalls = mockClient.calls.filter(c => c.method === "createWorkspace");
    expect(createWsCalls).toHaveLength(1); // Only created once
  });

  test("creates surface named {phase} for single phases", async () => {
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 2000, createWorktree: mockCreateWorktree });

    const handle = await factory.create(makeOpts({ phase: "plan" }));
    await tick();
    writeOutputJson("my-epic", "plan", { status: "completed", artifacts: {} });
    await handle.promise;

    const createSurf = mockClient.calls.find(c => c.method === "createSurface");
    expect(createSurf).toBeDefined();
    expect(createSurf!.args).toEqual(["bm-my-epic", "plan"]);
  });

  test("creates surface named {phase}-{featureSlug} for fan-out", async () => {
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 2000, createWorktree: mockCreateWorktree });

    const handle = await factory.create(makeOpts({
      phase: "implement",
      featureSlug: "feat-a",
      args: ["my-epic", "feat-a"],
    }));
    await tick();
    writeOutputJson("my-epic", "implement", { status: "completed", artifacts: {} }, "my-epic-feat-a");
    await handle.promise;

    const createSurf = mockClient.calls.find(c => c.method === "createSurface");
    expect(createSurf!.args).toEqual(["bm-my-epic", "implement-feat-a"]);
  });

  test("sends correct beastmode command to surface", async () => {
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 2000, createWorktree: mockCreateWorktree });

    const handle = await factory.create(makeOpts({ phase: "plan", args: ["my-epic"] }));
    await tick();
    writeOutputJson("my-epic", "plan", { status: "completed", artifacts: {} });
    await handle.promise;

    const sendText = mockClient.calls.find(c => c.method === "sendText");
    expect(sendText).toBeDefined();
    const sentCommand = sendText!.args[2] as string;
    expect(sentCommand).toContain("cd ");
    expect(sentCommand).toContain("&& beastmode plan my-epic");
  });

  test("resolves session when output.json file appears after dispatch", async () => {
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 2000, createWorktree: mockCreateWorktree });

    const handle = await factory.create(makeOpts());
    await tick();
    writeOutputJson("my-epic", "plan", { status: "completed", artifacts: { prd: "path/to/prd.md" } });
    const result = await handle.promise;

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  test("ignores stale output.json from previous runs", async () => {
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 1000, createWorktree: mockCreateWorktree });
    // Pre-write a stale output.json BEFORE creating the session
    writeOutputJson("my-epic", "plan", { status: "completed", artifacts: {} });

    // Ensure the stale file's mtime is strictly in the past
    await tick();

    const handle = await factory.create(makeOpts());

    // The stale file should be ignored, so the promise should timeout
    const result = await handle.promise;
    expect(result.success).toBe(false); // timeout => failure
  });

  test("resolves with failure when output.json indicates error status", async () => {
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 2000, createWorktree: mockCreateWorktree });

    const handle = await factory.create(makeOpts());
    await tick();
    writeOutputJson("my-epic", "plan", { status: "error", artifacts: {} });
    const result = await handle.promise;

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  test("fires notification on failure", async () => {
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 2000, createWorktree: mockCreateWorktree });

    const handle = await factory.create(makeOpts());
    await tick();
    writeOutputJson("my-epic", "plan", { status: "error", artifacts: {} });
    await handle.promise;

    expect(mockClient.notifyArgs).toHaveLength(1);
    expect(mockClient.notifyArgs[0].title).toContain("my-epic");
    expect(mockClient.notifyArgs[0].title).toContain("failed");
  });

  test("does not fire notification on success", async () => {
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 2000, createWorktree: mockCreateWorktree });

    const handle = await factory.create(makeOpts());
    await tick();
    writeOutputJson("my-epic", "plan", { status: "completed", artifacts: {} });
    await handle.promise;

    expect(mockClient.notifyArgs).toHaveLength(0);
  });

  test("closes surface after session completes", async () => {
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 2000, createWorktree: mockCreateWorktree });

    const handle = await factory.create(makeOpts({ phase: "plan" }));
    await tick();
    writeOutputJson("my-epic", "plan", { status: "completed", artifacts: {} });
    await handle.promise;

    const closeSurf = mockClient.calls.filter(c => c.method === "closeSurface");
    expect(closeSurf.length).toBeGreaterThanOrEqual(1);
    expect(closeSurf[0].args).toEqual(["bm-my-epic", "plan"]);
  });

  test("cleanup closes workspace for epic", async () => {
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 2000, createWorktree: mockCreateWorktree });

    const handle = await factory.create(makeOpts());
    await tick();
    writeOutputJson("my-epic", "plan", { status: "completed", artifacts: {} });
    await handle.promise;

    await factory.cleanup("my-epic");

    const closeWs = mockClient.calls.find(c => c.method === "closeWorkspace");
    expect(closeWs).toBeDefined();
    expect(closeWs!.args[0]).toBe("bm-my-epic");
  });

  test("handle has correct worktreeSlug for single phase", async () => {
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 2000, createWorktree: mockCreateWorktree });

    const handle = await factory.create(makeOpts({ phase: "plan" }));
    expect(handle.worktreeSlug).toBe("my-epic");
    await tick();
    writeOutputJson("my-epic", "plan", { status: "completed", artifacts: {} });
    await handle.promise;
  });

  test("handle has correct worktreeSlug for feature fan-out", async () => {
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 2000, createWorktree: mockCreateWorktree });

    const handle = await factory.create(makeOpts({
      phase: "implement",
      featureSlug: "feat-a",
      args: ["my-epic", "feat-a"],
    }));
    expect(handle.worktreeSlug).toBe("my-epic");
    await tick();
    writeOutputJson("my-epic", "implement", { status: "completed", artifacts: {} }, "my-epic-feat-a");
    await handle.promise;
  });

  test("plan phase resolves via broad match when only per-feature outputs exist", async () => {
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 500, createWorktree: mockCreateWorktree });

    const handle = await factory.create(makeOpts({ phase: "plan", args: ["my-epic"] }));
    await tick();
    // Write per-feature output (does NOT match the strict suffix -my-epic.output.json)
    writeOutputJson("my-epic", "plan", { status: "completed", artifacts: { features: [] } }, "my-epic-feat-a");
    // Wait for timeout to trigger broad fallback
    const result = await handle.promise;

    expect(result.success).toBe(true);
  });
});
