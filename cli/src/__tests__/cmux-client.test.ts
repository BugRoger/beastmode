import { describe, test, expect, spyOn } from "bun:test";
import {
  CmuxClient,
  CmuxError,
  CmuxConnectionError,
  CmuxProtocolError,
  cmuxAvailable,
  type SpawnFn,
} from "../cmux-client";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

/**
 * Build a fake spawn result matching the SpawnFn return type.
 * `new Response(stream).text()` works on ReadableStreams, matching exec().
 */
function mockProc(
  stdout: string,
  stderr: string,
  exitCode: number,
): ReturnType<SpawnFn> {
  return {
    stdout: new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode(stdout));
        c.close();
      },
    }),
    stderr: new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode(stderr));
        c.close();
      },
    }),
    exited: Promise.resolve(exitCode),
  };
}

/** Create a mock SpawnFn that records calls and returns a fixed result. */
function createMockSpawn(proc: ReturnType<SpawnFn>) {
  const calls: Array<{ cmd: string[]; opts: Record<string, string> }> = [];
  const fn: SpawnFn = (cmd, opts) => {
    calls.push({ cmd, opts });
    return proc;
  };
  return { fn, calls };
}

/** Create a mock SpawnFn that throws (simulating binary not found). */
function createThrowingSpawn() {
  const fn: SpawnFn = () => {
    throw new Error("spawn failed");
  };
  return { fn };
}

/** Shorthand: create a client with a mock spawn that succeeds. */
function clientOk(stdout = "", stderr = "") {
  const { fn, calls } = createMockSpawn(mockProc(stdout, stderr, 0));
  return { client: new CmuxClient({ timeoutMs: 1000, spawn: fn }), calls };
}

/** Shorthand: create a client with a mock spawn that fails. */
function clientFail(stderr: string, exitCode = 1) {
  const { fn, calls } = createMockSpawn(mockProc("", stderr, exitCode));
  return { client: new CmuxClient({ timeoutMs: 1000, spawn: fn }), calls };
}

