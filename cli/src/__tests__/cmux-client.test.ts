import { describe, test, expect, spyOn } from "bun:test";
import {
  CmuxClient,
  CmuxError,
  CmuxConnectionError,
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

/** Create a mock SpawnFn that returns different results per call. */
function createSequentialSpawn(procs: ReturnType<SpawnFn>[]) {
  const calls: Array<{ cmd: string[]; opts: Record<string, string> }> = [];
  let idx = 0;
  const fn: SpawnFn = (cmd, opts) => {
    calls.push({ cmd, opts });
    return procs[Math.min(idx++, procs.length - 1)];
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
      const { client, calls } = clientOk("PONG\n");

      expect(await client.ping()).toBe(true);
      expect(calls).toHaveLength(1);
      expect(calls[0].cmd[1]).toBe("ping");
    });

    test("returns false when cmux binary is not found", async () => {
      const { client } = clientThrows();

      expect(await client.ping()).toBe(false);
    });

    test("returns false when cmux exits non-zero", async () => {
      const { client } = clientFail("Failed to write to socket");

      expect(await client.ping()).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // createWorkspace
  // -----------------------------------------------------------------------

  describe("createWorkspace", () => {
    test("calls new-workspace with --name flag", async () => {
      const { client, calls } = clientOk("OK workspace:4\n");

      const result = await client.createWorkspace("bm-my-epic");
      expect(result).toEqual({ name: "bm-my-epic", surfaces: [] });
      expect(calls[0].cmd.slice(1)).toEqual([
        "new-workspace",
        "--name",
        "bm-my-epic",
      ]);
    });
  });

  // -----------------------------------------------------------------------
  // createSurface
  // -----------------------------------------------------------------------

  describe("createSurface", () => {
    test("creates surface and renames tab", async () => {
      // First call: new-workspace, second: new-surface, third: rename-tab
      const { fn, calls } = createSequentialSpawn([
        mockProc("OK workspace:4\n", "", 0),
        mockProc("OK surface:5 pane:4 workspace:4\n", "", 0),
        mockProc("OK action=rename\n", "", 0),
      ]);
      const client = new CmuxClient({ timeoutMs: 1000, spawn: fn });

      // Create workspace first to register the ref
      await client.createWorkspace("bm-my-epic");
      const result = await client.createSurface("bm-my-epic", "plan");

      expect(result).toEqual({ name: "plan", workspace: "bm-my-epic" });

      // new-surface should use the workspace ref
      expect(calls[1].cmd.slice(1)).toEqual([
        "new-surface",
        "--workspace",
        "workspace:4",
      ]);

      // rename-tab should set the surface title
      expect(calls[2].cmd.slice(1)).toEqual([
        "rename-tab",
        "--workspace",
        "workspace:4",
        "--surface",
        "surface:5",
        "plan",
      ]);
    });
  });

  // -----------------------------------------------------------------------
  // sendText
  // -----------------------------------------------------------------------

  describe("sendText", () => {
    test("sends text then presses enter", async () => {
      const { fn, calls } = createSequentialSpawn([
        mockProc("OK workspace:4\n", "", 0),  // createWorkspace
        mockProc("OK surface:5 pane:4 workspace:4\n", "", 0),  // createSurface
        mockProc("OK\n", "", 0),  // rename-tab
        mockProc("OK surface:5 workspace:4\n", "", 0),  // send
        mockProc("OK surface:5 workspace:4\n", "", 0),  // send-key enter
      ]);
      const client = new CmuxClient({ timeoutMs: 1000, spawn: fn });

      await client.createWorkspace("bm-my-epic");
      await client.createSurface("bm-my-epic", "plan");
      await client.sendText("bm-my-epic", "plan", "beastmode plan my-epic");

      // send command
      expect(calls[3].cmd.slice(1)).toEqual([
        "send",
        "--workspace",
        "workspace:4",
        "--surface",
        "surface:5",
        "beastmode plan my-epic",
      ]);

      // send-key enter
      expect(calls[4].cmd.slice(1)).toEqual([
        "send-key",
        "--workspace",
        "workspace:4",
        "--surface",
        "surface:5",
        "enter",
      ]);
    });
  });

  // -----------------------------------------------------------------------
  // closeSurface
  // -----------------------------------------------------------------------

  describe("closeSurface", () => {
    test("closes surface successfully", async () => {
      const { client } = clientOk("OK\n");

      await expect(
        client.closeSurface("ws-1", "surf-1"),
      ).resolves.toBeUndefined();
    });

    test("swallows 'not found' error (idempotent close)", async () => {
      const { client } = clientFail("not_found: Surface not found");

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
  });

  // -----------------------------------------------------------------------
  // closeWorkspace
  // -----------------------------------------------------------------------

  describe("closeWorkspace", () => {
    test("closes workspace successfully", async () => {
      const { client } = clientOk("OK workspace:4\n");

      await expect(client.closeWorkspace("ws-1")).resolves.toBeUndefined();
    });

    test("swallows 'not found' error (idempotent close)", async () => {
      const { client } = clientFail("not_found: Workspace not found");

      await expect(client.closeWorkspace("ws-1")).resolves.toBeUndefined();
    });

    test("rethrows non-not-found CmuxError", async () => {
      const { client } = clientFail("internal failure");

      await expect(client.closeWorkspace("ws-1")).rejects.toThrow(CmuxError);
    });

    test("throws CmuxConnectionError when socket dead", async () => {
      const { client } = clientFail("Failed to write to socket");

      await expect(client.closeWorkspace("ws-1")).rejects.toThrow(
        CmuxConnectionError,
      );
    });
  });

  // -----------------------------------------------------------------------
  // listWorkspaces
  // -----------------------------------------------------------------------

  describe("listWorkspaces", () => {
    test("parses workspace list from text output", async () => {
      const output = `* workspace:1  ~  [selected]\n  workspace:4  bm-my-epic\n`;
      const { client } = clientOk(output);

      const result = await client.listWorkspaces();
      expect(result).toEqual([
        { name: "~", surfaces: [] },
        { name: "bm-my-epic", surfaces: [] },
      ]);
    });

    test("returns empty array for blank output", async () => {
      const { client } = clientOk("\n");

      const result = await client.listWorkspaces();
      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // getSurface
  // -----------------------------------------------------------------------

  describe("getSurface", () => {
    test("returns surface when found in tree output", async () => {
      const treeOutput = `window window:1 [current]
└── workspace workspace:4 "bm-my-epic"
    └── pane pane:4 [focused]
        └── surface surface:5 [terminal] "plan" [selected]\n`;
      const { client } = clientOk(treeOutput);

      const result = await client.getSurface("ws-1", "plan");
      expect(result).toEqual({ name: "plan", workspace: "ws-1" });
    });

    test("returns null when surface not in tree", async () => {
      const treeOutput = `window window:1 [current]
└── workspace workspace:4 "bm-my-epic"
    └── pane pane:4 [focused]
        └── surface surface:5 [terminal] "other" [selected]\n`;
      const { client } = clientOk(treeOutput);

      const result = await client.getSurface("ws-1", "plan");
      expect(result).toBeNull();
    });

    test("returns null when tree command fails", async () => {
      const { client } = clientFail("not found");

      const result = await client.getSurface("ws-1", "plan");
      expect(result).toBeNull();
    });

    test("returns null when binary not available", async () => {
      const { client } = clientThrows();

      const result = await client.getSurface("ws-1", "plan");
      expect(result).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // notify
  // -----------------------------------------------------------------------

  describe("notify", () => {
    test("passes title and body", async () => {
      const { client, calls } = clientOk();

      await client.notify("Error", "Phase failed");
      expect(calls[0].cmd.slice(1)).toEqual([
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

    test("throws CmuxConnectionError on socket write failure", async () => {
      const { client } = clientFail("Failed to write to socket");

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
      mockProc("PONG\n", "", 0) as any,
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
