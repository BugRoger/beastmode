import { describe, it, expect } from "bun:test";
import {
  CmuxClient,
  CmuxConnectionError,
  CmuxError,
  type SpawnFn,
} from "../src/cmux-client";

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
      throw new Error("spawn ENOENT");
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

describe("CmuxClient", () => {
  describe("ping", () => {
    it("returns true when cmux responds with exit 0", async () => {
      const spawn = mockSpawn({ stdout: "PONG\n", exitCode: 0 });
      const client = new CmuxClient({ spawn });

      const result = await client.ping();

      expect(result).toBe(true);
      expect(spawn.calls).toHaveLength(1);
      // Binary may be resolved path or "cmux" — just check the command arg
      expect(spawn.calls[0].slice(-1)).toEqual(["ping"]);
    });

    it("returns false when cmux exits non-zero", async () => {
      const spawn = mockSpawn({ exitCode: 1, stderr: "connection refused" });
      const client = new CmuxClient({ spawn });

      const result = await client.ping();

      expect(result).toBe(false);
    });

    it("returns false when cmux binary is not found (no throw)", async () => {
      const spawn = mockSpawn({ throws: true });
      const client = new CmuxClient({ spawn });

      const result = await client.ping();

      expect(result).toBe(false);
    });
  });

  describe("closeWorkspace", () => {
    it("calls cmux close-workspace with --workspace flag", async () => {
      const spawn = mockSpawn({ exitCode: 0, stdout: "OK workspace:4\n" });
      const client = new CmuxClient({ spawn });

      await client.closeWorkspace("my-workspace");

      expect(spawn.calls).toHaveLength(1);
      // Check command args (skip binary path)
      const args = spawn.calls[0].slice(1);
      expect(args).toEqual([
        "close-workspace",
        "--workspace",
        "my-workspace",
      ]);
    });

    it("handles already-closed workspace gracefully (not found)", async () => {
      const spawn = mockSpawn({
        exitCode: 1,
        stderr: "not_found: Workspace not found",
      });
      const client = new CmuxClient({ spawn });

      // Should not throw
      await client.closeWorkspace("already-gone");
    });

    it("throws CmuxConnectionError when binary is missing", async () => {
      const spawn = mockSpawn({ throws: true });
      const client = new CmuxClient({ spawn });

      expect(client.closeWorkspace("ws")).rejects.toBeInstanceOf(
        CmuxConnectionError,
      );
    });

    it("throws on unexpected non-zero exit", async () => {
      const spawn = mockSpawn({
        exitCode: 2,
        stderr: "internal error: disk full",
      });
      const client = new CmuxClient({ spawn });

      expect(client.closeWorkspace("ws")).rejects.toBeInstanceOf(CmuxError);
    });
  });

  describe("closeSurface", () => {
    it("calls cmux close-surface with correct flags", async () => {
      const spawn = mockSpawn({ exitCode: 0, stdout: "OK\n" });
      const client = new CmuxClient({ spawn });

      await client.closeSurface("my-workspace", "my-surface");

      expect(spawn.calls).toHaveLength(1);
      const args = spawn.calls[0].slice(1);
      expect(args).toEqual([
        "close-surface",
        "--workspace",
        "my-workspace",
        "--surface",
        "my-surface",
      ]);
    });

    it("handles already-closed surface gracefully (not found)", async () => {
      const spawn = mockSpawn({
        exitCode: 1,
        stderr: "not_found: Surface not found",
      });
      const client = new CmuxClient({ spawn });

      // Should not throw
      await client.closeSurface("ws", "already-gone");
    });

    it("throws CmuxConnectionError when binary is missing", async () => {
      const spawn = mockSpawn({ throws: true });
      const client = new CmuxClient({ spawn });

      expect(client.closeSurface("ws", "s")).rejects.toBeInstanceOf(
        CmuxConnectionError,
      );
    });

    it("throws on unexpected non-zero exit", async () => {
      const spawn = mockSpawn({
        exitCode: 2,
        stderr: "permission denied",
      });
      const client = new CmuxClient({ spawn });

      expect(client.closeSurface("ws", "s")).rejects.toBeInstanceOf(CmuxError);
    });
  });

  describe("binary not found", () => {
    it("throws CmuxConnectionError when spawn fails", async () => {
      const spawn = mockSpawn({ throws: true });
      const client = new CmuxClient({ spawn });

      // Use createWorkspace as a representative method that doesn't swallow errors
      expect(client.createWorkspace("test")).rejects.toBeInstanceOf(
        CmuxConnectionError,
      );
    });
  });
});
