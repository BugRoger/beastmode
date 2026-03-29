import { describe, test, expect, beforeEach } from "bun:test";
import { CmuxSession } from "../cmux-session";
import type { ICmuxClient, CmuxWorkspace, CmuxSurface } from "../cmux-client";
import type { SessionResult } from "../watch-types";

// ---------------------------------------------------------------------------
// Call-tracking mock
// ---------------------------------------------------------------------------

interface MockCall {
  method: string;
  args: unknown[];
}

function createMockClient(): ICmuxClient & { calls: MockCall[] } {
  const calls: MockCall[] = [];

  function track(method: string) {
    return (...args: unknown[]) => {
      calls.push({ method, args });
    };
  }

  return {
    calls,
    ping: async () => {
      calls.push({ method: "ping", args: [] });
      return true;
    },
    createWorkspace: async (name: string): Promise<CmuxWorkspace> => {
      track("createWorkspace")(name);
      return { name, surfaces: [] };
    },
    listWorkspaces: async (): Promise<CmuxWorkspace[]> => {
      calls.push({ method: "listWorkspaces", args: [] });
      return [];
    },
    closeWorkspace: async (name: string): Promise<void> => {
      track("closeWorkspace")(name);
    },
    createSurface: async (
      workspace: string,
      name: string,
    ): Promise<CmuxSurface> => {
      track("createSurface")(workspace, name);
      return { name, workspace, alive: true };
    },
    sendText: async (
      workspace: string,
      surface: string,
      text: string,
    ): Promise<void> => {
      track("sendText")(workspace, surface, text);
    },
    closeSurface: async (
      workspace: string,
      surface: string,
    ): Promise<void> => {
      track("closeSurface")(workspace, surface);
    },
    getSurface: async (): Promise<CmuxSurface | null> => {
      calls.push({ method: "getSurface", args: [] });
      return null;
    },
    notify: async (title: string, body: string): Promise<void> => {
      track("notify")(title, body);
    },
  };
}

// ---------------------------------------------------------------------------
// Shared defaults
// ---------------------------------------------------------------------------

