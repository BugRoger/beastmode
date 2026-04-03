/**
 * Session factory — abstract dispatch strategy for the watch loop.
 *
 * Two implementations:
 * - SdkSessionFactory: wraps the existing SDK/CLI dispatch (default)
 * - CmuxSessionFactory: creates cmux surfaces for visual dispatch
 *
 * Also includes the interactive runner for manual phase commands and
 * SDK streaming types/ring buffer for live agent output.
 */

import { EventEmitter } from "node:events";
import type { Phase, PhaseResult } from "../types.js";
import type { SessionResult } from "./types.js";

// --- SDK message types (subset we care about) ---

/** Text content block from assistant message. */
export interface SdkTextBlock {
  type: "text";
  text: string;
}

/** Tool use content block from assistant message. */
export interface SdkToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/** Tool result content block. */
export interface SdkToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
}

/** Union of content block types we handle. */
export type SdkContentBlock = SdkTextBlock | SdkToolUseBlock | SdkToolResultBlock;

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
}

// --- Ring Buffer ---

/** Fixed-capacity circular buffer for log entries. */
export class RingBuffer {
  private items: LogEntry[];
  private capacity: number;
  private head: number;
  private count: number;
  private nextSeq: number;

  constructor(capacity: number = 100) {
    this.capacity = capacity;
    this.items = new Array(capacity);
    this.head = 0;
    this.count = 0;
    this.nextSeq = 0;
  }

  /** Push a new entry, evicting the oldest if at capacity. */
  push(entry: Omit<LogEntry, "seq">): LogEntry {
    const full: LogEntry = { ...entry, seq: this.nextSeq++ };
    const index = (this.head + this.count) % this.capacity;

    if (this.count < this.capacity) {
      this.items[index] = full;
      this.count++;
    } else {
      // Overwrite oldest
      this.items[this.head] = full;
      this.head = (this.head + 1) % this.capacity;
    }

    return full;
  }

  /** Get all entries in insertion order (oldest first). */
  toArray(): LogEntry[] {
    const result: LogEntry[] = [];
    for (let i = 0; i < this.count; i++) {
      result.push(this.items[(this.head + i) % this.capacity]);
    }
    return result;
  }

  /** Number of entries currently stored. */
  get size(): number {
    return this.count;
  }

  /** Clear all entries. */
  clear(): void {
    this.head = 0;
    this.count = 0;
  }
}

// --- Session Event Emitter ---

/** Events emitted by a streaming SDK session. */
export interface SessionStreamEvents {
  /** A new log entry was added to the buffer. */
  entry: [LogEntry];
  /** The session has completed. */
  done: [{ success: boolean }];
}

/** Typed emitter for SDK session streaming. */
export class SessionEmitter extends EventEmitter {
  private buffer: RingBuffer;

  constructor(bufferCapacity: number = 100) {
    super();
    this.buffer = new RingBuffer(bufferCapacity);
  }

  /** Push a log entry to the buffer and emit it. */
  pushEntry(entry: Omit<LogEntry, "seq">): LogEntry {
    const full = this.buffer.push(entry);
    this.emit("entry", full);
    return full;
  }

  /** Get the ring buffer snapshot. */
  getBuffer(): LogEntry[] {
    return this.buffer.toArray();
  }

  /** Number of entries in the buffer. */
  get bufferSize(): number {
    return this.buffer.size;
  }

  /** Signal session completion. */
  complete(success: boolean): void {
    this.emit("done", { success });
  }
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
  /** EventEmitter for live SDK message streaming (SDK dispatch only). */
  events?: SessionEmitter;
}

/**
 * Factory that creates dispatch sessions. The watch loop uses this
 * to dispatch phases without knowing whether they run as SDK sessions
 * or cmux terminal surfaces.
 */
export interface SessionFactory {
  create(opts: SessionCreateOpts): Promise<SessionHandle>;

  /** Optional cleanup when an epic is released (e.g., close cmux workspace). */
  cleanup?(epicSlug: string): Promise<void>;

  /** Optional badge on the epic-level container (tab/workspace) for error signaling. */
  setBadgeOnContainer?(epicSlug: string, text: string): Promise<void>;
}

/**
 * SDK-based session factory — wraps the existing dispatchPhase function.
 * This is the default strategy when cmux is not available or not configured.
 */
export class SdkSessionFactory implements SessionFactory {
  private dispatchFn: (opts: SessionCreateOpts) => Promise<SessionHandle>;

  constructor(dispatchFn: (opts: SessionCreateOpts) => Promise<SessionHandle>) {
    this.dispatchFn = dispatchFn;
  }

  async create(opts: SessionCreateOpts): Promise<SessionHandle> {
    return this.dispatchFn(opts);
  }
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
