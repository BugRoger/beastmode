/**
 * Local type definitions for Claude Agent SDK message types.
 *
 * These mirror the shapes yielded by the SDK's query() AsyncGenerator
 * with includePartialMessages: true. Defined locally because the SDK
 * package uses dynamic import and doesn't export stable .d.ts types.
 */

/** Content block types within assistant messages. */
export interface SDKTextBlock {
  type: "text";
  text: string;
}

export interface SDKToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export type SDKContentBlock = SDKTextBlock | SDKToolUseBlock;

/** Tool result delivered back to the model. */
export interface SDKToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string | SDKTextBlock[];
  is_error?: boolean;
}

/**
 * Partial assistant message — streamed incrementally as text/tool
 * deltas arrive. Content blocks may be incomplete.
 */
export interface SDKPartialAssistantMessage {
  type: "assistant";
  partial: true;
  content: SDKContentBlock[];
}

/**
 * Complete assistant message — a full turn with all content blocks
 * finalized.
 */
export interface SDKAssistantMessage {
  type: "assistant";
  partial?: false;
  content: SDKContentBlock[];
}

/** Heartbeat emitted while a tool is executing. */
export interface SDKToolProgressMessage {
  type: "tool_progress";
  tool_use_id: string;
}

/** Final result message with cost and session metadata. */
export interface SDKResultMessage {
  type: "result";
  cost_usd: number;
  duration_ms: number;
  is_error: boolean;
  session_id: string;
}

/** Human turn — the model is requesting input or the conversation includes a human message. */
export interface SDKHumanTurnMessage {
  type: "human";
  content: string;
}

/** Union of all message types yielded by the SDK's query() generator. */
export type SDKMessage =
  | SDKPartialAssistantMessage
  | SDKAssistantMessage
  | SDKToolProgressMessage
  | SDKResultMessage
  | SDKHumanTurnMessage;