const BASE_OPTIONS = {
  epicSlug: "my-epic",
  phase: "implement",
  worktreeSlug: "wt-my-epic-implement",
  projectRoot: "/tmp/fake-project",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CmuxSession", () => {
  let client: ReturnType<typeof createMockClient>;
  let session: CmuxSession;

  beforeEach(() => {
    client = createMockClient();
    session = new CmuxSession(client);
  });

  // 1. Creates workspace per epic on first dispatch (idempotent)
  test("creates workspace with the epicSlug", async () => {
    await session.dispatch({ ...BASE_OPTIONS, client });

    const call = client.calls.find((c) => c.method === "createWorkspace");
    expect(call).toBeDefined();
    expect(call!.args[0]).toBe("my-epic");
  });

  // 2. Creates surface per phase/feature
  test("creates surface with correct workspace and surface name", async () => {
    await session.dispatch({
      ...BASE_OPTIONS,
      client,
      featureSlug: "auth-login",
    });

    const call = client.calls.find((c) => c.method === "createSurface");
    expect(call).toBeDefined();
    expect(call!.args[0]).toBe("my-epic");
    expect(call!.args[1]).toBe("implement-auth-login");
  });

  // 3. Surface naming: phase-only for single dispatch
  test("surface name equals phase when no featureSlug", async () => {
    const handle = await session.dispatch({ ...BASE_OPTIONS, client });

    expect(handle.surface).toBe("implement");

    const call = client.calls.find((c) => c.method === "createSurface");
    expect(call!.args[1]).toBe("implement");
  });

  // 4. Surface naming: phase-feature for fan-out
  test("surface name is phase-featureSlug for fan-out", async () => {
    const handle = await session.dispatch({
      ...BASE_OPTIONS,
      client,
      featureSlug: "dark-mode",
    });

    expect(handle.surface).toBe("implement-dark-mode");
  });

  // 5. Sends beastmode run command into surface
  test("sends beastmode run command without featureSlug", async () => {
    await session.dispatch({ ...BASE_OPTIONS, client, phase: "design" });

    const call = client.calls.find((c) => c.method === "sendText");
    expect(call).toBeDefined();
    expect(call!.args[0]).toBe("my-epic"); // workspace
    expect(call!.args[1]).toBe("design"); // surface
    expect(call!.args[2]).toBe("beastmode run design my-epic");
  });

  test("sends beastmode run command with featureSlug", async () => {
    await session.dispatch({
      ...BASE_OPTIONS,
      client,
      featureSlug: "auth-login",
    });

    const call = client.calls.find((c) => c.method === "sendText");
    expect(call).toBeDefined();
    expect(call!.args[2]).toBe("beastmode run implement my-epic auth-login");
  });

  // 6. Session promise resolves when complete() is called
  test("promise resolves when complete() is called with SessionResult", async () => {
    const handle = await session.dispatch({ ...BASE_OPTIONS, client });

    const result: SessionResult = {
      success: true,
      exitCode: 0,
      costUsd: 1.5,
      durationMs: 30000,
    };

    handle.complete(result);

    const resolved = await handle.promise;
    expect(resolved).toEqual(result);
  });

  // 7. Abort closes the cmux surface
  test("abort calls closeSurface on the correct workspace and surface", async () => {
    const handle = await session.dispatch({ ...BASE_OPTIONS, client });

    handle.abortController.abort();

    // Give the async abort handler a tick to run
    await new Promise((r) => setTimeout(r, 10));

    const call = client.calls.find((c) => c.method === "closeSurface");
    expect(call).toBeDefined();
    expect(call!.args[0]).toBe("my-epic");
    expect(call!.args[1]).toBe("implement");
  });

  // 8. Abort resolves promise with failure result
  test("abort resolves promise with success: false and exitCode: 130", async () => {
    const handle = await session.dispatch({ ...BASE_OPTIONS, client });

    handle.abortController.abort();

    const result = await handle.promise;
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(130);
    expect(result.costUsd).toBe(0);
    expect(typeof result.durationMs).toBe("number");
  });

  // 9. Cleanup closes workspace
  test("cleanup calls closeWorkspace with epicSlug", async () => {
    await session.cleanup("my-epic");

    const call = client.calls.find((c) => c.method === "closeWorkspace");
    expect(call).toBeDefined();
    expect(call!.args[0]).toBe("my-epic");
  });

  // 10. Cleanup is best-effort (does not throw)
  test("cleanup does not throw when closeWorkspace fails", async () => {
    const failingClient = createMockClient();
    failingClient.closeWorkspace = async () => {
      throw new Error("workspace already gone");
    };
    const failSession = new CmuxSession(failingClient);

    // Should not throw
    await failSession.cleanup("my-epic");
  });

  // 11. Session handle has correct metadata
  test("handle exposes correct metadata", async () => {
    const handle = await session.dispatch({
      ...BASE_OPTIONS,
      client,
      featureSlug: "auth-login",
    });

    expect(handle.id).toMatch(/^cmux-wt-my-epic-implement-/);
    expect(handle.epicSlug).toBe("my-epic");
    expect(handle.phase).toBe("implement");
    expect(handle.featureSlug).toBe("auth-login");
    expect(handle.worktreeSlug).toBe("wt-my-epic-implement");
    expect(handle.workspace).toBe("my-epic");
    expect(handle.surface).toBe("implement-auth-login");
    expect(typeof handle.startedAt).toBe("number");
    expect(handle.abortController).toBeInstanceOf(AbortController);
    expect(typeof handle.complete).toBe("function");
    expect(handle.promise).toBeInstanceOf(Promise);
  });

  // Bonus: dispatch order — workspace before surface before sendText
  test("calls createWorkspace, createSurface, sendText in order", async () => {
    await session.dispatch({ ...BASE_OPTIONS, client });

    const methods = client.calls.map((c) => c.method);
    const wsIdx = methods.indexOf("createWorkspace");
    const surfIdx = methods.indexOf("createSurface");
    const sendIdx = methods.indexOf("sendText");

    expect(wsIdx).toBeLessThan(surfIdx);
    expect(surfIdx).toBeLessThan(sendIdx);
  });
});
