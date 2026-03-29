/**
 * Typed client for the cmux terminal multiplexer CLI.
 *
 * Communicates with cmux by shelling out to the `cmux` binary.
 * Responses are plain text in "OK ref" format; parsed into typed results.
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
// Binary resolution
// ---------------------------------------------------------------------------

const CMUX_APP_BIN = "/Applications/cmux.app/Contents/Resources/bin/cmux";

/** Resolve the cmux binary path. Checks PATH first, then the macOS app bundle. */
function resolveCmuxBinary(): string {
  try {
    // which(1) equivalent — if cmux is on PATH, Bun.spawn will find it
    const proc = Bun.spawnSync(["which", "cmux"], { stdout: "pipe", stderr: "pipe" });
    if (proc.exitCode === 0) return "cmux";
  } catch {
    // which not available or failed
  }
  // Fall back to known macOS app bundle location
  try {
    const fs = require("fs");
    if (fs.existsSync(CMUX_APP_BIN)) return CMUX_APP_BIN;
  } catch {
    // fs not available
  }
  return "cmux"; // let it fail at exec time with a clear error
}

let _resolvedBinary: string | null = null;
function cmuxBinary(): string {
  if (_resolvedBinary === null) _resolvedBinary = resolveCmuxBinary();
  return _resolvedBinary;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Parse a workspace ref from cmux output.
 * e.g. "OK workspace:4" -> "workspace:4"
 */
function parseRef(stdout: string, prefix: string): string | null {
  const match = stdout.match(new RegExp(`${prefix}:\\d+`));
  return match ? match[0] : null;
}

/**
 * Parse list-workspaces output into workspace names and refs.
 *
 * Output format (one workspace per line):
 *   "* workspace:1  ~  [selected]"
 *   "  workspace:4  bm-my-epic"
 */
function parseWorkspaceList(stdout: string): Array<{ ref: string; name: string }> {
  const results: Array<{ ref: string; name: string }> = [];
  for (const line of stdout.split("\n")) {
    const trimmed = line.replace(/^\*?\s*/, "").trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(workspace:\d+)\s+(.+?)(?:\s+\[.*\])?$/);
    if (match) {
      results.push({ ref: match[1], name: match[2].trim() });
    }
  }
  return results;
}

/**
 * Parse tree output to extract surfaces for a workspace.
 *
 * Surface lines look like:
 *   '        └── surface surface:5 [terminal] "plan" [selected]'
 */
function parseSurfaces(treeOutput: string): Array<{ ref: string; title: string }> {
  const results: Array<{ ref: string; title: string }> = [];
  for (const line of treeOutput.split("\n")) {
    const match = line.match(/(surface:\d+)\s+\[terminal\]\s+"([^"]*)"/);
    if (match) {
      results.push({ ref: match[1], title: match[2] });
    }
  }
  return results;
}

export class CmuxClient implements ICmuxClient {
  private timeoutMs: number;
  private spawnFn: SpawnFn;
  /** Maps workspace names to their cmux refs (e.g. "bm-my-epic" -> "workspace:4") */
  private workspaceRefs = new Map<string, string>();
  /** Maps surface names to their cmux refs (e.g. "plan" -> "surface:5") */
  private surfaceRefs = new Map<string, string>();

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
    const stdout = await this.exec(["new-workspace", "--name", name]);
    const ref = parseRef(stdout, "workspace");
    if (ref) this.workspaceRefs.set(name, ref);
    return { name, surfaces: [] };
  }

  async listWorkspaces(): Promise<CmuxWorkspace[]> {
    const stdout = await this.exec(["list-workspaces"]);
    const workspaces = parseWorkspaceList(stdout);

    // Cache refs
    for (const ws of workspaces) {
      this.workspaceRefs.set(ws.name, ws.ref);
    }

    return workspaces.map((ws) => ({ name: ws.name, surfaces: [] }));
  }

  async closeWorkspace(name: string): Promise<void> {
    const ref = this.workspaceRefs.get(name) ?? name;
    try {
      await this.exec(["close-workspace", "--workspace", ref]);
    } catch (err) {
      if (err instanceof CmuxConnectionError) throw err;
      if (err instanceof CmuxError && /not.found/i.test(err.message)) return;
      throw err;
    }
    this.workspaceRefs.delete(name);
  }

  async createSurface(workspace: string, name: string): Promise<CmuxSurface> {
    const wsRef = this.workspaceRefs.get(workspace) ?? workspace;
    const stdout = await this.exec(["new-surface", "--workspace", wsRef]);
    const surfaceRef = parseRef(stdout, "surface");

    // Rename the tab to the desired name
    if (surfaceRef) {
      this.surfaceRefs.set(`${workspace}/${name}`, surfaceRef);
      try {
        await this.exec(["rename-tab", "--workspace", wsRef, "--surface", surfaceRef, name]);
      } catch {
        // Best-effort rename
      }
    }

    return { name, workspace };
  }

  async sendText(
    workspace: string,
    surface: string,
    text: string,
  ): Promise<void> {
    const wsRef = this.workspaceRefs.get(workspace) ?? workspace;
    const surfRef = this.surfaceRefs.get(`${workspace}/${surface}`) ?? surface;
    await this.exec(["send", "--workspace", wsRef, "--surface", surfRef, text]);
    await this.exec(["send-key", "--workspace", wsRef, "--surface", surfRef, "enter"]);
  }

  async closeSurface(workspace: string, surface: string): Promise<void> {
    const wsRef = this.workspaceRefs.get(workspace) ?? workspace;
    const surfRef = this.surfaceRefs.get(`${workspace}/${surface}`) ?? surface;
    try {
      await this.exec(["close-surface", "--workspace", wsRef, "--surface", surfRef]);
    } catch (err) {
      if (err instanceof CmuxConnectionError) throw err;
      if (err instanceof CmuxError && /not.found/i.test(err.message)) return;
      throw err;
    }
    this.surfaceRefs.delete(`${workspace}/${surface}`);
  }

  async getSurface(
    workspace: string,
    surface: string,
  ): Promise<CmuxSurface | null> {
    const wsRef = this.workspaceRefs.get(workspace) ?? workspace;
    try {
      const stdout = await this.exec(["tree", "--workspace", wsRef]);
      const surfaces = parseSurfaces(stdout);
      const found = surfaces.find((s) => s.title === surface);
      if (found) {
        return { name: surface, workspace };
      }
      return null;
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
      proc = this.spawnFn([cmuxBinary(), ...args], {
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
        if (msg.includes("Failed to write to socket") || msg.includes("not running") || msg.includes("connection refused")) {
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
}

// ---------------------------------------------------------------------------
// Availability helper
// ---------------------------------------------------------------------------

/** Check if cmux is available by attempting a ping. */
export async function cmuxAvailable(): Promise<boolean> {
  const client = new CmuxClient({ timeoutMs: 3_000 });
  return client.ping();
}
