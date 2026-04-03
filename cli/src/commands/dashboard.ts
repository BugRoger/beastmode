import { resolve } from "node:path";
import { existsSync } from "node:fs";
import type { BeastmodeConfig } from "../config.js";
import { createLogger } from "../logger.js";
import { WatchLoop } from "./watch-loop.js";
import type { WatchDeps } from "./watch-loop.js";
import { listEnriched } from "../manifest/store.js";
import {
  dispatchPhase,
  ReconcilingFactory,
} from "./watch.js";
import { SdkSessionFactory } from "../dispatch/factory.js";
import type { SessionFactory } from "../dispatch/factory.js";
import { discoverGitHub } from "../github/discovery.js";

/** Discover the project root (walks up to find .beastmode/). */
function findProjectRoot(from: string = process.cwd()): string {
  let dir = from;
  while (dir !== "/") {
    if (existsSync(resolve(dir, ".beastmode"))) return dir;
    dir = resolve(dir, "..");
  }
  throw new Error("Not inside a beastmode project (no .beastmode/ found)");
}

export async function dashboardCommand(
  config: BeastmodeConfig,
  _args: string[] = [],
  verbosity: number = 0,
): Promise<void> {
  const projectRoot = findProjectRoot();
  const logger = createLogger(verbosity, {});

  // --- Dashboard always uses SDK dispatch for streaming support ---
  logger.log("Dashboard: forcing SDK dispatch strategy for streaming");
  const innerFactory: SessionFactory = new SdkSessionFactory(dispatchPhase);

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
    scanEpics: async (root: string) => listEnriched(root),
    sessionFactory,
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
