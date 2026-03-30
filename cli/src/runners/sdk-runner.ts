/**
 * Runs a non-design phase via the Claude Agent SDK.
 *
 * Creates a query() session with the skill prompt, streams output to the
 * terminal in real time, and returns cost/duration/status metadata.
 *
 * Ctrl+C triggers the AbortController which cleanly cancels the SDK session.
 */

import { query } from "@anthropic-ai/claude-agent-sdk";
import type { Phase, PhaseResult } from "../types";
import { createLogger } from "../logger.js";
import type { Logger } from "../logger.js";

export interface SdkRunnerOptions {
  phase: Phase;
  args: string[];
  cwd: string;
  logger?: Logger;
}

export async function runPhaseWithSdk(
  options: SdkRunnerOptions,
): Promise<PhaseResult> {
  const { phase, args, cwd } = options;
  const logger = options.logger ?? createLogger(0, "beastmode");
  const prompt = `/beastmode:${phase} ${args.join(" ")}`.trim();

  const startTime = Date.now();
  let sessionId: string | null = null;
  let exitStatus: PhaseResult["exit_status"] = "success";

  const abortController = new AbortController();

  const q = query({
    prompt,
    options: {
      cwd,
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      settingSources: ["project"],
      includePartialMessages: true,
      abortController,
    },
  });

  // Wire Ctrl+C to clean SDK cancellation
  const onSigint = () => {
    exitStatus = "cancelled";
    abortController.abort();
  };
  process.on("SIGINT", onSigint);

  try {
    let messageCount = 0;
    for await (const message of q) {
      messageCount++;

      // Capture session ID from any message that carries it
      if ("session_id" in message && message.session_id) {
        sessionId = message.session_id as string;
      }

      // Debug: log message types
      {
        const summary: Record<string, unknown> = { type: message.type };
        if ((message as any).subtype) summary.subtype = (message as any).subtype;
        if (message.type === "stream_event") {
          summary.eventType = (message as any).event?.type;
        }
        if (message.type === "result") {
          summary.result = {
            subtype: (message as any).subtype,
            cost: (message as any).cost_usd,
            duration: (message as any).duration_ms,
            numTurns: (message as any).num_turns,
          };
        }
        logger.trace(`msg #${messageCount}: ${JSON.stringify(summary)}`);
      }

      // Stream text deltas to terminal in real time
      if (message.type === "stream_event") {
        const event = (message as any).event;
        if (
          event?.type === "content_block_delta" &&
          event?.delta?.type === "text_delta"
        ) {
          process.stdout.write(event.delta.text);
        }
      }

      // Print assistant text blocks (non-streaming fallback)
      if (message.type === "assistant") {
        const content = (message as any).message?.content;
        if (Array.isArray(content)) {
          for (const block of content) {
            if (block.type === "text") {
              process.stdout.write(block.text);
            }
          }
        }
      }

      // Result message — capture final status
      if (message.type === "result") {
        const result = message as any;
        if (result.subtype === "error") {
          exitStatus = "error";
        }
      }
    }

    logger.trace(`total messages: ${messageCount}, session: ${sessionId}`);
  } catch (err: any) {
    // AbortError from controller during SIGINT is expected
    if (!abortController.signal.aborted) {
      exitStatus = "error";
      logger.error(`Phase error: ${err.message}`);
    }
  } finally {
    process.off("SIGINT", onSigint);
  }

  const durationMs = Date.now() - startTime;

  return {
    exit_status: exitStatus,
    cost_usd: null,
    duration_ms: durationMs,
    session_id: sessionId,
  };
}
