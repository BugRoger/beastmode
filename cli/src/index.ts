#!/usr/bin/env bun

import { parseArgs } from "./args";
import { loadConfig } from "./config";
import { createLogger, createStdioSink } from "./logger";
import { phaseCommand } from "./commands/phase";
import { cancelCommand } from "./commands/cancel";
import { compactCommand } from "./commands/compact";
import { dashboardCommand } from "./commands/dashboard";
import { storeCommand } from "./commands/store";
import { hooksCommand } from "./commands/hooks";
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
  beastmode dashboard                  Fullscreen pipeline dashboard
  beastmode store <subcommand>         Structured task store operations
  beastmode hooks <name> [phase]       Run a hook handler
  beastmode help                       Show this help message

Store subcommands:
  store epic ls                        List all epics
  store epic show <id> [--deps]        Show epic details
  store epic add --name="X"            Create epic
  store epic update <id> [--field=X]   Update epic
  store epic delete <id>               Delete epic and features
  store feature ls <epic-id>           List features for epic
  store feature show <id> [--deps]     Show feature details
  store feature add --parent=<id> --name="X"  Create feature
  store feature update <id> [--field=X]       Update feature
  store feature delete <id>            Delete feature
  store ready [<epic-id>] [--type=X]   List unblocked entities
  store blocked                        List blocked entities
  store tree [<id>]                    Show entity hierarchy
  store search [--name=X] [--status=X] [--type=X]  Search entities

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
    case "dashboard":
      await dashboardCommand(config, args, verbosity);
      break;
    case "cancel":
      await cancelCommand(args, config, verbosity, force);
      break;
    case "compact":
      await compactCommand();
      break;
    case "store":
      await storeCommand(args);
      break;
    case "hooks":
      await hooksCommand(args);
      break;
    case "help":
      printHelp();
      break;
  }
}

main().catch((err) => {
  const logger = createLogger(createStdioSink(0), {});
  logger.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
