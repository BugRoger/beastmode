/**
 * hitl-settings.ts — Composes settings.local.json with HITL hooks.
 *
 * Reads existing settings.local.json (preserving enabledPlugins, etc.),
 * merges in PreToolUse and PostToolUse hooks for HITL, and writes back.
 * Handles cleanup between dispatches.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from "node:fs";
import { resolve, dirname } from "node:path";

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
        command: `bun run "$(git rev-parse --show-toplevel)/cli/src/hitl-log.ts" ${phase}`,
      },
    ],
  };
}
