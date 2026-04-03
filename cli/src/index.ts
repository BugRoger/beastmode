#!/usr/bin/env bun

import { parseArgs } from "./args";
import { loadConfig } from "./config";
import { createLogger } from "./logger";
import { phaseCommand } from "./commands/phase";
import { watchCommand } from "./commands/watch";
import { statusCommand } from "./commands/status";
import { cancelCommand } from "./commands/cancel";
import { compactCommand } from "./commands/compact";
import { dashboardCommand } from "./commands/dashboard";
import { isValidPhase } from "./types";

const VERSION = "0.1.0";

function printHelp(): void {
  process.stdout.write(`beastmode v${VERSION}

Usage:
  beastmode design [topic]             Start a new design
  beastmode plan <slug>                Plan features for a design
  beastmode implement <slug> [feature] Implement a feature
  beastmode validate <slug>            Run validation checks
  beastmode release <slug>             Create a release
  beastmode cancel <slug> [--force]   Cancel and clean up an epic
  beastmode compact                    Audit and compact the context tree
  beastmode watch                      Autonomous pipeline orchestration
  beastmode status [--all] [--watch|-w] Show pipeline status
  beastmode dashboard                  Fullscreen pipeline dashboard
  beastmode help                       Show this help message

Flags:
  -v, -vv, -vvv                    Increase output verbosity
  --yes, -y                        Skip confirmation prompts (phase regression)
  --force                          Skip confirmation prompt (cancel)
`);
}

async function main(): Promise<void> {
  const { command, args, verbosity, force } = parseArgs(process.argv);
  const projectRoot = process.cwd();
  const config = loadConfig(projectRoot);

  if (isValidPhase(command)) {
    await phaseCommand(command, args, config, verbosity);
    return;
  }

  switch (command) {
    case "watch":
      await watchCommand(args, verbosity);
      break;
    case "status":
      await statusCommand(config, args, verbosity);
      break;
    case "dashboard":
      await dashboardCommand(config, args, verbosity);
      break;
    case "cancel":
      await cancelCommand(args, config, verbosity, force);
      break;
    case "compact":
      await compactCommand();
      break;
    case "help":
      printHelp();
      break;
  }
}

main().catch((err) => {
  const logger = createLogger(0, {});
  logger.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
