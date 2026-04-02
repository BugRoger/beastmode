import { describe, test, expect } from "bun:test";
import { mapMessage } from "../sdk-message-mapper";
import type {
  SDKPartialAssistantMessage,
  SDKAssistantMessage,
  SDKToolProgressMessage,
  SDKResultMessage,
  SDKHumanTurnMessage,
} from "../sdk-message-types";
import type {
  ToolCallEntry,
  CompletionEntry,
} from "../sdk-message-mapper";

// --- Partial assistant messages (streaming) ---

describe("mapMessage — partial assistant", () => {
  test("maps text delta to text entry", () => {
    const msg: SDKPartialAssistantMessage = {
      type: "assistant",
      partial: true,
      content: [{ type: "text", text: "Hello world" }],
    };
    const entries = mapMessage(msg);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({ kind: "text", text: "Hello world" });
  });

  test("maps tool_use block to tool call entry", () => {
    const msg: SDKPartialAssistantMessage = {
      type: "assistant",
      partial: true,
      content: [
        {
          type: "tool_use",
          id: "tu_1",
          name: "Read",
          input: { file_path: "/src/foo/cancel-logic.ts" },
        },
      ],
    };
    const entries = mapMessage(msg);
    expect(entries).toHaveLength(1);
    const entry = entries[0] as ToolCallEntry;
    expect(entry.kind).toBe("tool_call");
    expect(entry.tool).toBe("Read");
    expect(entry.summary).toBe("[Read] cancel-logic.ts");
  });

  test("maps Edit tool with file path", () => {
    const msg: SDKPartialAssistantMessage = {
      type: "assistant",
      partial: true,
      content: [
        {
          type: "tool_use",
          id: "tu_2",
          name: "Edit",
          input: { file_path: "/src/foo/cancel-logic.ts", old_string: "a", new_string: "b" },
        },
      ],
    };
    const entries = mapMessage(msg);
    expect(entries).toHaveLength(1);
    const entry = entries[0] as ToolCallEntry;
    expect(entry.summary).toBe("[Edit] cancel-logic.ts");
  });

  test("maps Bash tool with command", () => {
    const msg: SDKPartialAssistantMessage = {
      type: "assistant",
      partial: true,
      content: [
        {
          type: "tool_use",
          id: "tu_3",
          name: "Bash",
          input: { command: "bun test --filter cancel" },
        },
      ],
    };
    const entries = mapMessage(msg);
    const entry = entries[0] as ToolCallEntry;
    expect(entry.summary).toBe("[Bash] bun test --filter cancel");
  });

  test("truncates long Bash commands", () => {
    const longCmd = "a".repeat(80);
    const msg: SDKPartialAssistantMessage = {
      type: "assistant",
      partial: true,
      content: [
        {
          type: "tool_use",
          id: "tu_4",
          name: "Bash",
          input: { command: longCmd },
        },
      ],
    };
    const entries = mapMessage(msg);
    const entry = entries[0] as ToolCallEntry;
    // "[Bash] " (7) + 57 chars + "..." (3) = 67 max
    expect(entry.summary.length).toBeLessThanOrEqual(67);
    expect(entry.summary).toContain("...");
  });

  test("maps multi-tool turn to multiple entries", () => {
    const msg: SDKPartialAssistantMessage = {
      type: "assistant",
      partial: true,
      content: [
        { type: "text", text: "Let me check " },
        {
          type: "tool_use",
          id: "tu_5",
          name: "Read",
          input: { file_path: "/src/foo.ts" },
        },
        {
          type: "tool_use",
          id: "tu_6",
          name: "Grep",
          input: { pattern: "TODO" },
        },
      ],
    };
    const entries = mapMessage(msg);
    expect(entries).toHaveLength(3);
    expect(entries[0]).toEqual({ kind: "text", text: "Let me check " });
    expect((entries[1] as ToolCallEntry).tool).toBe("Read");
    expect((entries[2] as ToolCallEntry).tool).toBe("Grep");
  });

  test("skips empty text blocks", () => {
    const msg: SDKPartialAssistantMessage = {
      type: "assistant",
      partial: true,
      content: [{ type: "text", text: "" }],
    };
    const entries = mapMessage(msg);
    expect(entries).toHaveLength(0);
  });

  test("handles empty content array", () => {
    const msg: SDKPartialAssistantMessage = {
      type: "assistant",
      partial: true,
      content: [],
    };
    const entries = mapMessage(msg);
    expect(entries).toHaveLength(0);
  });
});

// --- Complete assistant messages ---

describe("mapMessage — complete assistant", () => {
  test("maps text content to text entry", () => {
    const msg: SDKAssistantMessage = {
      type: "assistant",
      content: [{ type: "text", text: "Done." }],
    };
    const entries = mapMessage(msg);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({ kind: "text", text: "Done." });
  });

  test("maps tool_use in complete message", () => {
    const msg: SDKAssistantMessage = {
      type: "assistant",
      content: [
        {
          type: "tool_use",
          id: "tu_7",
          name: "Write",
          input: { file_path: "/src/new-file.ts", content: "export {}" },
        },
      ],
    };
    const entries = mapMessage(msg);
    expect(entries).toHaveLength(1);
    const entry = entries[0] as ToolCallEntry;
    expect(entry.summary).toBe("[Write] new-file.ts");
  });
});

