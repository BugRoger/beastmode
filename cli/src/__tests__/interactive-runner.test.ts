import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import type { InteractiveRunnerOptions } from "../dispatch/factory";

describe("interactive-runner", () => {
  let spawnSpy: ReturnType<typeof vi.spyOn>;
  let resolveExited: (code: number) => void;

  beforeEach(() => {
    spawnSpy = vi.spyOn(Bun, "spawn").mockImplementation(
      (_cmd: any, _opts?: any) => {
        let exitResolve: (code: number) => void;
        const exitedPromise = new Promise<number>((resolve) => {
          exitResolve = resolve;
        });
        resolveExited = exitResolve!;

        return {
          exited: exitedPromise,
          kill: vi.fn(() => {}),
          pid: 12345,
          stdin: null,
          stdout: null,
          stderr: null,
        } as any;
      },
    );
  });

  afterEach(() => {
    spawnSpy.mockRestore();
  });

  // --- Prompt construction ---
  describe("prompt construction", () => {
    test("design phase constructs /beastmode:design <topic>", async () => {
      const { runInteractive } = await import(
        "../dispatch/factory"
      );
      const promise = runInteractive({
        phase: "design",
        args: ["my-topic"],
        cwd: "/test",
      });
      resolveExited(0);
      await promise;

      expect(spawnSpy).toHaveBeenCalledTimes(1);
      const [cmd] = spawnSpy.mock.calls[0];
      expect(cmd).toEqual([
        "claude",
        "--dangerously-skip-permissions",
        "--",
        "/beastmode:design my-topic",
      ]);
    });

    test("plan phase constructs /beastmode:plan <slug>", async () => {
      const { runInteractive } = await import(
        "../dispatch/factory"
      );
      const promise = runInteractive({
        phase: "plan",
        args: ["my-epic"],
        cwd: "/test",
      });
      resolveExited(0);
      await promise;

      const [cmd] = spawnSpy.mock.calls[0];
      expect(cmd).toEqual([
        "claude",
        "--dangerously-skip-permissions",
        "--",
        "/beastmode:plan my-epic",
      ]);
    });

    test("implement phase constructs /beastmode:implement <epic> <feature>", async () => {
      const { runInteractive } = await import(
        "../dispatch/factory"
      );
      const promise = runInteractive({
        phase: "implement",
        args: ["my-epic", "auth-module"],
        cwd: "/test",
      });
      resolveExited(0);
      await promise;

      const [cmd] = spawnSpy.mock.calls[0];
      expect(cmd).toEqual([
        "claude",
        "--dangerously-skip-permissions",
        "--",
        "/beastmode:implement my-epic auth-module",
      ]);
    });

    test("validate phase constructs /beastmode:validate <slug>", async () => {
      const { runInteractive } = await import(
        "../dispatch/factory"
      );
      const promise = runInteractive({
        phase: "validate",
        args: ["my-epic"],
        cwd: "/test",
      });
      resolveExited(0);
      await promise;

      const [cmd] = spawnSpy.mock.calls[0];
      expect(cmd).toEqual([
        "claude",
        "--dangerously-skip-permissions",
        "--",
        "/beastmode:validate my-epic",
      ]);
    });

    test("release phase constructs /beastmode:release <slug>", async () => {
      const { runInteractive } = await import(
        "../dispatch/factory"
      );
      const promise = runInteractive({
        phase: "release",
        args: ["my-epic"],
        cwd: "/test",
      });
      resolveExited(0);
      await promise;

      const [cmd] = spawnSpy.mock.calls[0];
      expect(cmd).toEqual([
        "claude",
        "--dangerously-skip-permissions",
        "--",
        "/beastmode:release my-epic",
      ]);
    });
  });

  // --- Spawn options ---
  describe("spawn options", () => {
    test("passes cwd and inherited stdio", async () => {
      const { runInteractive } = await import(
        "../dispatch/factory"
      );
      const promise = runInteractive({
        phase: "design",
        args: ["topic"],
        cwd: "/my/project",
      });
      resolveExited(0);
      await promise;

      const [, opts] = spawnSpy.mock.calls[0];
      expect(opts.cwd).toBe("/my/project");
      expect(opts.stdin).toBe("inherit");
      expect(opts.stdout).toBe("inherit");
      expect(opts.stderr).toBe("inherit");
    });
  });

  // --- Exit status mapping ---
  describe("exit status", () => {
    test("exit code 0 returns success", async () => {
      const { runInteractive } = await import(
        "../dispatch/factory"
      );
      const promise = runInteractive({
        phase: "design",
        args: ["topic"],
        cwd: "/test",
      });
      resolveExited(0);
      const result = await promise;
      expect(result.exit_status).toBe("success");
    });

    test("non-zero exit code returns error", async () => {
      const { runInteractive } = await import(
        "../dispatch/factory"
      );
      const promise = runInteractive({
        phase: "plan",
        args: ["slug"],
        cwd: "/test",
      });
      resolveExited(1);
      const result = await promise;
      expect(result.exit_status).toBe("error");
    });

    test("returns duration_ms", async () => {
      const { runInteractive } = await import(
        "../dispatch/factory"
      );
      const promise = runInteractive({
        phase: "design",
        args: ["topic"],
        cwd: "/test",
      });
      resolveExited(0);
      const result = await promise;
      expect(result.duration_ms).toBeGreaterThanOrEqual(0);
    });

    test("session_id is null", async () => {
      const { runInteractive } = await import(
        "../dispatch/factory"
      );
      const promise = runInteractive({
        phase: "design",
        args: ["topic"],
        cwd: "/test",
      });
      resolveExited(0);
      const result = await promise;
      expect(result.session_id).toBeNull();
    });
  });

  // --- SIGINT handling ---
  describe("SIGINT handling", () => {
    test("SIGINT propagates kill to child process", async () => {
      const { runInteractive } = await import(
        "../dispatch/factory"
      );
      const promise = runInteractive({
        phase: "design",
        args: ["topic"],
        cwd: "/test",
      });

      // Simulate SIGINT
      process.emit("SIGINT" as any);

      // Resolve the process exit
      resolveExited(130);
      const result = await promise;

      // Verify kill was called on the child process
      const mockProc = spawnSpy.mock.results[0].value;
      expect(mockProc.kill).toHaveBeenCalledWith("SIGINT");
      expect(result.exit_status).toBe("cancelled");
    });

    test("SIGINT listener is cleaned up after completion", async () => {
      const { runInteractive } = await import(
        "../dispatch/factory"
      );
      const listenerCountBefore = process.listenerCount("SIGINT");

      const promise = runInteractive({
        phase: "design",
        args: ["topic"],
        cwd: "/test",
      });
      expect(process.listenerCount("SIGINT")).toBe(listenerCountBefore + 1);

      resolveExited(0);
      await promise;

      expect(process.listenerCount("SIGINT")).toBe(listenerCountBefore);
    });
  });
});
