#!/usr/bin/env bun

import { parseArgs } from "./args";
import { loadConfig } from "./config";
import { phaseCommand } from "./commands/phase";
import { watchCommand } from "./commands/watch";
import { statusCommand } from "./commands/status";
import { cancelCommand } from "./commands/cancel";
import { isValidPhase } from "./types";

const VERSION = "0.1.0";

function printHelp(): void {
  console.log(`beastmode v${VERSION}

Usage:
  beastmode design <topic>             Start a new design
  beastmode plan <slug>                Plan features for a design
  beastmode implement <slug> [feature] Implement a feature
  beastmode validate <slug>            Run validation checks
  beastmode release <slug>             Create a release
  beastmode cancel <slug>              Cancel and clean up an epic
  beastmode watch                      Autonomous pipeline orchestration
  beastmode status [--all] [--watch|-w] Show pipeline status
  beastmode help                       Show this help message`);
}

async function main(): Promise<void> {
  const { command, args } = parseArgs(process.argv);
  const projectRoot = process.cwd();
  const config = loadConfig(projectRoot);

  if (isValidPhase(command)) {
    await phaseCommand(command, args, config);
    return;
  }

  switch (command) {
    case "watch":
      await watchCommand(config);
      break;
    case "status":
      await statusCommand(config, args);
      break;
    case "cancel":
      await cancelCommand(args, config);
      break;
    case "help":
      printHelp();
      break;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