// --- Tool progress ---

describe("mapMessage — tool progress", () => {
  test("maps to heartbeat entry", () => {
    const msg: SDKToolProgressMessage = {
      type: "tool_progress",
      tool_use_id: "tu_8",
    };
    const entries = mapMessage(msg);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({ kind: "heartbeat", toolUseId: "tu_8" });
  });
});

// --- Result messages ---

describe("mapMessage — result", () => {
  test("maps to completion entry with cost and duration", () => {
    const msg: SDKResultMessage = {
      type: "result",
      cost_usd: 0.42,
      duration_ms: 12345,
      is_error: false,
      session_id: "sess_123",
    };
    const entries = mapMessage(msg);
    expect(entries).toHaveLength(1);
    const entry = entries[0] as CompletionEntry;
    expect(entry.kind).toBe("completion");
    expect(entry.costUsd).toBe(0.42);
    expect(entry.durationMs).toBe(12345);
    expect(entry.isError).toBe(false);
    expect(entry.sessionId).toBe("sess_123");
  });

  test("maps error result", () => {
    const msg: SDKResultMessage = {
      type: "result",
      cost_usd: 0.1,
      duration_ms: 500,
      is_error: true,
      session_id: "sess_err",
    };
    const entries = mapMessage(msg);
    const entry = entries[0] as CompletionEntry;
    expect(entry.isError).toBe(true);
  });
});

// --- Human turn ---

describe("mapMessage — human turn", () => {
  test("maps to text entry", () => {
    const msg: SDKHumanTurnMessage = {
      type: "human",
      content: "User input here",
    };
    const entries = mapMessage(msg);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({ kind: "text", text: "User input here" });
  });

  test("returns empty for empty content", () => {
    const msg: SDKHumanTurnMessage = {
      type: "human",
      content: "",
    };
    const entries = mapMessage(msg);
    expect(entries).toHaveLength(0);
  });
});

// --- Edge cases ---

describe("mapMessage — edge cases", () => {
  test("unknown tool name passes through", () => {
    const msg: SDKPartialAssistantMessage = {
      type: "assistant",
      partial: true,
      content: [
        {
          type: "tool_use",
          id: "tu_9",
          name: "SomeCustomTool",
          input: { query: "test query" },
        },
      ],
    };
    const entries = mapMessage(msg);
    const entry = entries[0] as ToolCallEntry;
    expect(entry.tool).toBe("SomeCustomTool");
    expect(entry.summary).toBe("[SomeCustomTool] test query");
  });

  test("unknown tool with no recognizable input fields", () => {
    const msg: SDKPartialAssistantMessage = {
      type: "assistant",
      partial: true,
      content: [
        {
          type: "tool_use",
          id: "tu_10",
          name: "Mystery",
          input: { foo: 42, bar: true },
        },
      ],
    };
    const entries = mapMessage(msg);
    const entry = entries[0] as ToolCallEntry;
    expect(entry.summary).toBe("[Mystery]");
  });

  test("WebSearch maps to Search display name", () => {
    const msg: SDKPartialAssistantMessage = {
      type: "assistant",
      partial: true,
      content: [
        {
          type: "tool_use",
          id: "tu_11",
          name: "WebSearch",
          input: { query: "bun test runner" },
        },
      ],
    };
    const entries = mapMessage(msg);
    const entry = entries[0] as ToolCallEntry;
    expect(entry.tool).toBe("Search");
    expect(entry.summary).toBe("[Search] bun test runner");
  });

  test("Read with offset and limit shows range", () => {
    const msg: SDKPartialAssistantMessage = {
      type: "assistant",
      partial: true,
      content: [
        {
          type: "tool_use",
          id: "tu_12",
          name: "Read",
          input: { file_path: "/src/long-file.ts", offset: 100, limit: 50 },
        },
      ],
    };
    const entries = mapMessage(msg);
    const entry = entries[0] as ToolCallEntry;
    expect(entry.summary).toBe("[Read] long-file.ts:100-150");
  });

  test("unknown message type returns empty array", () => {
    const msg = { type: "unknown_type" } as any;
    const entries = mapMessage(msg);
    expect(entries).toHaveLength(0);
  });

  test("Glob tool shows pattern", () => {
    const msg: SDKPartialAssistantMessage = {
      type: "assistant",
      partial: true,
      content: [
        {
          type: "tool_use",
          id: "tu_13",
          name: "Glob",
          input: { pattern: "**/*.test.ts" },
        },
      ],
    };
    const entries = mapMessage(msg);
    const entry = entries[0] as ToolCallEntry;
    expect(entry.summary).toBe("[Glob] **/*.test.ts");
  });

  test("Agent tool shows description", () => {
    const msg: SDKPartialAssistantMessage = {
      type: "assistant",
      partial: true,
      content: [
        {
          type: "tool_use",
          id: "tu_14",
          name: "Agent",
          input: { description: "Explore codebase" },
        },
      ],
    };
    const entries = mapMessage(msg);
    const entry = entries[0] as ToolCallEntry;
    expect(entry.tool).toBe("Agent");
    expect(entry.summary).toBe("[Agent] Explore codebase");
  });
});
