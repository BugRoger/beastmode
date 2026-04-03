/**
 * Cmux integration — client, session factory, and reconciliation types.
 *
 * Communicates with cmux by shelling out to the `cmux` binary.
 * Creates one workspace per epic, one surface per dispatched phase/feature.
 * Completion is detected via fs.watch on *.output.json files.
 *
 * Merged from: cmux-client.ts, cmux-session.ts, cmux-types.ts
 */

import { watch, type FSWatcher } from "node:fs";
import { readFileSync, readdirSync, mkdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import type {
  SessionFactory,
  SessionCreateOpts,
  SessionHandle,
} from "./factory.js";
import type { SessionResult } from "./types.js";
import { filenameMatchesEpic } from "../artifacts/reader.js";
import * as worktree from "../git/worktree.js";

// ==========================================================================
// Error classes (from cmux-client.ts)
// ==========================================================================

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

// ==========================================================================
// Client types (from cmux-client.ts)
// ==========================================================================

export interface CmuxClientWorkspace {
  name: string;
  surfaces: string[];
}

export interface CmuxClientSurface {
  name: string;
  workspace: string;
  pid?: number;
}

// ==========================================================================
// Client interface (from cmux-client.ts)
// ==========================================================================

export interface ICmuxClient {
  ping(): Promise<boolean>;
  createWorkspace(name: string): Promise<CmuxClientWorkspace>;
  listWorkspaces(): Promise<CmuxClientWorkspace[]>;
  closeWorkspace(name: string): Promise<void>;
  createSurface(workspace: string, name: string): Promise<CmuxClientSurface>;
  sendText(workspace: string, surface: string, text: string): Promise<void>;
  closeSurface(workspace: string, surface: string): Promise<void>;
  getSurface(workspace: string, surface: string): Promise<CmuxClientSurface | null>;
  notify(title: string, body: string): Promise<void>;
}

// ==========================================================================
// Spawn function type (from cmux-client.ts)
// ==========================================================================

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

// ==========================================================================
// Binary resolution (from cmux-client.ts)
// ==========================================================================

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

// ==========================================================================
// Client implementation (from cmux-client.ts)
// ==========================================================================

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

  async createWorkspace(name: string): Promise<CmuxClientWorkspace> {
    const stdout = await this.exec(["new-workspace", "--name", name]);
    const ref = parseRef(stdout, "workspace");
    if (ref) this.workspaceRefs.set(name, ref);
    return { name, surfaces: [] };
  }

  async listWorkspaces(): Promise<CmuxClientWorkspace[]> {
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

  async createSurface(workspace: string, name: string): Promise<CmuxClientSurface> {
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
  ): Promise<CmuxClientSurface | null> {
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

// ==========================================================================
// Availability helper (from cmux-client.ts)
// ==========================================================================

/** Check if cmux is available by attempting a ping. */
export async function cmuxAvailable(): Promise<boolean> {
  const client = new CmuxClient({ timeoutMs: 3_000 });
  return client.ping();
}

// ==========================================================================
// Reconciliation types (from cmux-types.ts)
//
// These model the structured JSON responses from the cmux binary and
// the client interface consumed by reconciliation and strategy modules.
// ==========================================================================

/** A cmux surface within a workspace (reconciliation model). */
export interface CmuxSurface {
  /** Surface ID (cmux-assigned) */
  id: string;
  /** Surface title/name */
  title: string;
  /** Whether the surface process is still running */
  alive: boolean;
  /** Process ID of the surface shell, if alive */
  pid?: number;
}

/** A cmux workspace containing surfaces (reconciliation model). */
export interface CmuxWorkspace {
  /** Workspace ID (cmux-assigned) */
  id: string;
  /** Workspace name */
  name: string;
  /** Surfaces within this workspace */
  surfaces: CmuxSurface[];
}

/** Subset of CmuxClient methods needed by reconciliation. */
export interface CmuxClientLike {
  /** List all workspaces with their surfaces and process status. */
  listWorkspaces(): Promise<CmuxWorkspace[]>;
  /** Close a specific surface by ID. */
  closeSurface(surfaceId: string): Promise<void>;
  /** Close a workspace and all its surfaces by ID. */
  closeWorkspace(workspaceId: string): Promise<void>;
}

// ==========================================================================
// Session factory (from cmux-session.ts)
// ==========================================================================

/** Function that creates a worktree and returns its info. */
export type CreateWorktreeFn = (
  slug: string,
  opts: { cwd: string },
) => Promise<{ path: string }>;

export class CmuxSessionFactory implements SessionFactory {
  private client: ICmuxClient;
  private createWorktree: CreateWorktreeFn;
  private workspaces = new Map<string, string>(); // epicSlug -> workspace name
  private watchers = new Map<string, FSWatcher>(); // session id -> fs watcher
  private watchTimeoutMs: number;

  constructor(
    client: ICmuxClient,
    opts?: { watchTimeoutMs?: number; createWorktree?: CreateWorktreeFn },
  ) {
    this.client = client;
    this.createWorktree = opts?.createWorktree ?? ((slug, o) => worktree.create(slug, o));
    this.watchTimeoutMs = opts?.watchTimeoutMs ?? 3_600_000; // 60 min default
  }

  async create(opts: SessionCreateOpts): Promise<SessionHandle> {
    const { epicSlug, phase, featureSlug, args, projectRoot } = opts;

    // Record start time before any setup — used to filter stale output.json files
    const startTime = Date.now();

    // Derive workspace + surface names
    const workspaceName = `bm-${epicSlug}`;
    const surfaceName = featureSlug ? `${phase}-${featureSlug}` : phase;
    // Always use the epic-level worktree — no per-feature worktrees
    const worktreeSlug = epicSlug;
    const id = `cmux-${worktreeSlug}-${Date.now()}`;

    // Create worktree (idempotent — worktree.create handles existing)
    const wt = await this.createWorktree(worktreeSlug, { cwd: projectRoot });

    // Ensure workspace exists (idempotent)
    if (!this.workspaces.has(epicSlug)) {
      try {
        await this.client.createWorkspace(workspaceName);
      } catch {
        // Workspace may already exist — that's fine
      }
      this.workspaces.set(epicSlug, workspaceName);
    }

    // Create surface
    await this.client.createSurface(workspaceName, surfaceName);

    // cd into the worktree, then run the beastmode command
    const command = `cd ${wt.path} && beastmode ${phase} ${args.join(" ")}`;
    await this.client.sendText(workspaceName, surfaceName, command);

    // Derive artifact directory where output.json will appear
    const artifactDir = resolve(wt.path, ".beastmode", "artifacts", opts.phase);

    // Build the expected output.json suffix for this specific session.
    // Feature fan-out: match *-<epic>-<feature>.output.json
    // Single phase:    match *-<epic>.output.json
    const outputSuffix = featureSlug
      ? `-${epicSlug}-${featureSlug}.output.json`
      : `-${epicSlug}.output.json`;

    // Set up promise that resolves when output.json appears
    const promise = this.watchForMarker(id, artifactDir, startTime, opts.signal, outputSuffix, epicSlug);

    // Handle abort — close surface
    const onAbort = async () => {
      this.cleanupWatcher(id);
      try {
        await this.client.closeSurface(workspaceName, surfaceName);
      } catch {
        // best-effort
      }
    };
    opts.signal.addEventListener("abort", onAbort, { once: true });

    // Wrap promise to handle notifications
    const notifiedPromise = promise.then(async (result) => {
      opts.signal.removeEventListener("abort", onAbort);

      // Notify on failure or gate block
      if (!result.success) {
        try {
          await this.client.notify(
            `${epicSlug} — ${phase} failed`,
            `Exit code ${result.exitCode}`,
          );
        } catch {
          // best-effort notification
        }
      }

      // Clean up surface after completion
      try {
        await this.client.closeSurface(workspaceName, surfaceName);
      } catch {
        // best-effort
      }

      return result;
    });

    return { id, worktreeSlug, promise: notifiedPromise };
  }

  async cleanup(epicSlug: string): Promise<void> {
    const workspaceName = this.workspaces.get(epicSlug);
    if (!workspaceName) return;

    try {
      await this.client.closeWorkspace(workspaceName);
    } catch {
      // best-effort
    }
    this.workspaces.delete(epicSlug);
  }

  async setBadgeOnContainer(_epicSlug: string, _text: string): Promise<void> {
    // cmux has no native badge support — no-op
  }

  /** Watch for a specific output.json file in the artifact directory. */
  private watchForMarker(
    sessionId: string,
    artifactDir: string,
    startTime: number,
    signal: AbortSignal,
    outputSuffix: string,
    epicSlug: string,
  ): Promise<SessionResult> {
    return new Promise<SessionResult>((resolvePromise, rejectPromise) => {
      // Check if an output.json already exists that is newer than dispatch time.
      // Stale output.json files from previous runs must be ignored.
      const existing = this.findOutputJson(artifactDir, startTime, outputSuffix);
      if (existing) {
        const result = this.readOutputJson(existing, startTime);
        if (result) {
          resolvePromise(result);
          return;
        }
      }

      let watcher: FSWatcher;

      const cleanup = () => {
        this.cleanupWatcher(sessionId);
        clearTimeout(timeout);
      };

      try {
        // Ensure directory exists for watching
        mkdirSync(artifactDir, { recursive: true });

        watcher = watch(artifactDir, (_eventType, filename) => {
          if (filename && filename.endsWith(outputSuffix)) {
            const filePath = resolve(artifactDir, filename);
            // Verify the file was written after dispatch, not a stale leftover
            try {
              if (statSync(filePath).mtimeMs < startTime) return;
            } catch {
              return;
            }
            const result = this.readOutputJson(filePath, startTime);
            if (result) {
              cleanup();
              resolvePromise(result);
            }
          }
        });
        this.watchers.set(sessionId, watcher);
      } catch {
        // Fall back to polling
        const pollInterval = setInterval(() => {
          const found = this.findOutputJson(artifactDir, startTime, outputSuffix);
          if (found) {
            clearInterval(pollInterval);
            clearTimeout(timeout);
            const result = this.readOutputJson(found, startTime);
            resolvePromise(
              result ?? {
                success: false,
                exitCode: 1,
                durationMs: Date.now() - startTime,
              },
            );
          }
        }, 5_000);

        const timeout = setTimeout(() => {
          clearInterval(pollInterval);
          // Broad fallback: check for any epic-matching output (e.g. per-feature plan outputs)
          const broadMatch = this.findOutputJsonBroad(artifactDir, epicSlug, startTime);
          if (broadMatch) {
            const result = this.readOutputJson(broadMatch, startTime);
            if (result) { resolvePromise(result); return; }
          }
          resolvePromise({
            success: false,
            exitCode: 1,
            durationMs: Date.now() - startTime,
          });
        }, this.watchTimeoutMs);

        signal.addEventListener(
          "abort",
          () => {
            clearInterval(pollInterval);
            clearTimeout(timeout);
            rejectPromise(new DOMException("Aborted", "AbortError"));
          },
          { once: true },
        );

        return;
      }

      // Safety timeout
      const timeout = setTimeout(() => {
        cleanup();
        // Broad fallback: check for any epic-matching output (e.g. per-feature plan outputs)
        const broadMatch = this.findOutputJsonBroad(artifactDir, epicSlug, startTime);
        if (broadMatch) {
          const result = this.readOutputJson(broadMatch, startTime);
          if (result) { resolvePromise(result); return; }
        }
        resolvePromise({
          success: false,
          exitCode: 1,
          durationMs: Date.now() - startTime,
        });
      }, this.watchTimeoutMs);

      // Handle abort
      signal.addEventListener(
        "abort",
        () => {
          cleanup();
          rejectPromise(new DOMException("Aborted", "AbortError"));
        },
        { once: true },
      );
    });
  }

  /** Find an output.json matching the epic slug (broad match for timeout fallback). */
  private findOutputJsonBroad(dir: string, epicSlug: string, newerThanMs?: number): string | null {
    try {
      const files = readdirSync(dir) as string[];
      const candidates = files
        .filter((f: string) => f.endsWith(".output.json") && filenameMatchesEpic(f, epicSlug))
        .map((f: string) => resolve(dir, f))
        .filter((fullPath: string) => {
          if (newerThanMs === undefined) return true;
          try {
            return statSync(fullPath).mtimeMs >= newerThanMs;
          } catch {
            return false;
          }
        })
        .sort();
      return candidates.length > 0 ? candidates[candidates.length - 1] : null;
    } catch {
      return null;
    }
  }

  /** Find an output.json file in the artifact directory matching the suffix. */
  private findOutputJson(dir: string, newerThanMs?: number, suffix?: string): string | null {
    try {
      const files = readdirSync(dir) as string[];
      const matchSuffix = suffix ?? ".output.json";
      const candidates = files
        .filter((f: string) => f.endsWith(matchSuffix))
        .map((f: string) => resolve(dir, f))
        .filter((fullPath: string) => {
          if (newerThanMs === undefined) return true;
          try {
            return statSync(fullPath).mtimeMs >= newerThanMs;
          } catch {
            return false;
          }
        })
        .sort();
      return candidates.length > 0 ? candidates[candidates.length - 1] : null;
    } catch {
      return null;
    }
  }

  /** Read and parse a PhaseOutput JSON file. */
  private readOutputJson(
    filePath: string,
    startTime: number,
  ): SessionResult | null {
    try {
      const raw = readFileSync(filePath, "utf-8");
      const output = JSON.parse(raw);
      if (!output.status || !output.artifacts) return null;
      return {
        success: output.status === "completed",
        exitCode: output.status === "completed" ? 0 : 1,
        durationMs: Date.now() - startTime,
      };
    } catch {
      return null;
    }
  }

  private cleanupWatcher(sessionId: string): void {
    const watcher = this.watchers.get(sessionId);
    if (watcher) {
      watcher.close();
      this.watchers.delete(sessionId);
    }
  }
}
