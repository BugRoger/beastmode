import { describe, test, expect, spyOn } from "bun:test";
import {
  It2Client,
  It2Error,
  It2ConnectionError,
  It2NotInstalledError,
  it2Available,
  isInsideITerm2,
  type SpawnFn,
} from "../it2-client";

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
function createThrowingSpawn(code?: string) {
  const fn: SpawnFn = () => {
    const err = new Error("spawn failed") as NodeJS.ErrnoException;
    if (code) err.code = code;
    throw err;
  };
  return { fn };
}

/** Shorthand: create a client with a mock spawn that succeeds. */
function clientOk(stdout = "", stderr = "") {
  const { fn, calls } = createMockSpawn(mockProc(stdout, stderr, 0));
  return { client: new It2Client({ timeoutMs: 1000, spawn: fn }), calls };
}

/** Shorthand: create a client with a mock spawn that fails. */
function clientFail(stderr: string, exitCode = 1) {
  const { fn, calls } = createMockSpawn(mockProc("", stderr, exitCode));
  return { client: new It2Client({ timeoutMs: 1000, spawn: fn }), calls };
}

/** Shorthand: create a client whose spawn throws. */
function clientThrows(code?: string) {
  const { fn } = createThrowingSpawn(code);
  return { client: new It2Client({ timeoutMs: 1000, spawn: fn }) };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("It2Client", () => {
  // -----------------------------------------------------------------------
  // ping
  // -----------------------------------------------------------------------

  describe("ping", () => {
    test("returns true when it2 responds with exit 0", async () => {
      const { client, calls } = clientOk("session-id-1\n");

      expect(await client.ping()).toBe(true);
      expect(calls).toHaveLength(1);
      expect(calls[0].cmd.slice(1)).toEqual(["session", "list"]);
    });

    test("returns false when it2 binary is not found", async () => {
      const { client } = clientThrows();

      expect(await client.ping()).toBe(false);
    });

    test("returns false when it2 exits non-zero", async () => {
      const { client } = clientFail("not running");

      expect(await client.ping()).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // listSessions
  // -----------------------------------------------------------------------

  describe("listSessions", () => {
    test("parses JSON output into It2Session array", async () => {
      const json = JSON.stringify([
        { id: "sess-1", name: "Tab 1", isAlive: true },
        { id: "sess-2", name: "Tab 2", isAlive: false },
      ]);
      const { client, calls } = clientOk(json);

      const result = await client.listSessions();
      expect(result).toEqual([
        { id: "sess-1", name: "Tab 1", isAlive: true },
        { id: "sess-2", name: "Tab 2", isAlive: false },
      ]);
      expect(calls[0].cmd.slice(1)).toEqual([
        "session",
        "list",
        "--json",
      ]);
    });

    test("handles is_alive field (snake_case)", async () => {
      const json = JSON.stringify([
        { id: "sess-1", name: "Tab 1", is_alive: true },
      ]);
      const { client } = clientOk(json);

      const result = await client.listSessions();
      expect(result).toEqual([
        { id: "sess-1", name: "Tab 1", isAlive: true },
      ]);
    });

    test("returns empty array on failure", async () => {
      const { client } = clientFail("connection refused");

      const result = await client.listSessions();
      expect(result).toEqual([]);
    });

    test("returns empty array on invalid JSON", async () => {
      const { client } = clientOk("not json at all");

      const result = await client.listSessions();
      expect(result).toEqual([]);
    });

    test("returns empty array when JSON is not an array", async () => {
      const { client } = clientOk('{"not": "array"}');

      const result = await client.listSessions();
      expect(result).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // createTab
  // -----------------------------------------------------------------------

  describe("createTab", () => {
    test("returns session ID from stdout", async () => {
      const { client, calls } = clientOk("new-session-123\n");

      const result = await client.createTab();
      expect(result).toBe("new-session-123");
      expect(calls[0].cmd.slice(1)).toEqual(["session", "new-tab"]);
    });
  });

  // -----------------------------------------------------------------------
  // splitPane
  // -----------------------------------------------------------------------

  describe("splitPane", () => {
    test("passes correct args with -v -s flags and returns session ID", async () => {
      const { client, calls } = clientOk("new-pane-456\n");

      const result = await client.splitPane("sess-1");
      expect(result).toBe("new-pane-456");
      expect(calls[0].cmd.slice(1)).toEqual([
        "session",
        "split",
        "-v",
        "-s",
        "sess-1",
      ]);
    });
  });

  // -----------------------------------------------------------------------
  // closeSession
  // -----------------------------------------------------------------------

  describe("closeSession", () => {
    test("closes session successfully", async () => {
      const { client, calls } = clientOk("");

      await expect(client.closeSession("sess-1")).resolves.toBeUndefined();
      expect(calls[0].cmd.slice(1)).toEqual([
        "session",
        "close",
        "-f",
        "-s",
        "sess-1",
      ]);
    });

    test("swallows 'not found' error (idempotent close)", async () => {
      const { client } = clientFail("not_found: Session not found");

      await expect(client.closeSession("sess-1")).resolves.toBeUndefined();
    });

    test("rethrows connection errors", async () => {
      const { client } = clientFail("connection refused");

      await expect(client.closeSession("sess-1")).rejects.toThrow(
        It2ConnectionError,
      );
    });

    test("rethrows non-not-found It2Error", async () => {
      const { client } = clientFail("internal error");

      await expect(client.closeSession("sess-1")).rejects.toThrow(It2Error);
    });
  });

  // -----------------------------------------------------------------------
  // sendText
  // -----------------------------------------------------------------------

  describe("sendText", () => {
    test("passes session ID and text correctly", async () => {
      const { client, calls } = clientOk("");

      await client.sendText("sess-1", "echo hello");
      expect(calls[0].cmd.slice(1)).toEqual([
        "session",
        "send-text",
        "-s",
        "sess-1",
        "echo hello",
      ]);
    });
  });

  // -----------------------------------------------------------------------
  // setBadge
  // -----------------------------------------------------------------------

  describe("setBadge", () => {
    test("sets badge property correctly", async () => {
      const { client, calls } = clientOk("");

      await client.setBadge("sess-1", "Running");
      expect(calls[0].cmd.slice(1)).toEqual([
        "session",
        "set-property",
        "-s",
        "sess-1",
        "badge",
        "Running",
      ]);
    });
  });

  // -----------------------------------------------------------------------
  // setTabTitle
  // -----------------------------------------------------------------------

  describe("setTabTitle", () => {
    test("sets name property correctly", async () => {
      const { client, calls } = clientOk("");

      await client.setTabTitle("sess-1", "My Tab");
      expect(calls[0].cmd.slice(1)).toEqual([
        "session",
        "set-property",
        "-s",
        "sess-1",
        "name",
        "My Tab",
      ]);
    });
  });

  // -----------------------------------------------------------------------
  // getSessionProperty
  // -----------------------------------------------------------------------

  describe("getSessionProperty", () => {
    test("returns trimmed stdout value", async () => {
      const { client, calls } = clientOk("  some-value  \n");

      const result = await client.getSessionProperty("sess-1", "badge");
      expect(result).toBe("some-value");
      expect(calls[0].cmd.slice(1)).toEqual([
        "session",
        "show-property",
        "-s",
        "sess-1",
        "badge",
      ]);
    });
  });

  // -----------------------------------------------------------------------
  // error handling
  // -----------------------------------------------------------------------

  describe("error handling", () => {
    test("throws It2NotInstalledError on ENOENT", async () => {
      const { client } = clientThrows("ENOENT");

      await expect(client.createTab()).rejects.toThrow(It2NotInstalledError);
    });

    test("throws It2NotInstalledError when binary not found (no ENOENT code)", async () => {
      const { client } = clientThrows();

      await expect(client.createTab()).rejects.toThrow(It2NotInstalledError);
    });

    test("throws It2ConnectionError on connection refused", async () => {
      const { client } = clientFail("connection refused");

      await expect(client.createTab()).rejects.toThrow(It2ConnectionError);
    });

    test("throws It2ConnectionError on not running", async () => {
      const { client } = clientFail("not running");

      await expect(client.createTab()).rejects.toThrow(It2ConnectionError);
    });

    test("throws It2NotInstalledError on 'not installed' stderr", async () => {
      const { client } = clientFail("it2 not installed");

      await expect(client.createTab()).rejects.toThrow(It2NotInstalledError);
    });

    test("throws It2Error on non-zero exit with stderr details", async () => {
      const { client } = clientFail("unknown command");

      try {
        await client.createTab();
        expect(true).toBe(false); // should not reach
      } catch (e) {
        expect(e).toBeInstanceOf(It2Error);
        expect((e as Error).message).toContain("unknown command");
      }
    });

    test("uses stdout as error message when stderr is empty", async () => {
      const { fn } = createMockSpawn(mockProc("error output here", "", 1));
      const client = new It2Client({ timeoutMs: 1000, spawn: fn });

      try {
        await client.createTab();
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(It2Error);
        expect((e as Error).message).toContain("error output here");
      }
    });

    test("falls back to exit code message when both streams empty", async () => {
      const { fn } = createMockSpawn(mockProc("", "", 1));
      const client = new It2Client({ timeoutMs: 1000, spawn: fn });

      try {
        await client.createTab();
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(It2Error);
        expect((e as Error).message).toContain("exited with code 1");
      }
    });
  });

  // -----------------------------------------------------------------------
  // timeout configuration
  // -----------------------------------------------------------------------

  describe("timeout", () => {
    test("defaults to 10 seconds", () => {
      const defaultClient = new It2Client();
      expect((defaultClient as any).timeoutMs).toBe(10_000);
    });

    test("accepts custom timeout", () => {
      const customClient = new It2Client({ timeoutMs: 5000 });
      expect((customClient as any).timeoutMs).toBe(5000);
    });
  });
});

// ---------------------------------------------------------------------------
// it2Available helper — uses Bun.spawn directly, needs spyOn
// ---------------------------------------------------------------------------

describe("it2Available", () => {
  test("returns true when ping succeeds", async () => {
    const spy = spyOn(Bun, "spawn").mockReturnValue(
      mockProc("session-list-output\n", "", 0) as any,
    );
    try {
      expect(await it2Available()).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });

  test("returns false when ping fails", async () => {
    const spy = spyOn(Bun, "spawn").mockImplementation(() => {
      throw new Error("spawn failed");
    });
    try {
      expect(await it2Available()).toBe(false);
    } finally {
      spy.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------------
// isInsideITerm2 helper
// ---------------------------------------------------------------------------

describe("isInsideITerm2", () => {
  test("returns true when both env vars are set", () => {
    const origSession = process.env.ITERM_SESSION_ID;
    const origProgram = process.env.TERM_PROGRAM;
    try {
      process.env.ITERM_SESSION_ID = "w0t0p0:12345";
      process.env.TERM_PROGRAM = "iTerm.app";
      expect(isInsideITerm2()).toBe(true);
    } finally {
      if (origSession !== undefined) process.env.ITERM_SESSION_ID = origSession;
      else delete process.env.ITERM_SESSION_ID;
      if (origProgram !== undefined) process.env.TERM_PROGRAM = origProgram;
      else delete process.env.TERM_PROGRAM;
    }
  });

  test("returns false when ITERM_SESSION_ID is missing", () => {
    const origSession = process.env.ITERM_SESSION_ID;
    const origProgram = process.env.TERM_PROGRAM;
    try {
      delete process.env.ITERM_SESSION_ID;
      process.env.TERM_PROGRAM = "iTerm.app";
      expect(isInsideITerm2()).toBe(false);
    } finally {
      if (origSession !== undefined) process.env.ITERM_SESSION_ID = origSession;
      else delete process.env.ITERM_SESSION_ID;
      if (origProgram !== undefined) process.env.TERM_PROGRAM = origProgram;
      else delete process.env.TERM_PROGRAM;
    }
  });

  test("returns false when TERM_PROGRAM is not iTerm.app", () => {
    const origSession = process.env.ITERM_SESSION_ID;
    const origProgram = process.env.TERM_PROGRAM;
    try {
      process.env.ITERM_SESSION_ID = "w0t0p0:12345";
      process.env.TERM_PROGRAM = "Apple_Terminal";
      expect(isInsideITerm2()).toBe(false);
    } finally {
      if (origSession !== undefined) process.env.ITERM_SESSION_ID = origSession;
      else delete process.env.ITERM_SESSION_ID;
      if (origProgram !== undefined) process.env.TERM_PROGRAM = origProgram;
      else delete process.env.TERM_PROGRAM;
    }
  });

  test("returns false when both env vars are missing", () => {
    const origSession = process.env.ITERM_SESSION_ID;
    const origProgram = process.env.TERM_PROGRAM;
    try {
      delete process.env.ITERM_SESSION_ID;
      delete process.env.TERM_PROGRAM;
      expect(isInsideITerm2()).toBe(false);
    } finally {
      if (origSession !== undefined) process.env.ITERM_SESSION_ID = origSession;
      else delete process.env.ITERM_SESSION_ID;
      if (origProgram !== undefined) process.env.TERM_PROGRAM = origProgram;
      else delete process.env.TERM_PROGRAM;
    }
  });
});
