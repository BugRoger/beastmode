import { resolve } from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { BeastmodeConfig } from "../config.js";
import { createLogger } from "../logger.js";
import { WatchLoop } from "../watch.js";
import type { WatchDeps } from "../watch.js";
import { scanEpics } from "../state-scanner.js";
import {
  selectStrategy,
  dispatchPhase,
  ReconcilingFactory,
} from "../watch-command.js";
import { SdkSessionFactory } from "../session.js";
import type { SessionFactory } from "../session.js";
import { CmuxSessionFactory } from "../cmux-session.js";
import { CmuxClient } from "../cmux-client.js";
import { ITermSessionFactory } from "../it2-session.js";
import { It2Client } from "../it2-client.js";
import type { SessionResult } from "../watch-types.js";
import { discoverGitHub } from "../github-discovery.js";

/** Discover the project root (walks up to find .beastmode/). */
function findProjectRoot(from: string = process.cwd()): string {
  let dir = from;
  while (dir !== "/") {
    if (existsSync(resolve(dir, ".beastmode"))) return dir;
    dir = resolve(dir, "..");
  }
  throw new Error("Not inside a beastmode project (no .beastmode/ found)");
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

  writeFileSync(runsPath, JSON.stringify(runs, null, 2));
}

export async function dashboardCommand(
  config: BeastmodeConfig,
  _args: string[] = [],
  verbosity: number = 0,
): Promise<void> {
  const projectRoot = findProjectRoot();
  const logger = createLogger(verbosity, "dashboard");

  // --- Build session factory (mirrors watch command) ---
  const selected = await selectStrategy(
    config.cli["dispatch-strategy"] ?? "sdk",
    undefined,
    logger,
  );

  let innerFactory: SessionFactory;
  if (selected.strategy === "cmux") {
    innerFactory = new CmuxSessionFactory(new CmuxClient());
  } else if (selected.strategy === "iterm2") {
    innerFactory = new ITermSessionFactory(new It2Client());
  } else {
    innerFactory = new SdkSessionFactory(dispatchPhase);
  }

  const sessionFactory = new ReconcilingFactory(innerFactory, projectRoot, logger);

  // Pre-discover GitHub metadata (non-blocking)
  if (config.github.enabled) {
    try {
      const resolved = await discoverGitHub(
        projectRoot,
        config.github["project-name"],
        logger,
      );
      if (resolved) {
        sessionFactory.resolved = resolved;
      }
    } catch (err) {
      logger.warn(`GitHub discovery failed (non-blocking): ${err}`);
    }
  }

  // --- Create WatchLoop with signal handlers disabled (Ink handles signals) ---
  const deps: WatchDeps = {
    scanEpics,
    sessionFactory,
    logRun,
    logger,
  };

  const loop = new WatchLoop(
    {
      intervalSeconds: config.cli.interval ?? 60,
      projectRoot,
      installSignalHandlers: false,
    },
    deps,
  );

  // --- Dynamic import React/Ink, render App ---
  const { render } = await import("ink");
  const React = await import("react");
  const { default: App } = await import("../dashboard/App.js");

  // Enter alternate screen buffer
  process.stdout.write("\x1b[?1049h");

  const { waitUntilExit } = render(
    React.createElement(App, { config, verbosity, loop, projectRoot }),
  );

  // Start the watch loop after rendering so events flow to the React tree
  try {
    await loop.start();
  } catch (err) {
    // Lockfile conflict — log but don't crash, dashboard still shows state
    logger.error(`${err}`);
  }

  try {
    await waitUntilExit();
  } finally {
    if (loop.isRunning()) {
      await loop.stop();
    }
    process.stdout.write("\x1b[?1049l");
  }
}
