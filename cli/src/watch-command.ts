/**
 * Watch command handler — entry point for `beastmode watch`.
 *
 * Wires the watch loop to the real state scanner, SDK dispatcher,
 * and run logger.
 */

import { resolve } from "node:path";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { loadConfig } from "./config.js";
import { WatchLoop } from "./watch.js";
import type { WatchDeps } from "./watch.js";
import type { EpicState, SessionResult, NextAction, FeatureProgress } from "./watch-types.js";
import * as worktree from "./worktree.js";

/** Discover the project root (walks up to find .beastmode/). */
function findProjectRoot(from: string = process.cwd()): string {
  let dir = from;
  while (dir !== "/") {
    if (existsSync(resolve(dir, ".beastmode"))) return dir;
    dir = resolve(dir, "..");
  }
  throw new Error("Not inside a beastmode project (no .beastmode/ found)");
}

/** Scan manifests to determine epic states. Minimal inline scanner. */
async function scanEpics(projectRoot: string): Promise<EpicState[]> {
  // Dynamically import state-scanner if available, otherwise use inline logic
  try {
    const scanner = await import("./state-scanner.js");
    return scanner.scanEpics(projectRoot);
  } catch {
    // Fallback: inline manifest scanner
    return scanEpicsInline(projectRoot);
  }
}

/** Inline epic scanner — reads manifests from .beastmode/state/plan/. */
function scanEpicsInline(projectRoot: string): EpicState[] {
  const planDir = resolve(projectRoot, ".beastmode", "state", "plan");
  if (!existsSync(planDir)) return [];

  const { readdirSync } = require("node:fs") as typeof import("node:fs");
  const files = readdirSync(planDir).filter((f: string) =>
    f.endsWith(".manifest.json"),
  );

  const epics: EpicState[] = [];

  for (const file of files) {
    try {
      const content = readFileSync(resolve(planDir, file), "utf-8");
      const manifest = JSON.parse(content);

      // Derive slug from filename: YYYY-MM-DD-<slug>.manifest.json
      const slug = file.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(".manifest.json", "");

      const features: FeatureProgress[] = (manifest.features ?? []).map(
        (f: { slug: string; status: string }) => ({
          slug: f.slug,
          status: f.status as FeatureProgress["status"],
        }),
      );

      const allCompleted = features.length > 0 && features.every((f) => f.status === "completed");
      const pendingFeatures = features.filter((f) => f.status === "pending");
      const hasDesign = existsSync(resolve(projectRoot, manifest.design ?? ""));

      let phase: string;
      let nextAction: NextAction | null = null;
      let gateBlocked = false;

      if (features.length === 0 && hasDesign) {
        // Design exists but no features planned yet
        phase = "design";
        nextAction = { phase: "plan", args: [slug], type: "single" };
      } else if (allCompleted) {
        // All features done — needs validate
        phase = "implement";
        nextAction = { phase: "validate", args: [slug], type: "single" };
      } else if (pendingFeatures.length > 0) {
        // Has pending features — implement fan-out
        phase = "implement";
        nextAction = {
          phase: "implement",
          args: [slug],
          type: "fan-out",
          features: pendingFeatures.map((f) => f.slug),
        };
      } else {
        // In progress or blocked
        phase = "implement";
        nextAction = null;
      }

      // Check for human gates in config
      const config = loadConfig(projectRoot);
      const gateConfig = config.gates?.implement;
      if (gateConfig) {
        for (const [_gate, mode] of Object.entries(gateConfig)) {
          if (mode === "human") {
            // Check if any feature has a blocked status indicating gate hit
            const blocked = features.some((f) => f.status === "blocked" as string);
            if (blocked) {
              gateBlocked = true;
              break;
            }
          }
        }
      }

      // Aggregate cost from .beastmode-runs.json
      let costUsd = 0;
      const runsPath = resolve(projectRoot, ".beastmode-runs.json");
      if (existsSync(runsPath)) {
        try {
          const runs = JSON.parse(readFileSync(runsPath, "utf-8")) as Array<{
            epic: string;
            cost_usd: number;
          }>;
          costUsd = runs
            .filter((r) => r.epic === slug)
            .reduce((sum, r) => sum + (r.cost_usd ?? 0), 0);
        } catch {
          // Corrupted runs file — ignore
        }
      }

      epics.push({
        slug,
        phase,
        nextAction,
        features,
        gateBlocked,
        costUsd,
      });
    } catch {
      // Skip unparseable manifests
    }
  }

  return epics;
}

