/**
 * `beastmode hooks <name> [phase]`
 *
 * Dispatch subcommand to hook handler functions.
 * Preserves existing hook protocol: phase as positional argv,
 * TOOL_INPUT and TOOL_OUTPUT as environment variables.
 *
 * Exits 0 always for hook handlers (hook failure must never block Claude).
 * Exception: session-start exits non-zero on missing inputs (fail-fast contract).
 * Exits 1 for unknown subcommands.
 */

import { execSync } from "node:child_process";
import { resolve, basename, dirname } from "node:path";
import { mkdirSync, appendFileSync, existsSync, statSync } from "node:fs";
import { loadConfig } from "../config.js";
import { getPhaseHitlProse } from "../hooks/hitl-settings.js";
import { decideResponse } from "../hooks/hitl-auto.js";
import { routeAndFormat } from "../hooks/hitl-log.js";
import { generateAll } from "../hooks/generate-output.js";

const VALID_HOOKS = ["hitl-auto", "hitl-log", "generate-output", "session-start"];

export async function hooksCommand(args: string[]): Promise<void> {
  const hookName = args[0];

  if (!hookName) {
    process.stderr.write("Usage: beastmode hooks <hitl-auto|hitl-log|generate-output|session-start> [phase]\n");
    process.exit(1);
  }

  if (!VALID_HOOKS.includes(hookName)) {
    process.stderr.write(`Unknown hook: ${hookName}\nValid hooks: ${VALID_HOOKS.join(", ")}\n`);
    process.exit(1);
  }

  // session-start has its own error handling — exits non-zero on failure
  if (hookName === "session-start") {
    runSessionStart();
    return;
  }

  try {
    switch (hookName) {
      case "hitl-auto":
        runHitlAuto(args.slice(1));
        break;
      case "hitl-log":
        runHitlLog(args.slice(1));
        break;
      case "generate-output":
        runGenerateOutput();
        break;
    }
  } catch {
    // Silent exit — hook failure must never block Claude
  }
  process.exit(0);
}

function runSessionStart(): void {
  const phase = process.env.BEASTMODE_PHASE;
  const epic = process.env.BEASTMODE_EPIC;
  const slug = process.env.BEASTMODE_SLUG;

  if (!phase || !epic || !slug) {
    const missing = [
      !phase && "BEASTMODE_PHASE",
      !epic && "BEASTMODE_EPIC",
      !slug && "BEASTMODE_SLUG",
    ].filter(Boolean).join(", ");
    process.stderr.write(`session-start: missing required env vars: ${missing}\n`);
    process.exit(1);
  }

  const output = {
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: `Phase: ${phase}, Epic: ${epic}, Slug: ${slug}`,
    },
  };
  process.stdout.write(JSON.stringify(output));
}

function runHitlAuto(args: string[]): void {
  const phase = args[0];
  if (!phase) return;

  const rawToolInput = process.env.TOOL_INPUT;
  if (!rawToolInput) return;

  const repoRoot = execSync("git rev-parse --show-toplevel", {
    encoding: "utf-8",
  }).trim();
  const config = loadConfig(repoRoot);
  const prose = getPhaseHitlProse(config.hitl, phase);

  const response = decideResponse(prose, rawToolInput);
  if (response) {
    process.stdout.write(response);
  }
}

function runHitlLog(args: string[]): void {
  const phase = args[0];
  if (!phase) return;

  const rawInput = process.env.TOOL_INPUT;
  const rawOutput = process.env.TOOL_OUTPUT;
  if (!rawInput || !rawOutput) return;

  const entry = routeAndFormat(rawInput, rawOutput);
  if (!entry) return;

  const repoRoot = execSync("git rev-parse --show-toplevel", {
    encoding: "utf-8",
  }).trim();
  const logPath = resolve(
    repoRoot,
    ".beastmode",
    "artifacts",
    phase,
    "hitl-log.md",
  );

  const logDir = dirname(logPath);
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }

  appendFileSync(logPath, entry + "\n");
}

function runGenerateOutput(): void {
  const repoRoot = execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
  const artifactsDir = resolve(repoRoot, ".beastmode", "artifacts");

  let isWorktree = false;
  try {
    const dotGit = resolve(repoRoot, ".git");
    isWorktree = statSync(dotGit).isFile();
  } catch {
    // not a worktree
  }
  const worktreeSlug = isWorktree ? basename(repoRoot) : undefined;
  generateAll(artifactsDir, isWorktree ? "changed" : "all", worktreeSlug);
}
