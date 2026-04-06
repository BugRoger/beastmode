/**
 * file-permission-settings.ts — File permission hook composition for Write/Edit tools.
 *
 * Builds PreToolUse prompt hooks with `if`-field path filtering so that
 * only file operations targeting specific paths (e.g., .claude/**) trigger
 * the LLM-based permission decision. Analogous to hitl-settings.ts but for
 * file permission dialogs instead of AskUserQuestion auto-answering.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { resolve } from "node:path";

// --- Types ---

interface FilePermissionHookHandler {
  type: "prompt";
  prompt: string;
  if: string;
  timeout?: number;
  [key: string]: unknown;
}

interface FilePermissionHookEntry {
  matcher: string;
  hooks: FilePermissionHookHandler[];
}

interface SettingsLocal {
  enabledPlugins?: Record<string, boolean>;
  hooks?: {
    PreToolUse?: Array<{ matcher: string; hooks: Array<Record<string, unknown>> }>;
    PostToolUse?: Array<{ matcher: string; hooks: Array<Record<string, unknown>> }>;
    [key: string]: Array<{ matcher: string; hooks: Array<Record<string, unknown>> }> | undefined;
  };
  [key: string]: unknown;
}

export interface WriteFilePermissionSettingsOptions {
  claudeDir: string;
  preToolUseHooks: FilePermissionHookEntry[];
  postToolUseHooks: Array<{ matcher: string; hooks: Array<Record<string, unknown>> }>;
}

// --- Constants ---

/** Hardcoded category-to-path mapping. Users configure prose per category, not path globs. */
export const CATEGORY_PATH_MAP: Record<string, string> = {
  "claude-settings": ".claude/**",
};

/** Matchers used by file-permission hooks — used for identification during clean. */
const FILE_PERMISSION_MATCHERS = ["Write", "Edit"];

// --- Hook Builders ---

/**
 * Build the prompt for file permission decisions.
 *
 * Three possible outcomes:
 * 1. Auto-allow: { permissionDecision: "allow" }
 * 2. Hard deny: { permissionDecision: "deny" }
 * 3. Defer to human: { permissionDecision: "allow" } with no updatedInput
 */
export function buildFilePermissionPrompt(prose: string): string {
  return `You are a file permission hook. Your job is to decide whether to allow, deny, or defer a file write/edit operation.

## User's File Permission Instructions

${prose}

## Input

The tool input is provided in $ARGUMENTS as JSON. For Write tools, it contains "file_path" and "content". For Edit tools, it contains "file_path", "old_string", and "new_string".

## Decision Rules

1. Read the file path and content/diff from $ARGUMENTS
2. Apply the user's instructions above to decide:
   - **Allow**: The operation is safe and matches the user's intent
   - **Deny**: The operation violates the user's intent or is unsafe
   - **Defer**: The operation is ambiguous or not covered by instructions
3. If instructions say "always defer to human", ALWAYS return the defer response
4. On ANY error, uncertainty, or edge case: DEFER (fail-open)

## Response Format

To ALLOW (auto-approve the file operation):
\`\`\`json
{"permissionDecision": "allow"}
\`\`\`

To DENY (block the file operation):
\`\`\`json
{"permissionDecision": "deny"}
\`\`\`

To DEFER to human (pass through to native permission dialog):
Return empty — no JSON block, no output. Silent pass-through.

IMPORTANT:
- Never add explanations outside the JSON block
- If unsure, produce no output (defer)
- The "allow" response has NO updatedInput — it just approves the operation as-is`;
}

/**
 * Build PreToolUse prompt hook entries for Write and Edit tools.
 *
 * Each hook uses the `if` field to filter by path pattern, ensuring
 * zero LLM overhead for non-matching file paths.
 */
