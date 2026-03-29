import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import { CmuxSessionFactory, type DispatchDoneMarker } from "../cmux-session";
import type { ICmuxClient } from "../cmux-client";
import type { SessionCreateOpts } from "../session";

const TEST_ROOT = resolve(import.meta.dir, "../../.test-cmux-session");

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

function writeMarker(worktreeSlug: string, marker: DispatchDoneMarker): void {
  const dir = resolve(TEST_ROOT, ".claude", "worktrees", worktreeSlug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, ".dispatch-done.json"), JSON.stringify(marker));
}

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
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 500 });
    // Pre-write marker so promise resolves immediately
    writeMarker("my-epic", { exitCode: 0, costUsd: 0.5, durationMs: 1000 });

    const handle = await factory.create(makeOpts());
    await handle.promise;

    const createWs = mockClient.calls.find(c => c.method === "createWorkspace");
    expect(createWs).toBeDefined();
    expect(createWs!.args[0]).toBe("bm-my-epic");
  });

  test("reuses existing workspace for same epic", async () => {
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 500 });
    writeMarker("my-epic", { exitCode: 0, costUsd: 0.5, durationMs: 1000 });

    await (await factory.create(makeOpts({ phase: "plan" }))).promise;
    // Write marker for second dispatch too
    writeMarker("my-epic", { exitCode: 0, costUsd: 0.5, durationMs: 1000 });
    await (await factory.create(makeOpts({ phase: "validate" }))).promise;

    const createWsCalls = mockClient.calls.filter(c => c.method === "createWorkspace");
    expect(createWsCalls).toHaveLength(1); // Only created once
  });

  test("creates surface named {phase} for single phases", async () => {
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 500 });
    writeMarker("my-epic", { exitCode: 0, costUsd: 0.5, durationMs: 1000 });

    await (await factory.create(makeOpts({ phase: "plan" }))).promise;

    const createSurf = mockClient.calls.find(c => c.method === "createSurface");
    expect(createSurf).toBeDefined();
    expect(createSurf!.args).toEqual(["bm-my-epic", "plan"]);
  });

  test("creates surface named {phase}-{featureSlug} for fan-out", async () => {
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 500 });
    writeMarker("my-epic-feat-a", { exitCode: 0, costUsd: 0.5, durationMs: 1000 });

    await (await factory.create(makeOpts({
      phase: "implement",
      featureSlug: "feat-a",
      args: ["my-epic", "feat-a"],
    }))).promise;

    const createSurf = mockClient.calls.find(c => c.method === "createSurface");
    expect(createSurf!.args).toEqual(["bm-my-epic", "implement-feat-a"]);
  });

  test("sends correct beastmode command to surface", async () => {
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 500 });
    writeMarker("my-epic", { exitCode: 0, costUsd: 0.5, durationMs: 1000 });

    await (await factory.create(makeOpts({ phase: "plan", args: ["my-epic"] }))).promise;

    const sendText = mockClient.calls.find(c => c.method === "sendText");
    expect(sendText).toBeDefined();
    expect(sendText!.args[2]).toBe("beastmode plan my-epic");
  });

  test("resolves session when marker file exists", async () => {
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 2000 });
    writeMarker("my-epic", { exitCode: 0, costUsd: 1.23, durationMs: 5000 });

    const handle = await factory.create(makeOpts());
    const result = await handle.promise;

    expect(result.success).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.costUsd).toBe(1.23);
    expect(result.durationMs).toBe(5000);
  });

  test("resolves with failure when marker indicates non-zero exit", async () => {
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 2000 });
    writeMarker("my-epic", { exitCode: 1, costUsd: 0.5, durationMs: 3000, error: "phase failed" });

    const handle = await factory.create(makeOpts());
    const result = await handle.promise;

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  test("fires notification on failure", async () => {
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 2000 });
    writeMarker("my-epic", { exitCode: 1, costUsd: 0, durationMs: 1000 });

    const handle = await factory.create(makeOpts());
    await handle.promise;

    expect(mockClient.notifyArgs).toHaveLength(1);
    expect(mockClient.notifyArgs[0].title).toContain("my-epic");
    expect(mockClient.notifyArgs[0].title).toContain("failed");
  });

  test("does not fire notification on success", async () => {
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 2000 });
    writeMarker("my-epic", { exitCode: 0, costUsd: 0.5, durationMs: 1000 });

    const handle = await factory.create(makeOpts());
    await handle.promise;

    expect(mockClient.notifyArgs).toHaveLength(0);
  });

  test("closes surface after session completes", async () => {
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 2000 });
    writeMarker("my-epic", { exitCode: 0, costUsd: 0.5, durationMs: 1000 });

    const handle = await factory.create(makeOpts({ phase: "plan" }));
    await handle.promise;

    const closeSurf = mockClient.calls.filter(c => c.method === "closeSurface");
    expect(closeSurf.length).toBeGreaterThanOrEqual(1);
    expect(closeSurf[0].args).toEqual(["bm-my-epic", "plan"]);
  });

  test("cleanup closes workspace for epic", async () => {
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 500 });
    writeMarker("my-epic", { exitCode: 0, costUsd: 0, durationMs: 100 });

    // Create a session first to register the workspace
    await (await factory.create(makeOpts())).promise;

    await factory.cleanup("my-epic");

    const closeWs = mockClient.calls.find(c => c.method === "closeWorkspace");
    expect(closeWs).toBeDefined();
    expect(closeWs!.args[0]).toBe("bm-my-epic");
  });

  test("handle has correct worktreeSlug for single phase", async () => {
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 500 });
    writeMarker("my-epic", { exitCode: 0, costUsd: 0, durationMs: 100 });

    const handle = await factory.create(makeOpts({ phase: "plan" }));
    expect(handle.worktreeSlug).toBe("my-epic");
    await handle.promise;
  });

  test("handle has correct worktreeSlug for feature fan-out", async () => {
    const factory = new CmuxSessionFactory(mockClient, { watchTimeoutMs: 500 });
    writeMarker("my-epic-feat-a", { exitCode: 0, costUsd: 0, durationMs: 100 });

    const handle = await factory.create(makeOpts({
      phase: "implement",
      featureSlug: "feat-a",
      args: ["my-epic", "feat-a"],
    }));
    expect(handle.worktreeSlug).toBe("my-epic-feat-a");
    await handle.promise;
  });
});
