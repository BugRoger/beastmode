/**
 * SDK streaming types and ring buffer for live agent output.
 *
 * Converts the Claude Agent SDK's async generator messages into
 * structured log entries suitable for terminal rendering.
 */

import { EventEmitter } from "node:events";

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
