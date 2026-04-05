/**
 * Session factory — abstract dispatch strategy for the watch loop.
 *
 * Single implementation: ITermSessionFactory (in it2.ts).
 * Also includes the interactive runner for manual phase commands.
 */

import type { Phase, PhaseResult } from "../types.js";
import type { SessionResult } from "./types.js";

/** Structured log entry for terminal rendering. */
export interface LogEntry {
  /** Monotonic sequence number within the session */
  seq: number;
  /** Timestamp when the entry was created */
  timestamp: number;
  /** Entry type for rendering dispatch */
  type: "text" | "tool-start" | "tool-result" | "heartbeat" | "result";
  /** Display text — ready to render */
  text: string;
  /** Optional explicit log level — overrides type-based inference when present */
  level?: "info" | "debug" | "warn" | "error";
}

/** Options for creating a new session. */
export interface SessionCreateOpts {
  epicSlug: string;
  phase: string;
  args: string[];
  featureSlug?: string;
  projectRoot: string;
  signal: AbortSignal;
}

/** Handle to a dispatched session. */
export interface SessionHandle {
  id: string;
  worktreeSlug: string;
  promise: Promise<SessionResult>;
  /** TTY device path for terminal-dispatched sessions. */
  tty?: string;
}

/**
 * Factory that creates dispatch sessions. The watch loop uses this
 * to dispatch phases without knowing the terminal backend.
 */
export interface SessionFactory {
  create(opts: SessionCreateOpts): Promise<SessionHandle>;

  /** Optional cleanup when an epic is released (e.g., close iTerm2 tab). */
  cleanup?(epicSlug: string): Promise<void>;

  /** Optional badge on the epic-level container (tab) for error signaling. */
  setBadgeOnContainer?(epicSlug: string, text: string): Promise<void>;

  /** Optional liveness check — detects dead sessions and force-resolves their promises. */
  checkLiveness?(sessions: import("./types.js").DispatchedSession[]): Promise<void>;
}

export interface InteractiveRunnerOptions {
  phase: Phase;
  args: string[];
  cwd: string;
}

export async function runInteractive(
  options: InteractiveRunnerOptions,
): Promise<PhaseResult> {
  const { phase, args, cwd } = options;
  const prompt = `/beastmode:${phase} ${args.join(" ")}`.trim();
  const startTime = Date.now();

  const proc = Bun.spawn(
    ["claude", "--dangerously-skip-permissions", "--", prompt],
    {
      cwd,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    },
  );

  let cancelled = false;
  const onSigint = () => {
    cancelled = true;
    proc.kill("SIGINT");
  };
  process.on("SIGINT", onSigint);

  try {
    const exitCode = await proc.exited;
    const durationMs = Date.now() - startTime;

    let exitStatus: PhaseResult["exit_status"];
    if (cancelled) {
      exitStatus = "cancelled";
    } else if (exitCode === 0) {
      exitStatus = "success";
    } else {
      exitStatus = "error";
    }

    return {
      exit_status: exitStatus,
      duration_ms: durationMs,
      session_id: null,
    };
  } finally {
    process.off("SIGINT", onSigint);
  }
}
