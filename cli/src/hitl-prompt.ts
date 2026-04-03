/**
 * hitl-prompt.ts — Builds the PreToolUse prompt hook configuration
 * for HITL auto-answering of AskUserQuestion calls.
 *
 * The CLI templates phase-specific HITL prose into the hook at dispatch time.
 * No runtime env vars — the prompt is fully baked into settings.local.json.
 */

import type { HitlConfig } from "./config.js";

/** Shape of a single PreToolUse prompt hook entry in settings.local.json */
export interface PromptHookEntry {
  matcher: string;
  hooks: Array<{
    type: "prompt";
    prompt: string;
    model?: string;
    timeout?: number;
  }>;
}

/**
 * Build the PreToolUse prompt hook entry for AskUserQuestion.
 *
 * @param prose — The user's HITL instructions for this phase (from config.yaml)
 * @param model — LLM model to run the hook (default: "haiku")
 * @param timeout — Hook timeout in seconds (default: 30)
 * @returns A single hook entry targeting AskUserQuestion
 */
export function buildPreToolUseHook(
  prose: string,
  model: string = "haiku",
  timeout: number = 30,
): PromptHookEntry {
  const prompt = buildPrompt(prose);
  return {
    matcher: "AskUserQuestion",
    hooks: [
      {
        type: "prompt",
        prompt,
        model,
        timeout,
      },
    ],
  };
}

/**
 * Build the full prompt string that the PreToolUse hook will execute.
 *
 * The prompt instructs the model to:
 * 1. Read the AskUserQuestion input from $ARGUMENTS
 * 2. Evaluate each question against the user's HITL prose
 * 3. Return auto-answer OR defer (all-or-nothing for multi-question)
 * 4. Fail-open on any uncertainty
 */
function buildPrompt(prose: string): string {
  return `You are a HITL (Human-in-the-Loop) auto-answering hook. Your job is to decide whether to auto-answer an AskUserQuestion call or defer it to the human.

## User's HITL Instructions

${prose}

## Input

The tool input is provided in $ARGUMENTS as JSON. It contains a "questions" array, where each question has:
- "question": the question text
- "options": array of {label, description} choices
- "multiSelect": boolean

## Decision Rules

1. Read each question in the batch
2. For each question, check if the user's HITL instructions above give a clear answer
3. If ALL questions can be auto-answered with high confidence, return an auto-answer
4. If ANY question is ambiguous, unclear, or not covered by the instructions, defer ALL questions to the human
5. On ANY error, uncertainty, or edge case: DEFER (fail-open)

## Response Format

To AUTO-ANSWER (all questions have clear answers):
Return a JSON block:
\`\`\`json
{"permissionDecision": "allow", "updatedInput": {"questions": [...original questions...], "answers": {"<question text>": "<selected option label>", ...}}}
\`\`\`

To DEFER to human (any question needs human input):
Return a JSON block:
\`\`\`json
{"permissionDecision": "allow"}
\`\`\`

IMPORTANT:
- The "answers" object keys MUST exactly match the "question" text strings
- The answer values MUST exactly match one of the option "label" strings
- For multiSelect questions, the answer is a comma-separated list of labels
- If instructions say "always defer to human", ALWAYS return the defer response
- Never add explanations outside the JSON block
- Never return permissionDecision: "deny" — always "allow"`;
}

/**
 * Extract the HITL prose for a given phase from the config.
 * Falls back to "always defer to human" if no prose is configured.
 */
export function getPhaseHitlProse(
  hitlConfig: HitlConfig,
  phase: string,
): string {
  const prose = hitlConfig[phase as keyof Omit<HitlConfig, "model" | "timeout">];
  return (typeof prose === "string" && prose.length > 0) ? prose : "always defer to human";
}
