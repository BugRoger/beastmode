/**
 * Typed client for the cmux terminal multiplexer CLI.
 *
 * Communicates with cmux by shelling out to the `cmux` binary with `--json`
 * for structured responses. No direct socket programming.
 */

// ---------------------------------------------------------------------------
// Error classes
// ---------------------------------------------------------------------------

export class CmuxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CmuxError";
  }
}

export class CmuxConnectionError extends CmuxError {
  constructor(message: string = "cmux is not running") {
    super(message);
    this.name = "CmuxConnectionError";
  }
}

export class CmuxTimeoutError extends CmuxError {
  constructor(message: string = "cmux command timed out") {
    super(message);
    this.name = "CmuxTimeoutError";
  }
}

export class CmuxProtocolError extends CmuxError {
  constructor(message: string) {
    super(message);
    this.name = "CmuxProtocolError";
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CmuxWorkspace {
  name: string;
  surfaces: string[];
}

export interface CmuxSurface {
  name: string;
  workspace: string;
  pid?: number;
}

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface ICmuxClient {
  ping(): Promise<boolean>;
  createWorkspace(name: string): Promise<CmuxWorkspace>;
  listWorkspaces(): Promise<CmuxWorkspace[]>;
  closeWorkspace(name: string): Promise<void>;
  createSurface(workspace: string, name: string): Promise<CmuxSurface>;
  sendText(workspace: string, surface: string, text: string): Promise<void>;
  closeSurface(workspace: string, surface: string): Promise<void>;
  getSurface(workspace: string, surface: string): Promise<CmuxSurface | null>;
  notify(title: string, body: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Spawn function type — injectable for testing
// ---------------------------------------------------------------------------

/**
 * Spawn function signature matching the subset of Bun.spawn we need.
 * Accepts [cmd, ...args] and returns an object with stdout, stderr streams
 * and an exited promise.
 */
export type SpawnFn = (
  cmd: string[],
  opts: { stdout: "pipe"; stderr: "pipe" },
) => {
  stdout: ReadableStream | null;
  stderr: ReadableStream | null;
  exited: Promise<number>;
};

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export class CmuxClient implements ICmuxClient {
  private timeoutMs: number;
  private spawnFn: SpawnFn;

  constructor(opts?: { timeoutMs?: number; spawn?: SpawnFn }) {
    this.timeoutMs = opts?.timeoutMs ?? 10_000;
    this.spawnFn =
      opts?.spawn ?? ((cmd, spawnOpts) => Bun.spawn(cmd, spawnOpts));
  }

  async ping(): Promise<boolean> {
    try {
      await this.exec(["ping"]);
      return true;
    } catch {
      return false;
    }
  }

  async createWorkspace(name: string): Promise<CmuxWorkspace> {
    const result = await this.exec(["workspace", "new", name, "--json"]);
    return this.parseJson<CmuxWorkspace>(result);
  }

  async listWorkspaces(): Promise<CmuxWorkspace[]> {
    const result = await this.exec(["workspace", "list", "--json"]);
    return this.parseJson<CmuxWorkspace[]>(result);
  }

  async closeWorkspace(name: string): Promise<void> {
    try {
      await this.exec(["workspace", "close", name]);
    } catch (err) {
      if (err instanceof CmuxConnectionError) throw err;
      // "not found" means already closed — that is fine
      if (err instanceof CmuxError && /not found/i.test(err.message)) {
        return;
      }
      throw err;
    }
  }

  async createSurface(workspace: string, name: string): Promise<CmuxSurface> {
    const result = await this.exec([
      "surface",
      "new",
      "--workspace",
      workspace,
      "--name",
      name,
      "--json",
    ]);
    return this.parseJson<CmuxSurface>(result);
  }

  async sendText(
    workspace: string,
    surface: string,
    text: string,
  ): Promise<void> {
    await this.exec([
      "surface",
      "send-text",
      "--workspace",
      workspace,
      "--surface",
      surface,
      "--text",
      text,
    ]);
  }

  async closeSurface(workspace: string, surface: string): Promise<void> {
    try {
      await this.exec([
        "surface",
        "close",
        "--workspace",
        workspace,
        "--surface",
        surface,
      ]);
    } catch (err) {
      if (err instanceof CmuxConnectionError) throw err;
      // "not found" means already closed — that is fine
      if (err instanceof CmuxError && /not found/i.test(err.message)) {
        return;
      }
      throw err;
    }
  }

  async getSurface(
    workspace: string,
    surface: string,
  ): Promise<CmuxSurface | null> {
    try {
      const result = await this.exec([
        "surface",
        "get",
        "--workspace",
        workspace,
        "--surface",
        surface,
        "--json",
      ]);
      return this.parseJson<CmuxSurface>(result);
    } catch {
      return null;
    }
  }

  async notify(title: string, body: string): Promise<void> {
    await this.exec(["notify", "--title", title, "--body", body]);
  }

  private async exec(args: string[]): Promise<string> {
    let proc: ReturnType<SpawnFn>;
    try {
      proc = this.spawnFn(["cmux", ...args], {
        stdout: "pipe",
        stderr: "pipe",
      });
    } catch {
      throw new CmuxConnectionError("cmux binary not found");
    }

    const timeout = setTimeout(() => {
      // proc may have a kill method (real Bun.spawn) or not (mock)
      if ("kill" in proc && typeof (proc as { kill?: () => void }).kill === "function") {
        (proc as { kill: () => void }).kill();
      }
    }, this.timeoutMs);

    try {
      const [stdout, stderr] = await Promise.all([
        proc.stdout
          ? new Response(proc.stdout as ReadableStream).text()
          : Promise.resolve(""),
        proc.stderr
          ? new Response(proc.stderr as ReadableStream).text()
          : Promise.resolve(""),
      ]);

      const exitCode = await proc.exited;
      clearTimeout(timeout);

      if (exitCode !== 0) {
        const msg =
          stderr.trim() ||
          stdout.trim() ||
          `cmux exited with code ${exitCode}`;
        if (msg.includes("not running") || msg.includes("connection refused")) {
          throw new CmuxConnectionError(msg);
        }
        throw new CmuxError(msg);
      }

      return stdout;
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof CmuxError) throw err;
      // Binary not found or spawn failure
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        throw new CmuxConnectionError("cmux binary not found");
      }
      throw new CmuxError((err as Error).message);
    }
  }

  private parseJson<T>(raw: string): T {
    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new CmuxProtocolError(
        `Invalid JSON from cmux: ${raw.slice(0, 200)}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Availability helper
// ---------------------------------------------------------------------------

/** Check if cmux is available by attempting a ping. */
export async function cmuxAvailable(): Promise<boolean> {
  const client = new CmuxClient({ timeoutMs: 3_000 });
  return client.ping();
}
