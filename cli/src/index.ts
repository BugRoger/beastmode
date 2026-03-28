#!/usr/bin/env bun

import { parseArgs } from "./args";
import { loadConfig } from "./config";
import { runCommand } from "./commands/run";
import { watchCommand } from "./commands/watch";
import { statusCommand } from "./commands/status";

const VERSION = "0.1.0";

function printHelp(): void {
  console.log(`beastmode v${VERSION}

Usage:
  beastmode run <phase> <slug>    Execute a phase in a worktree
  beastmode watch                 Autonomous pipeline orchestration
  beastmode status                Show epic state and cost summary
  beastmode help                  Show this help message

Phases:
  design, plan, implement, validate, release`);
}

async function main(): Promise<void> {
  const { command, args } = parseArgs(process.argv);
  const projectRoot = process.cwd();
  const config = loadConfig(projectRoot);

  switch (command) {
    case "run":
      await runCommand(args, config);
      break;
    case "watch":
      await watchCommand(config);
      break;
    case "status":
      await statusCommand(config);
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
