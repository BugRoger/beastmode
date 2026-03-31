/**
 * Typed client for the it2 CLI (iTerm2's Python-based CLI tool).
 *
 * Communicates with iTerm2 by shelling out to the `it2` binary.
 * Responses are typically plain text or JSON; parsed into typed results.
 */

// ---------------------------------------------------------------------------
// Error classes
// ---------------------------------------------------------------------------

export class It2Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = "It2Error";
  }
}

export class It2ConnectionError extends It2Error {
  constructor(message: string = "it2 is not available") {
    super(message);
    this.name = "It2ConnectionError";
  }
}

export class It2NotInstalledError extends It2Error {
  constructor(
    message: string = "it2 CLI not installed. Install via: pip install iterm2",
  ) {
    super(message);
    this.name = "It2NotInstalledError";
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface It2Session {
  id: string;
  name: string;
  tabId: string;
  isAlive: boolean;
}

export interface It2Tab {
  id: string;
  windowId: string;
  index: number;
  sessions: number;
  isActive: boolean;
}

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface IIt2Client {
  ping(): Promise<boolean>;
  listSessions(): Promise<It2Session[]>;
  listTabs(): Promise<It2Tab[]>;
  createTab(): Promise<string>;
  splitPane(sessionId: string): Promise<string>;
  closeSession(sessionId: string): Promise<void>;
  sendText(sessionId: string, text: string): Promise<void>;
  setBadge(sessionId: string, text: string): Promise<void>;
  setTabTitle(sessionId: string, title: string): Promise<void>;
  getSessionProperty(sessionId: string, property: string): Promise<string>;
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

/** Resolve the it2 binary path. Checks PATH via which(1). */
function resolveIt2Binary(): string {
  try {
    const proc = Bun.spawnSync(["which", "it2"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    if (proc.exitCode === 0) return "it2";
  } catch {
    // which not available or failed
  }
  return "it2"; // let it fail at exec time
}

let _resolvedBinary: string | null = null;
function it2Binary(): string {
  if (_resolvedBinary === null) _resolvedBinary = resolveIt2Binary();
  return _resolvedBinary;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export class It2Client implements IIt2Client {
  private timeoutMs: number;
  private spawnFn: SpawnFn;

  constructor(opts?: { timeoutMs?: number; spawn?: SpawnFn }) {
    this.timeoutMs = opts?.timeoutMs ?? 10_000;
    this.spawnFn =
      opts?.spawn ?? ((cmd, spawnOpts) => Bun.spawn(cmd, spawnOpts));
  }

  async ping(): Promise<boolean> {
    try {
      await this.exec(["session", "list"]);
      return true;
    } catch {
      return false;
    }
  }

  async listSessions(): Promise<It2Session[]> {
    try {
      const stdout = await this.exec(["session", "list", "--json"]);
      const parsed = JSON.parse(stdout);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((s: Record<string, unknown>) => ({
        id: String(s.id ?? ""),
        name: String(s.name ?? ""),
        tabId: String(s.tab_id ?? ""),
        isAlive: true, // sessions returned by list are alive
      }));
    } catch {
      return [];
    }
  }

  async listTabs(): Promise<It2Tab[]> {
    try {
      const stdout = await this.exec(["tab", "list", "--json"]);
      const parsed = JSON.parse(stdout);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((t: Record<string, unknown>) => ({
        id: String(t.id ?? ""),
        windowId: String(t.window_id ?? ""),
        index: Number(t.index ?? 0),
        sessions: Number(t.sessions ?? 0),
        isActive: Boolean(t.is_active ?? false),
      }));
    } catch {
      return [];
    }
  }

  async createTab(): Promise<string> {
    // Snapshot sessions before creating tab
    const before = await this.listSessions();
    const beforeIds = new Set(before.map((s) => s.id));

    // Create the tab
    const stdout = await this.exec(["tab", "new"]);

    // Parse the tab ID from "Created new tab: {tabId}"
    const match = stdout.match(/Created new tab:\s*(\S+)/);
    const tabId = match?.[1];
    if (!tabId) {
      throw new It2Error(`Failed to parse tab ID from: ${stdout.trim()}`);
    }

    // Find the new session in this tab
    const after = await this.listSessions();
    const newSession = after.find(
      (s) => s.tabId === tabId && !beforeIds.has(s.id),
    );
    if (!newSession) {
      throw new It2Error(
        `Created tab ${tabId} but could not find its session`,
      );
    }

    return newSession.id;
  }

  async splitPane(sessionId: string): Promise<string> {
    const stdout = await this.exec([
      "session",
      "split",
      "-v",
      "-s",
      sessionId,
    ]);
    // Parse "Created new pane: {sessionId}"
    const match = stdout.match(/Created new pane:\s*(\S+)/);
    if (match) return match[1];
    return stdout.trim();
  }

  async closeSession(sessionId: string): Promise<void> {
    try {
      await this.exec(["session", "close", "-f", "-s", sessionId]);
    } catch (err) {
      if (err instanceof It2ConnectionError) throw err;
      if (err instanceof It2Error && /not.found/i.test(err.message)) return;
      throw err;
    }
  }

  async sendText(sessionId: string, text: string): Promise<void> {
    await this.exec(["session", "run", "-s", sessionId, text]);
  }

  async setBadge(sessionId: string, text: string): Promise<void> {
    await this.exec([
      "session",
      "set-var",
      "-s",
      sessionId,
      "user.badge",
      text,
    ]);
  }

  async setTabTitle(sessionId: string, title: string): Promise<void> {
    await this.exec(["session", "set-name", "-s", sessionId, title]);
  }

  async getSessionProperty(
    sessionId: string,
    property: string,
  ): Promise<string> {
    const stdout = await this.exec([
      "session",
      "get-var",
      "-s",
      sessionId,
      property,
    ]);
    return stdout.trim();
  }

  private async exec(args: string[]): Promise<string> {
    let proc: ReturnType<SpawnFn>;
    try {
      proc = this.spawnFn([it2Binary(), ...args], {
        stdout: "pipe",
        stderr: "pipe",
      });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        throw new It2NotInstalledError();
      }
      throw new It2NotInstalledError("it2 binary not found");
    }

    const timeout = setTimeout(() => {
      if (
        "kill" in proc &&
        typeof (proc as { kill?: () => void }).kill === "function"
      ) {
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
          `it2 exited with code ${exitCode}`;
        if (
          msg.includes("not running") ||
          msg.includes("connection refused") ||
          msg.includes("Connection refused") ||
          msg.includes("not available")
        ) {
          throw new It2ConnectionError(msg);
        }
        if (msg.includes("not installed") || msg.includes("No such file")) {
          throw new It2NotInstalledError(msg);
        }
        throw new It2Error(msg);
      }

      return stdout;
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof It2Error) throw err;
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        throw new It2NotInstalledError();
      }
      throw new It2Error((err as Error).message);
    }
  }
}

// ---------------------------------------------------------------------------
// Availability helper
// ---------------------------------------------------------------------------

/** Check if it2 is available by attempting to list sessions. */
export async function it2Available(): Promise<boolean> {
  const client = new It2Client({ timeoutMs: 3_000 });
  return client.ping();
}

// ---------------------------------------------------------------------------
// Environment detection helper
// ---------------------------------------------------------------------------

/** Check if we are running inside iTerm2. */
export function isInsideITerm2(): boolean {
  return !!(
    process.env.ITERM_SESSION_ID && process.env.TERM_PROGRAM === "iTerm.app"
  );
}