/** Shorthand: create a client whose spawn throws. */
function clientThrows() {
  const { fn } = createThrowingSpawn();
  return { client: new CmuxClient({ timeoutMs: 1000, spawn: fn }) };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CmuxClient", () => {
  // -----------------------------------------------------------------------
  // ping
  // -----------------------------------------------------------------------

  describe("ping", () => {
    test("returns true when cmux responds with exit 0", async () => {
      const { client, calls } = clientOk();

      expect(await client.ping()).toBe(true);
      expect(calls).toHaveLength(1);
      expect(calls[0].cmd).toEqual(["cmux", "ping"]);
    });

    test("returns false when cmux binary is not found", async () => {
      const { client } = clientThrows();

      expect(await client.ping()).toBe(false);
    });

    test("returns false when cmux exits non-zero", async () => {
      const { client } = clientFail("not running");

      expect(await client.ping()).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // createWorkspace
  // -----------------------------------------------------------------------

  describe("createWorkspace", () => {
    test("passes name and parses workspace from JSON", async () => {
      const ws = { name: "my-epic", surfaces: [] };
      const { client, calls } = clientOk(JSON.stringify(ws));

      const result = await client.createWorkspace("my-epic");
      expect(result).toEqual(ws);
      expect(calls[0].cmd).toEqual([
        "cmux",
        "workspace",
        "new",
        "my-epic",
        "--json",
      ]);
    });

    test("throws CmuxProtocolError on invalid JSON", async () => {
      const { client } = clientOk("not json");

      await expect(client.createWorkspace("x")).rejects.toThrow(
        CmuxProtocolError,
      );
    });
  });

  // -----------------------------------------------------------------------
  // createSurface
  // -----------------------------------------------------------------------

  describe("createSurface", () => {
    test("creates surface in workspace with name", async () => {
      const surf = { name: "implement", workspace: "ws-1", pid: 123 };
      const { client, calls } = clientOk(JSON.stringify(surf));

      const result = await client.createSurface("ws-1", "implement");
      expect(result).toEqual(surf);
      expect(calls[0].cmd).toEqual([
        "cmux",
        "surface",
        "new",
        "--workspace",
        "ws-1",
        "--name",
        "implement",
        "--json",
      ]);
    });
  });

  // -----------------------------------------------------------------------
  // sendText
  // -----------------------------------------------------------------------

  describe("sendText", () => {
    test("sends text to surface without JSON flag", async () => {
      const { client, calls } = clientOk();

      await client.sendText("ws-1", "surf-1", "beastmode implement epic feat");
      expect(calls[0].cmd).toEqual([
        "cmux",
        "surface",
        "send-text",
        "--workspace",
        "ws-1",
        "--surface",
        "surf-1",
        "--text",
        "beastmode implement epic feat",
      ]);
    });
  });

  // -----------------------------------------------------------------------
  // closeSurface
  // -----------------------------------------------------------------------

  describe("closeSurface", () => {
    test("closes surface successfully", async () => {
      const { client } = clientOk();

      await expect(
        client.closeSurface("ws-1", "surf-1"),
      ).resolves.toBeUndefined();
    });

    test("swallows 'not found' error (idempotent close)", async () => {
      const { client } = clientFail("surface not found");

      // Should NOT throw — "not found" is swallowed as already-closed
      await expect(
        client.closeSurface("ws-1", "surf-1"),
      ).resolves.toBeUndefined();
    });

    test("throws CmuxConnectionError when binary missing", async () => {
      const { client } = clientThrows();

      await expect(client.closeSurface("ws-1", "surf-1")).rejects.toThrow(
        CmuxConnectionError,
      );
    });

    test("rethrows non-not-found CmuxError", async () => {
      const { client } = clientFail("internal error");

      await expect(client.closeSurface("ws-1", "surf-1")).rejects.toThrow(
        CmuxError,
      );
    });

    test("passes correct args", async () => {
      const { client, calls } = clientOk();

      await client.closeSurface("ws-1", "surf-1");
      expect(calls[0].cmd).toEqual([
        "cmux",
        "surface",
        "close",
        "--workspace",
        "ws-1",
        "--surface",
        "surf-1",
      ]);
    });
  });

  // -----------------------------------------------------------------------
  // closeWorkspace
  // -----------------------------------------------------------------------

  describe("closeWorkspace", () => {
    test("closes workspace successfully", async () => {
      const { client } = clientOk();

      await expect(client.closeWorkspace("ws-1")).resolves.toBeUndefined();
    });

    test("swallows 'not found' error (idempotent close)", async () => {
      const { client } = clientFail("workspace not found");

      await expect(client.closeWorkspace("ws-1")).resolves.toBeUndefined();
    });

    test("rethrows non-not-found CmuxError", async () => {
      const { client } = clientFail("internal failure");

      await expect(client.closeWorkspace("ws-1")).rejects.toThrow(CmuxError);
    });

    test("throws CmuxConnectionError when not running", async () => {
      const { client } = clientFail("cmux is not running");

      await expect(client.closeWorkspace("ws-1")).rejects.toThrow(
        CmuxConnectionError,
      );
    });
  });

  // -----------------------------------------------------------------------
  // listWorkspaces
  // -----------------------------------------------------------------------

  describe("listWorkspaces", () => {
    test("parses workspace list from JSON", async () => {
      const data = [{ name: "epic-a", surfaces: ["s-1", "s-2"] }];
      const { client, calls } = clientOk(JSON.stringify(data));

      const result = await client.listWorkspaces();
      expect(result).toEqual(data);
      expect(calls[0].cmd).toEqual([
        "cmux",
        "workspace",
        "list",
        "--json",
      ]);
    });

    test("returns empty array for no workspaces", async () => {
      const { client } = clientOk("[]");

      const result = await client.listWorkspaces();
      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // getSurface
  // -----------------------------------------------------------------------

  describe("getSurface", () => {
    test("returns surface when found", async () => {
      const surf = { name: "plan", workspace: "ws-1", pid: 100 };
      const { client } = clientOk(JSON.stringify(surf));

      const result = await client.getSurface("ws-1", "plan");
      expect(result).toEqual(surf);
    });

    test("returns null when surface not found", async () => {
      const { client } = clientFail("not found");

      const result = await client.getSurface("ws-1", "plan");
      expect(result).toBeNull();
    });

    test("returns null when binary not available", async () => {
      const { client } = clientThrows();

      const result = await client.getSurface("ws-1", "plan");
      expect(result).toBeNull();
    });

    test("passes correct args including --json", async () => {
      const surf = { name: "plan", workspace: "ws-1" };
      const { client, calls } = clientOk(JSON.stringify(surf));

      await client.getSurface("ws-1", "plan");
      expect(calls[0].cmd).toEqual([
        "cmux",
        "surface",
        "get",
        "--workspace",
        "ws-1",
        "--surface",
        "plan",
        "--json",
      ]);
    });
  });

  // -----------------------------------------------------------------------
  // notify
  // -----------------------------------------------------------------------

  describe("notify", () => {
    test("passes title and body without JSON flag", async () => {
      const { client, calls } = clientOk();

      await client.notify("Error", "Phase failed");
      expect(calls[0].cmd).toEqual([
        "cmux",
        "notify",
        "--title",
        "Error",
        "--body",
        "Phase failed",
      ]);
    });
  });

  // -----------------------------------------------------------------------
  // error handling
  // -----------------------------------------------------------------------

  describe("error handling", () => {
    test("throws CmuxConnectionError when binary not found", async () => {
      const { client } = clientThrows();

      await expect(client.createWorkspace("x")).rejects.toThrow(
        CmuxConnectionError,
      );
    });

    test("throws CmuxConnectionError on connection refused", async () => {
      const { client } = clientFail("connection refused");

      await expect(client.createWorkspace("x")).rejects.toThrow(
        CmuxConnectionError,
      );
    });

    test("throws CmuxConnectionError when not running", async () => {
      const { client } = clientFail("cmux is not running");

      await expect(client.createWorkspace("x")).rejects.toThrow(
        CmuxConnectionError,
      );
    });

    test("throws CmuxError on non-zero exit with stderr details", async () => {
      const { client } = clientFail("unknown command");

      try {
        await client.createWorkspace("x");
        expect(true).toBe(false); // should not reach
      } catch (e) {
        expect(e).toBeInstanceOf(CmuxError);
        expect((e as Error).message).toContain("unknown command");
      }
    });

    test("uses stdout as error message when stderr is empty", async () => {
      const { fn } = createMockSpawn(mockProc("error output here", "", 1));
      const client = new CmuxClient({ timeoutMs: 1000, spawn: fn });

      try {
        await client.createWorkspace("x");
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(CmuxError);
        expect((e as Error).message).toContain("error output here");
      }
    });

    test("falls back to exit code message when both streams empty", async () => {
      const { fn } = createMockSpawn(mockProc("", "", 1));
      const client = new CmuxClient({ timeoutMs: 1000, spawn: fn });

      try {
        await client.createWorkspace("x");
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(CmuxError);
        expect((e as Error).message).toContain("exited with code 1");
      }
    });
  });

  // -----------------------------------------------------------------------
  // timeout configuration
  // -----------------------------------------------------------------------

  describe("timeout", () => {
    test("defaults to 10 seconds", () => {
      const defaultClient = new CmuxClient();
      expect((defaultClient as any).timeoutMs).toBe(10_000);
    });

    test("accepts custom timeout", () => {
      const customClient = new CmuxClient({ timeoutMs: 5000 });
      expect((customClient as any).timeoutMs).toBe(5000);
    });
  });
});

// ---------------------------------------------------------------------------
// cmuxAvailable helper — uses Bun.spawn directly, needs spyOn
// ---------------------------------------------------------------------------

describe("cmuxAvailable", () => {
  test("returns true when ping succeeds", async () => {
    const spy = spyOn(Bun, "spawn").mockReturnValue(
      mockProc("", "", 0) as any,
    );
    try {
      expect(await cmuxAvailable()).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  test("returns false when ping fails", async () => {
    const spy = spyOn(Bun, "spawn").mockImplementation(() => {
      throw new Error("spawn failed");
    });
    try {
      expect(await cmuxAvailable()).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });
});
