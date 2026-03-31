import { describe, it, expect } from "bun:test";
import {
  It2Client,
  It2ConnectionError,
  It2NotInstalledError,
  It2Error,
  type SpawnFn,
} from "../src/it2-client";

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

/**
 * Create a mock spawn function that returns the given stdout, stderr, and exit code.
 * Tracks all calls for assertion.
 */
function mockSpawn(opts: {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  throws?: boolean;
}): SpawnFn & { calls: string[][] } {
  const calls: string[][] = [];

  const fn = ((cmd: string[]) => {
    calls.push(cmd);

    if (opts.throws) {
      const err = new Error("spawn ENOENT") as NodeJS.ErrnoException;
      err.code = "ENOENT";
      throw err;
    }

    const stdoutText = opts.stdout ?? "";
    const stderrText = opts.stderr ?? "";
    const exitCode = opts.exitCode ?? 0;

    return {
      stdout: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(stdoutText));
          controller.close();
        },
      }),
      stderr: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(stderrText));
          controller.close();
        },
      }),
      exited: Promise.resolve(exitCode),
    };
  }) as SpawnFn & { calls: string[][] };

  fn.calls = calls;
  return fn;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("It2Client", () => {
  describe("ping", () => {
    it("returns true when it2 session list succeeds (exit 0)", async () => {
      const spawn = mockSpawn({ stdout: "[]", exitCode: 0 });
      const client = new It2Client({ spawn });

      const result = await client.ping();

      expect(result).toBe(true);
      expect(spawn.calls).toHaveLength(1);
      const args = spawn.calls[0].slice(1);
      expect(args).toContain("session");
      expect(args).toContain("list");
    });

    it("returns false when it2 exits non-zero", async () => {
      const spawn = mockSpawn({ exitCode: 1, stderr: "not running" });
      const client = new It2Client({ spawn });

      const result = await client.ping();

      expect(result).toBe(false);
    });

    it("returns false when it2 binary is not found", async () => {
      const spawn = mockSpawn({ throws: true });
      const client = new It2Client({ spawn });

      const result = await client.ping();

      expect(result).toBe(false);
    });
  });

  describe("createTab", () => {
    it("calls it2 tab new and resolves session ID from before/after diff", async () => {
      const beforeJson = JSON.stringify([
        { id: "existing-1", name: "", tab_id: "w0t0" },
      ]);
      const afterJson = JSON.stringify([
        { id: "existing-1", name: "", tab_id: "w0t0" },
        { id: "session-id-abc123", name: "", tab_id: "w0t1" },
      ]);

      let callIndex = 0;
      const calls: string[][] = [];
      const spawn = ((cmd: string[]) => {
        calls.push(cmd);
        const idx = callIndex++;
        const result =
          idx === 0
            ? { stdout: beforeJson, exitCode: 0 }
            : idx === 1
              ? { stdout: "Created new tab: w0t1\n", exitCode: 0 }
              : { stdout: afterJson, exitCode: 0 };

        return {
          stdout: new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(result.stdout));
              controller.close();
            },
          }),
          stderr: new ReadableStream({
            start(controller) {
              controller.close();
            },
          }),
          exited: Promise.resolve(result.exitCode),
        };
      }) as SpawnFn & { calls: string[][] };
      spawn.calls = calls;

      const client = new It2Client({ spawn });

      const sessionId = await client.createTab();

      expect(sessionId).toBe("session-id-abc123");
      expect(calls).toHaveLength(3);
      expect(calls[0].slice(1)).toContain("session");
      expect(calls[1].slice(1)).toContain("tab");
      expect(calls[1].slice(1)).toContain("new");
      expect(calls[2].slice(1)).toContain("session");
    });

    it("throws It2NotInstalledError when binary is missing", async () => {
      const spawn = mockSpawn({ throws: true });
      const client = new It2Client({ spawn });

      expect(client.createTab()).rejects.toBeInstanceOf(It2NotInstalledError);
    });
  });

  describe("splitPane", () => {
    it("calls it2 session split with -v and -s flags", async () => {
      const spawn = mockSpawn({
        exitCode: 0,
        stdout: "Created new pane: new-session-id-xyz\n",
      });
      const client = new It2Client({ spawn });

      const paneId = await client.splitPane("parent-session-id");

      expect(paneId).toBe("new-session-id-xyz");
      expect(spawn.calls).toHaveLength(1);
      const args = spawn.calls[0].slice(1);
      expect(args).toContain("session");
      expect(args).toContain("split");
      expect(args).toContain("-v");
      expect(args).toContain("-s");
      expect(args).toContain("parent-session-id");
    });

    it("throws It2NotInstalledError when binary is missing", async () => {
      const spawn = mockSpawn({ throws: true });
      const client = new It2Client({ spawn });

      expect(client.splitPane("sess")).rejects.toBeInstanceOf(
        It2NotInstalledError,
      );
    });
  });

  describe("closeSession", () => {
    it("calls it2 session close with -f and -s flags", async () => {
      const spawn = mockSpawn({ exitCode: 0, stdout: "OK\n" });
      const client = new It2Client({ spawn });

      await client.closeSession("session-id-123");

      expect(spawn.calls).toHaveLength(1);
      const args = spawn.calls[0].slice(1);
      expect(args).toContain("session");
      expect(args).toContain("close");
      expect(args).toContain("-f");
      expect(args).toContain("-s");
      expect(args).toContain("session-id-123");
    });

    it("handles already-closed session gracefully (not found)", async () => {
      const spawn = mockSpawn({
        exitCode: 1,
        stderr: "not found: session does not exist",
      });
      const client = new It2Client({ spawn });

      // Should not throw — idempotent close
      await client.closeSession("already-gone");
    });

    it("throws It2NotInstalledError when binary is missing", async () => {
      const spawn = mockSpawn({ throws: true });
      const client = new It2Client({ spawn });

      expect(client.closeSession("sess")).rejects.toBeInstanceOf(
        It2NotInstalledError,
      );
    });

    it("throws It2ConnectionError when iTerm2 not running", async () => {
      const spawn = mockSpawn({
        exitCode: 1,
        stderr: "connection refused",
      });
      const client = new It2Client({ spawn });

      expect(client.closeSession("sess")).rejects.toBeInstanceOf(
        It2ConnectionError,
      );
    });

    it("throws on unexpected non-zero exit", async () => {
      const spawn = mockSpawn({
        exitCode: 2,
        stderr: "internal error",
      });
      const client = new It2Client({ spawn });

      expect(client.closeSession("sess")).rejects.toBeInstanceOf(It2Error);
    });
  });

  describe("sendText", () => {
    it("calls it2 session run with -s flag and text", async () => {
      const spawn = mockSpawn({ exitCode: 0, stdout: "" });
      const client = new It2Client({ spawn });

      await client.sendText("session-abc", "echo hello");

      expect(spawn.calls).toHaveLength(1);
      const args = spawn.calls[0].slice(1);
      expect(args).toContain("session");
      expect(args).toContain("run");
      expect(args).toContain("-s");
      expect(args).toContain("session-abc");
      expect(args).toContain("echo hello");
    });
  });

  describe("setBadge", () => {
    it("calls it2 session set-var with user.badge", async () => {
      const spawn = mockSpawn({ exitCode: 0, stdout: "" });
      const client = new It2Client({ spawn });

      await client.setBadge("session-abc", "FAIL");

      expect(spawn.calls).toHaveLength(1);
      const args = spawn.calls[0].slice(1);
      expect(args).toContain("session");
      expect(args).toContain("set-var");
      expect(args).toContain("-s");
      expect(args).toContain("session-abc");
      expect(args).toContain("user.badge");
      expect(args).toContain("FAIL");
    });
  });

  describe("setTabTitle", () => {
    it("calls it2 session set-name", async () => {
      const spawn = mockSpawn({ exitCode: 0, stdout: "" });
      const client = new It2Client({ spawn });

      await client.setTabTitle("session-abc", "my-title");

      expect(spawn.calls).toHaveLength(1);
      const args = spawn.calls[0].slice(1);
      expect(args).toContain("session");
      expect(args).toContain("set-name");
      expect(args).toContain("-s");
      expect(args).toContain("session-abc");
      expect(args).toContain("my-title");
    });
  });

  describe("binary not found", () => {
    it("throws It2NotInstalledError when spawn fails with ENOENT", async () => {
      const spawn = mockSpawn({ throws: true });
      const client = new It2Client({ spawn });

      expect(client.createTab()).rejects.toBeInstanceOf(It2NotInstalledError);
    });
  });
});