/** Dispatch a phase using the Claude Agent SDK. */
async function dispatchPhase(opts: {
  epicSlug: string;
  phase: string;
  args: string[];
  featureSlug?: string;
  projectRoot: string;
  signal: AbortSignal;
}): Promise<{
  id: string;
  worktreeSlug: string;
  promise: Promise<SessionResult>;
}> {
  const worktreeSlug = opts.featureSlug
    ? `${opts.epicSlug}-${opts.featureSlug}`
    : `${opts.epicSlug}-${opts.phase}`;

  // Create worktree
  const wt = await worktree.create(worktreeSlug, { cwd: opts.projectRoot });

  const id = `${worktreeSlug}-${Date.now()}`;
  const startTime = Date.now();

  const promise = (async (): Promise<SessionResult> => {
    try {
      // Try to use the Claude Agent SDK
      const sdk = await import("@anthropic-ai/claude-agent-sdk");
      const AgentClass = (sdk as Record<string, unknown>).ClaudeAgent ?? (sdk as Record<string, unknown>).default;
      if (typeof AgentClass !== "function") throw new Error("SDK not available");
      const prompt = `/beastmode:${opts.phase} ${opts.args.join(" ")}`;

      const agent = new (AgentClass as new (opts: Record<string, unknown>) => { query: () => Promise<{ exitCode: number; costUsd?: number }> })({
        cwd: wt.path,
        prompt,
        settingSources: ["project"],
        permissionMode: "bypassPermissions",
        abortSignal: opts.signal,
      });

      const result = await agent.query();

      return {
        success: result.exitCode === 0,
        exitCode: result.exitCode,
        costUsd: result.costUsd ?? 0,
        durationMs: Date.now() - startTime,
      };
    } catch (err: unknown) {
      // SDK not available — fall back to Bun.spawn of claude CLI
      const args = [
        "claude",
        "--print",
        `/beastmode:${opts.phase} ${opts.args.join(" ")}`,
        "--output-format",
        "json",
        "--dangerously-skip-permissions",
      ];

      const proc = Bun.spawn(args, {
        cwd: wt.path,
        stdout: "pipe",
        stderr: "pipe",
        signal: opts.signal,
      });

      const [stdout] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);

      const exitCode = await proc.exited;

      // Try to parse cost from JSON output
      let costUsd = 0;
      try {
        const output = JSON.parse(stdout);
        costUsd = output.cost_usd ?? 0;
      } catch {
        // Non-JSON output — no cost info
      }

      return {
        success: exitCode === 0,
        exitCode,
        costUsd,
        durationMs: Date.now() - startTime,
      };
    }
  })();

  return { id, worktreeSlug, promise };
}

/** Append a run entry to .beastmode-runs.json. */
async function logRun(opts: {
  epicSlug: string;
  phase: string;
  featureSlug?: string;
  result: SessionResult;
  projectRoot: string;
}): Promise<void> {
  const runsPath = resolve(opts.projectRoot, ".beastmode-runs.json");

  let runs: unknown[] = [];
  if (existsSync(runsPath)) {
    try {
      runs = JSON.parse(readFileSync(runsPath, "utf-8"));
    } catch {
      runs = [];
    }
  }

  runs.push({
    epic: opts.epicSlug,
    phase: opts.phase,
    feature: opts.featureSlug ?? null,
    cost_usd: opts.result.costUsd,
    duration_ms: opts.result.durationMs,
    exit_status: opts.result.exitCode,
    timestamp: new Date().toISOString(),
  });

  // Ensure directory exists
  const dir = resolve(opts.projectRoot);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  writeFileSync(runsPath, JSON.stringify(runs, null, 2));
}

/** Main entry point for `beastmode watch`. */
export async function watchCommand(_args: string[]): Promise<void> {
  const projectRoot = findProjectRoot();
  const config = loadConfig(projectRoot);

  const deps: WatchDeps = {
    scanEpics,
    dispatchPhase,
    logRun,
  };

  const loop = new WatchLoop(
    {
      intervalSeconds: config.cli.interval ?? 60,
      projectRoot,
    },
    deps,
  );

  await loop.start();
}