export function buildFilePermissionPreToolUseHooks(
  prose: string,
  timeout: number = 30,
): FilePermissionHookEntry[] {
  const prompt = buildFilePermissionPrompt(prose);
  const pathPattern = CATEGORY_PATH_MAP["claude-settings"];

  return FILE_PERMISSION_MATCHERS.map((tool) => ({
    matcher: tool,
    hooks: [
      {
        type: "prompt" as const,
        prompt,
        if: `${tool}(${pathPattern})`,
        timeout,
      },
    ],
  }));
}

/**
 * Build PostToolUse command hooks for Write and Edit decision logging.
 * Calls hitl-log.ts with the phase argument — reuses same log infrastructure.
 */
export function buildFilePermissionPostToolUseHooks(phase: string): Array<{ matcher: string; hooks: Array<Record<string, unknown>> }> {
  return FILE_PERMISSION_MATCHERS.map((tool) => ({
    matcher: tool,
    hooks: [
      {
        type: "command",
        command: `bunx beastmode hooks hitl-log ${phase}`,
      },
    ],
  }));
}

// --- Settings Lifecycle ---

/**
 * Write file-permission hooks to settings.local.json alongside existing hooks.
 *
 * Preserves all existing keys (enabledPlugins, HITL hooks, etc.) and replaces
 * only the Write/Edit hook entries.
 */
export function writeFilePermissionSettings(options: WriteFilePermissionSettingsOptions): void {
  const { claudeDir, preToolUseHooks, postToolUseHooks } = options;
  const settingsPath = resolve(claudeDir, "settings.local.json");

  let settings: SettingsLocal = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    } catch {
      settings = {};
    }
  }

  if (!settings.hooks) {
    settings.hooks = {};
  }

  // Replace Write/Edit PreToolUse hooks
  let preToolUse = (settings.hooks.PreToolUse ?? []).filter(
    (h) => !FILE_PERMISSION_MATCHERS.includes(h.matcher),
  );
  preToolUse.push(...preToolUseHooks);
  settings.hooks.PreToolUse = preToolUse;

  // Replace Write/Edit PostToolUse hooks
  let postToolUse = (settings.hooks.PostToolUse ?? []).filter(
    (h) => !FILE_PERMISSION_MATCHERS.includes(h.matcher),
  );
  postToolUse.push(...postToolUseHooks);
  settings.hooks.PostToolUse = postToolUse;

  // Atomic write
  mkdirSync(claudeDir, { recursive: true });
  const tmpPath = settingsPath + ".tmp";
  writeFileSync(tmpPath, JSON.stringify(settings, null, 2) + "\n");
  renameSync(tmpPath, settingsPath);
}

/**
 * Remove file-permission hooks from settings.local.json, preserving everything else.
 * Called between dispatches to prevent stale state.
 */
export function cleanFilePermissionSettings(claudeDir: string): void {
  const settingsPath = resolve(claudeDir, "settings.local.json");
  if (!existsSync(settingsPath)) return;

  let settings: SettingsLocal;
  try {
    settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
  } catch {
    return;
  }

  if (!settings.hooks) return;

  if (settings.hooks.PreToolUse) {
    settings.hooks.PreToolUse = settings.hooks.PreToolUse.filter(
      (h) => !FILE_PERMISSION_MATCHERS.includes(h.matcher),
    );
    if (settings.hooks.PreToolUse.length === 0) {
      delete settings.hooks.PreToolUse;
    }
  }
  if (settings.hooks.PostToolUse) {
    settings.hooks.PostToolUse = settings.hooks.PostToolUse.filter(
      (h) => !FILE_PERMISSION_MATCHERS.includes(h.matcher),
    );
    if (settings.hooks.PostToolUse.length === 0) {
      delete settings.hooks.PostToolUse;
    }
  }

  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  // Atomic write
  const tmpPath = settingsPath + ".tmp";
  writeFileSync(tmpPath, JSON.stringify(settings, null, 2) + "\n");
  renameSync(tmpPath, settingsPath);
}
