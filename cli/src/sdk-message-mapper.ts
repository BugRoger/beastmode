/**
 * SDK Message Mapper -- converts SDK message types into display entries
 * for terminal rendering.
 *
 * Pure function module: (SDKMessage) => DisplayLogEntry[]
 * No side effects, no subscriptions.
 */

import type {
  SDKMessage,
  SDKPartialAssistantMessage,
  SDKAssistantMessage,
  SDKToolProgressMessage,
  SDKResultMessage,
  SDKHumanTurnMessage,
  SDKToolUseBlock,
} from "./sdk-message-types.js";

// --- Display entry types ---

export interface TextEntry {
  kind: "text";
  text: string;
}

export interface ToolCallEntry {
  kind: "tool_call";
  tool: string;
  summary: string;
}

export interface ToolResultEntry {
  kind: "tool_result";
  summary: string;
  isError: boolean;
}

export interface CompletionEntry {
  kind: "completion";
  costUsd: number;
  durationMs: number;
  isError: boolean;
  sessionId: string;
}

export interface HeartbeatEntry {
  kind: "heartbeat";
  toolUseId: string;
}

export type DisplayLogEntry =
  | TextEntry
  | ToolCallEntry
  | ToolResultEntry
  | CompletionEntry
  | HeartbeatEntry;

// --- Tool name extraction and formatting ---

/** Known tool names and their display abbreviations. */
const TOOL_DISPLAY_NAMES: Record<string, string> = {
  Read: "Read",
  Edit: "Edit",
  Write: "Write",
  Bash: "Bash",
  Glob: "Glob",
  Grep: "Grep",
  WebSearch: "Search",
  WebFetch: "Fetch",
  Agent: "Agent",
  NotebookEdit: "Notebook",
  AskUserQuestion: "Ask",
};

/** Extract a display-friendly tool name. */
function formatToolName(name: string): string {
  return TOOL_DISPLAY_NAMES[name] ?? name;
}

/**
 * Extract the primary argument from a tool's input for display.
 * Returns a short summary string suitable for a one-liner.
 */
function extractPrimaryArg(tool: SDKToolUseBlock): string {
  const { name, input } = tool;

  switch (name) {
    case "Read": {
      const filePath = input.file_path as string | undefined;
      if (!filePath) return "";
      const basename = filePath.split("/").pop() ?? filePath;
      if (input.offset || input.limit) {
        return `${basename}:${input.offset ?? 1}-${(input.offset as number ?? 0) + (input.limit as number ?? 0)}`;
      }
      return basename;
    }

    case "Edit": {
      const filePath = input.file_path as string | undefined;
      if (!filePath) return "";
      return filePath.split("/").pop() ?? filePath;
    }

    case "Write": {
      const filePath = input.file_path as string | undefined;
      if (!filePath) return "";
      return filePath.split("/").pop() ?? filePath;
    }

    case "Bash": {
      const command = input.command as string | undefined;
      if (!command) return "";
      return command.length > 60 ? command.slice(0, 57) + "..." : command;
    }

    case "Glob": {
      const pattern = input.pattern as string | undefined;
      return pattern ?? "";
    }

    case "Grep": {
      const pattern = input.pattern as string | undefined;
      return pattern ?? "";
    }

    case "Agent": {
      const description = input.description as string | undefined;
      return description ?? "";
    }

    default: {
      // For unknown tools, try common field names
      const first =
        input.file_path ?? input.path ?? input.command ?? input.query ?? input.pattern;
      if (typeof first === "string") {
        return first.length > 60 ? first.slice(0, 57) + "..." : first;
      }
      return "";
    }
  }
}

/** Format a single tool_use block into a one-liner summary. */
function formatToolCall(block: SDKToolUseBlock): string {
  const name = formatToolName(block.name);
  const arg = extractPrimaryArg(block);
  return arg ? `[${name}] ${arg}` : `[${name}]`;
}

// --- Message mapping ---

/** Map a partial assistant message (streaming text/tool deltas). */
function mapPartialAssistant(msg: SDKPartialAssistantMessage): DisplayLogEntry[] {
  const entries: DisplayLogEntry[] = [];

  for (const block of msg.content) {
    if (block.type === "text" && block.text) {
      entries.push({ kind: "text", text: block.text });
    } else if (block.type === "tool_use") {
      entries.push({
        kind: "tool_call",
        tool: formatToolName(block.name),
        summary: formatToolCall(block),
      });
    }
  }

  return entries;
}

/** Map a complete assistant message. */
function mapAssistant(msg: SDKAssistantMessage): DisplayLogEntry[] {
  const entries: DisplayLogEntry[] = [];

  for (const block of msg.content) {
    if (block.type === "text" && block.text) {
      entries.push({ kind: "text", text: block.text });
    } else if (block.type === "tool_use") {
      entries.push({
        kind: "tool_call",
        tool: formatToolName(block.name),
        summary: formatToolCall(block),
      });
    }
  }

  return entries;
}

/** Map a tool progress heartbeat. */
function mapToolProgress(msg: SDKToolProgressMessage): DisplayLogEntry[] {
  return [{ kind: "heartbeat", toolUseId: msg.tool_use_id }];
}

/** Map a result message (session completion). */
function mapResult(msg: SDKResultMessage): DisplayLogEntry[] {
  return [
    {
      kind: "completion",
      costUsd: msg.cost_usd,
      durationMs: msg.duration_ms,
      isError: msg.is_error,
      sessionId: msg.session_id,
    },
  ];
}

/** Map a human turn message. */
function mapHumanTurn(msg: SDKHumanTurnMessage): DisplayLogEntry[] {
  if (!msg.content) return [];
  return [{ kind: "text", text: msg.content }];
}

// --- Public API ---

/**
 * Convert an SDK message into zero or more display log entries.
 *
 * Pure function -- no side effects, no subscriptions.
 * The ring buffer calls this when receiving emitter events.
 */
export function mapMessage(msg: SDKMessage): DisplayLogEntry[] {
  switch (msg.type) {
    case "assistant":
      return msg.partial
        ? mapPartialAssistant(msg as SDKPartialAssistantMessage)
        : mapAssistant(msg as SDKAssistantMessage);
    case "tool_progress":
      return mapToolProgress(msg);
    case "result":
      return mapResult(msg);
    case "human":
      return mapHumanTurn(msg);
    default:
      return [];
  }
}
