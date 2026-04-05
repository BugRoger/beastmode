import { resolve } from "node:path";
import { existsSync } from "node:fs";
import type { BeastmodeConfig } from "../config.js";
import { WatchLoop } from "./watch-loop.js";
import type { WatchDeps } from "./watch-loop.js";
import { listEnriched } from "../manifest/store.js";
import {
  dispatchPhase,
  ReconcilingFactory,
  selectStrategy,
} from "./watch.js";
import { SdkSessionFactory } from "../dispatch/factory.js";
import type { SessionFactory } from "../dispatch/factory.js";
import { CmuxSessionFactory, CmuxClient } from "../dispatch/cmux.js";
import { ITermSessionFactory, It2Client } from "../dispatch/it2.js";
import { discoverGitHub } from "../github/discovery.js";
import { FallbackEntryStore } from "../dashboard/lifecycle-entries.js";
import { createLogger } from "../logger.js";
import { DashboardSink } from "../dashboard/dashboard-sink.js";
import type { SystemEntryRef } from "../dashboard/dashboard-logger.js";

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

  // Shared entry stores — both the dashboard logger and the React App read from these
  const fallbackStore = new FallbackEntryStore();
  let systemSeqCounter = 0;
  const systemRef: SystemEntryRef = {
    entries: [],
    nextSeq: () => systemSeqCounter++,
  };

  const dashboardSink = new DashboardSink({ fallbackStore, systemRef });
  const logger = createLogger(dashboardSink);

  // --- Select dispatch strategy from config (same as watch command) ---
  const selected = await selectStrategy(config.cli["dispatch-strategy"] ?? "sdk", undefined, logger);
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
    React.createElement(App, { config, verbosity, loop, projectRoot, fallbackStore, systemRef }),
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
