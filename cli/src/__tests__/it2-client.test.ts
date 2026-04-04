import { describe, test, expect } from "vitest";
import {
  It2Client,
  It2Error,
  It2ConnectionError,
  It2NotInstalledError,
  checkIt2Available,
  detectITerm2Env,
  type SpawnFn,
} from "../dispatch/it2";

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
        { id: "sess-1", name: "Tab 1", tab_id: "w0t0" },
        { id: "sess-2", name: "Tab 2", tab_id: "w0t1" },
      ]);
      const { client, calls } = clientOk(json);

      const result = await client.listSessions();
      expect(result).toEqual([
        { id: "sess-1", name: "Tab 1", tabId: "w0t0", isAlive: true },
        { id: "sess-2", name: "Tab 2", tabId: "w0t1", isAlive: true },
      ]);
      expect(calls[0].cmd.slice(1)).toEqual([
        "session",
        "list",
        "--json",
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
    test("creates tab and returns session ID via before/after diff", async () => {
      const beforeJson = JSON.stringify([
        { id: "existing-1", name: "", tab_id: "w0t0" },
      ]);
      const afterJson = JSON.stringify([
        { id: "existing-1", name: "", tab_id: "w0t0" },
        { id: "new-session-123", name: "", tab_id: "w0t1" },
      ]);

      let callIndex = 0;
      const calls: Array<{ cmd: string[]; opts: Record<string, string> }> = [];
      const fn: SpawnFn = (cmd, opts) => {
        calls.push({ cmd, opts });
        const idx = callIndex++;
        if (idx === 0) return mockProc(beforeJson, "", 0); // listSessions before
        if (idx === 1) return mockProc("Created new tab: w0t1\n", "", 0); // tab new
        return mockProc(afterJson, "", 0); // listSessions after
      };
      const client = new It2Client({ timeoutMs: 1000, spawn: fn });

      const result = await client.createTab();
      expect(result).toBe("new-session-123");
      expect(calls).toHaveLength(3);
      expect(calls[0].cmd.slice(1)).toEqual(["session", "list", "--json"]);
      expect(calls[1].cmd.slice(1)).toEqual(["tab", "new"]);
      expect(calls[2].cmd.slice(1)).toEqual(["session", "list", "--json"]);
    });
  });

  // -----------------------------------------------------------------------
  // splitPane
  // -----------------------------------------------------------------------

  describe("splitPane", () => {
    test("passes correct args with -v -s flags and returns session ID", async () => {
      const { client, calls } = clientOk("Created new pane: new-pane-456\n");

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
        "run",
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
        "set-var",
        "-s",
        "sess-1",
        "user.badge",
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
        "set-name",
        "-s",
        "sess-1",
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
        "get-var",
        "-s",
        "sess-1",
        "badge",
      ]);
    });
  });

  // -----------------------------------------------------------------------
  // getSessionTty
  // -----------------------------------------------------------------------

  describe("getSessionTty", () => {
    test("returns tty for matching session ID", async () => {
      const json = JSON.stringify([
        { id: "sess-1", name: "Tab 1", tab_id: "w0t0", tty: "/dev/ttys003" },
        { id: "sess-2", name: "Tab 2", tab_id: "w0t1", tty: "/dev/ttys004" },
      ]);
      const { client } = clientOk(json);

      const result = await client.getSessionTty("sess-1");
      expect(result).toBe("/dev/ttys003");
    });

    test("returns null when session ID not found", async () => {
      const json = JSON.stringify([
        { id: "sess-1", name: "Tab 1", tab_id: "w0t0", tty: "/dev/ttys003" },
      ]);
      const { client } = clientOk(json);

      const result = await client.getSessionTty("nonexistent");
      expect(result).toBeNull();
    });

    test("returns null when tty field is missing", async () => {
      const json = JSON.stringify([
        { id: "sess-1", name: "Tab 1", tab_id: "w0t0" },
      ]);
      const { client } = clientOk(json);

      const result = await client.getSessionTty("sess-1");
      expect(result).toBeNull();
    });

    test("returns null on connection failure", async () => {
      const { client } = clientFail("connection refused");

      const result = await client.getSessionTty("sess-1");
      expect(result).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // error handling
  // -----------------------------------------------------------------------

  describe("error handling", () => {
    test("throws It2NotInstalledError on ENOENT", async () => {
      const { client } = clientThrows("ENOENT");

      await expect(client.splitPane("sess")).rejects.toThrow(It2NotInstalledError);
    });

    test("throws It2NotInstalledError when binary not found (no ENOENT code)", async () => {
      const { client } = clientThrows();

      await expect(client.splitPane("sess")).rejects.toThrow(It2NotInstalledError);
    });

    test("throws It2ConnectionError on connection refused", async () => {
      const { client } = clientFail("connection refused");

      await expect(client.splitPane("sess")).rejects.toThrow(It2ConnectionError);
    });

    test("throws It2ConnectionError on not running", async () => {
      const { client } = clientFail("not running");

      await expect(client.splitPane("sess")).rejects.toThrow(It2ConnectionError);
    });

    test("throws It2NotInstalledError on 'not installed' stderr", async () => {
      const { client } = clientFail("it2 not installed");

      await expect(client.splitPane("sess")).rejects.toThrow(It2NotInstalledError);
    });

    test("throws It2Error on non-zero exit with stderr details", async () => {
      const { client } = clientFail("unknown command");

      try {
        await client.splitPane("sess");
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
        await client.splitPane("sess");
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
        await client.splitPane("sess");
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
// checkIt2Available helper
// ---------------------------------------------------------------------------

describe("checkIt2Available", () => {
  test("returns true when it2 --version exits 0", async () => {
    const spawn: SpawnFn = () => mockProc("0.1.0\n", "", 0);
    expect(await checkIt2Available(spawn)).toBe(true);
  });

  test("returns false when spawn throws", async () => {
    const spawn: SpawnFn = () => { throw new Error("spawn failed"); };
    expect(await checkIt2Available(spawn)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// detectITerm2Env helper
// ---------------------------------------------------------------------------

describe("detectITerm2Env", () => {
  test("returns detected: true when both env vars are set", () => {
    const result = detectITerm2Env({
      TERM_PROGRAM: "iTerm.app",
      ITERM_SESSION_ID: "w0t0p0:12345",
    });
    expect(result.detected).toBe(true);
    expect(result.sessionId).toBe("w0t0p0:12345");
  });

  test("returns detected: false when ITERM_SESSION_ID is missing", () => {
    const result = detectITerm2Env({
      TERM_PROGRAM: "iTerm.app",
    });
    expect(result.detected).toBe(false);
  });

  test("returns detected: false when TERM_PROGRAM is not iTerm.app", () => {
    const result = detectITerm2Env({
      TERM_PROGRAM: "Apple_Terminal",
      ITERM_SESSION_ID: "w0t0p0:12345",
    });
    expect(result.detected).toBe(false);
  });

  test("returns detected: false when both env vars are missing", () => {
    const result = detectITerm2Env({});
    expect(result.detected).toBe(false);
  });
});
