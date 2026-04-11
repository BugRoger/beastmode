/**
 * pre-tool-use.ts — HITL settings composition and PreToolUse command hook.
 *
 * Combines settings management (reading/writing settings.local.json with HITL hooks)
 * and command hook construction for AskUserQuestion auto-answering.
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
  /** Store feature slug (with ordinal suffix) for the Stop hook */
  feature?: string;
}

// --- Types from hitl-prompt.ts ---

/** Shape of a single PreToolUse command hook entry in settings.local.json */
export interface PromptHookEntry {
  matcher: string;
  hooks: Array<{
    type: "command";
    command: string;
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
  const { claudeDir, preToolUseHook, phase, feature } = options;
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

  // Add Stop hook for output.json generation
  const stopHook = buildStopHook(feature);
  settings.hooks.Stop = replaceHitlHook(
    settings.hooks.Stop,
    "",
    stopHook,
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
  // Remove Stop hook for output.json generation
  if (settings.hooks.Stop) {
    settings.hooks.Stop = settings.hooks.Stop.filter(
      (h) => !h.hooks?.some((hk) => hk.command?.includes("generate-output")),
    );
    if (settings.hooks.Stop.length === 0) {
      delete settings.hooks.Stop;
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
 * Calls hitl-log via portable CLI with the phase argument.
 */
function buildPostToolUseHook(phase: string): HookEntry {
  return {
    matcher: "AskUserQuestion",
    hooks: [
      {
        type: "command",
        command: `bunx beastmode hooks hitl-log ${phase}`,
      },
    ],
  };
}

/**
 * Build the Stop hook for output.json generation.
 * Calls generate-output via portable CLI after Claude finishes responding.
 */
function buildStopHook(): HookEntry {
  return {
    matcher: "",
    hooks: [
      {
        type: "command",
        command: `bunx beastmode hooks generate-output`,
      },
    ],
  };
}

// --- Functions from hitl-settings.ts (cont'd) ---

/**
 * Build the PreToolUse command hook entry for AskUserQuestion.
 *
 * @param phase — The current pipeline phase name
 * @returns A single hook entry targeting AskUserQuestion with a command hook
 */
export function buildPreToolUseHook(phase: string): PromptHookEntry {
  return {
    matcher: "AskUserQuestion",
    hooks: [
      {
        type: "command",
        command: `bunx beastmode hooks hitl-auto ${phase}`,
      },
    ],
  };
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

// --- SessionStart hook settings ---

export interface WriteSessionStartHookOptions {
  claudeDir: string;
  phase: string;
  epic: string;
  slug: string;
  feature?: string;
}

/**
 * Build the SessionStart command hook entry.
 * Sets BEASTMODE_* env vars inline and calls the session-start subcommand.
 */
export function buildSessionStartHook(opts: { phase: string; epic: string; slug: string; feature?: string }): HookEntry {
  const envParts = [
    `BEASTMODE_PHASE=${opts.phase}`,
    `BEASTMODE_EPIC=${opts.epic}`,
    `BEASTMODE_SLUG=${opts.slug}`,
  ];
  if (opts.feature) {
    envParts.push(`BEASTMODE_FEATURE=${opts.feature}`);
  }
  return {
    matcher: "",
    hooks: [
      {
        type: "command",
        command: `${envParts.join(" ")} bunx beastmode hooks session-start`,
      },
    ],
  };
}

/**
 * Write SessionStart hook to settings.local.json.
 * Preserves all existing keys and replaces only the SessionStart hook.
 */
export function writeSessionStartHook(options: WriteSessionStartHookOptions): void {
  const { claudeDir, phase, epic, slug, feature } = options;
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

  const hook = buildSessionStartHook({ phase, epic, slug, feature });
  settings.hooks.SessionStart = [hook];

  mkdirSync(claudeDir, { recursive: true });
  const tmpPath = settingsPath + ".tmp";
  writeFileSync(tmpPath, JSON.stringify(settings, null, 2) + "\n");
  renameSync(tmpPath, settingsPath);
}

/**
 * Remove SessionStart hook from settings.local.json.
 */
export function cleanSessionStartHook(claudeDir: string): void {
  const settingsPath = resolve(claudeDir, "settings.local.json");
  if (!existsSync(settingsPath)) return;

  let settings: SettingsLocal;
  try {
    settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
  } catch {
    return;
  }

  if (!settings.hooks) return;

  delete settings.hooks.SessionStart;

  if (Object.keys(settings.hooks).length === 0) {
    delete settings.hooks;
  }

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
}
