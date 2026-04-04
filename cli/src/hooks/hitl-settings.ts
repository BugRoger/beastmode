/**
 * pre-tool-use.ts — HITL settings composition and PreToolUse prompt hook.
 *
 * Combines settings management (reading/writing settings.local.json with HITL hooks)
 * and prompt construction for AskUserQuestion auto-answering.
 *
 * Originally: hitl-settings.ts (build/get) + hitl-prompt.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { resolve } from "node:path";

import type { HitlConfig } from "../config.js";

// --- Types from hitl-settings.ts ---

/** Shape of a hook entry in settings.local.json */
interface HookEntry {
  matcher: string;
  hooks: Array<{
    type: string;
    prompt?: string;
    command?: string;
    model?: string;
    timeout?: number;
  }>;
}

/** Shape of settings.local.json */
interface SettingsLocal {
  enabledPlugins?: Record<string, boolean>;
  hooks?: {
    PreToolUse?: HookEntry[];
    PostToolUse?: HookEntry[];
    [key: string]: HookEntry[] | undefined;
  };
  [key: string]: unknown;
}

export interface WriteSettingsOptions {
  /** Path to the .claude directory in the worktree */
  claudeDir: string;
  /** PreToolUse hook entry for HITL auto-answering */
  preToolUseHook: HookEntry;
  /** Phase name for the PostToolUse logging hook */
  phase: string;
}

// --- Types from hitl-prompt.ts ---

/** Shape of a single PreToolUse prompt hook entry in settings.local.json */
export interface PromptHookEntry {
  matcher: string;
  hooks: Array<{
    type: "prompt";
    prompt: string;
    timeout?: number;
  }>;
}

// --- Functions from hitl-settings.ts ---

/**
 * Read existing settings.local.json, merge HITL hooks, write back atomically.
 *
 * Preserves all existing keys (enabledPlugins, etc.) and replaces
 * only the HITL-related hook entries.
 */
export function writeHitlSettings(options: WriteSettingsOptions): void {
  const { claudeDir, preToolUseHook, phase } = options;
  const settingsPath = resolve(claudeDir, "settings.local.json");

  // Read existing settings or start fresh
  let settings: SettingsLocal = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    } catch {
      // Malformed JSON — start fresh but preserve nothing
      settings = {};
    }
  }

  // Ensure hooks object exists
  if (!settings.hooks) {
    settings.hooks = {};
  }

  // Replace PreToolUse hooks (remove old HITL entries, add new)
  settings.hooks.PreToolUse = replaceHitlHook(
    settings.hooks.PreToolUse,
    "AskUserQuestion",
    preToolUseHook,
  );

  // Add PostToolUse command hook for decision logging
  const postToolUseHook = buildPostToolUseHook(phase);
  settings.hooks.PostToolUse = replaceHitlHook(
    settings.hooks.PostToolUse,
    "AskUserQuestion",
    postToolUseHook,
  );

  // Atomic write
  mkdirSync(claudeDir, { recursive: true });
  const tmpPath = settingsPath + ".tmp";
  writeFileSync(tmpPath, JSON.stringify(settings, null, 2) + "\n");
  renameSync(tmpPath, settingsPath);
}

/**
 * Remove HITL hooks from settings.local.json, preserving everything else.
 * Called between dispatches to prevent stale state.
 */
export function cleanHitlSettings(claudeDir: string): void {
  const settingsPath = resolve(claudeDir, "settings.local.json");
  if (!existsSync(settingsPath)) return;

  let settings: SettingsLocal;
  try {
    settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
  } catch {
    return;
  }

  if (!settings.hooks) return;

  // Remove HITL-specific hook entries
  if (settings.hooks.PreToolUse) {
    settings.hooks.PreToolUse = settings.hooks.PreToolUse.filter(
      (h) => h.matcher !== "AskUserQuestion",
    );
    if (settings.hooks.PreToolUse.length === 0) {
      delete settings.hooks.PreToolUse;
    }
  }
  if (settings.hooks.PostToolUse) {
    settings.hooks.PostToolUse = settings.hooks.PostToolUse.filter(
      (h) => h.matcher !== "AskUserQuestion",
    );
    if (settings.hooks.PostToolUse.length === 0) {
      delete settings.hooks.PostToolUse;
    }
  }

  // Remove hooks key entirely if empty
  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
}

/**
 * Replace a hook entry by matcher in an existing hook array.
 * If the matcher already exists, replace it. Otherwise, append.
 */
function replaceHitlHook(
  existing: HookEntry[] | undefined,
  matcher: string,
  newEntry: HookEntry,
): HookEntry[] {
  const entries = (existing ?? []).filter((h) => h.matcher !== matcher);
  entries.push(newEntry);
  return entries;
}

/**
 * Build the PostToolUse command hook for AskUserQuestion decision logging.
 * Calls hitl-log.ts with the phase argument.
 */
function buildPostToolUseHook(phase: string): HookEntry {
  return {
    matcher: "AskUserQuestion",
    hooks: [
      {
        type: "command",
        command: `bun run "$(git rev-parse --show-toplevel)/cli/src/hooks/hitl-log.ts" ${phase}`,
      },
    ],
  };
}

// --- Functions from hitl-prompt.ts ---

/**
 * Build the PreToolUse prompt hook entry for AskUserQuestion.
 *
 * @param prose — The user's HITL instructions for this phase (from config.yaml)
 * @param timeout — Hook timeout in seconds (default: 30)
 * @returns A single hook entry targeting AskUserQuestion
 */
export function buildPreToolUseHook(
  prose: string,
  timeout: number = 30,
): PromptHookEntry {
  const prompt = buildPrompt(prose);
  return {
    matcher: "AskUserQuestion",
    hooks: [
      {
        type: "prompt",
        prompt,
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
  const prose = hitlConfig[phase as keyof Omit<HitlConfig, "timeout">];
  return (typeof prose === "string" && prose.length > 0) ? prose : "always defer to human";
}
