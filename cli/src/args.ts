import { VALID_PHASES, type Phase } from "./types";

/** Utility commands (not phases) */
const UTILITY_COMMANDS = new Set(["watch", "status", "cancel", "compact", "help"]);

/** All recognized top-level commands: phases + utilities */
const ALL_COMMANDS = new Set([...VALID_PHASES, ...UTILITY_COMMANDS]);

export type Command = Phase | "watch" | "status" | "cancel" | "compact" | "help";

export interface ParsedCommand {
  command: Command;
  args: string[];
}

export function parseArgs(argv: string[]): ParsedCommand {
  // Bun: argv[0] = bun, argv[1] = script path, rest = user args
  const userArgs = argv.slice(2);

  if (userArgs.length === 0) {
    return { command: "help", args: [] };
  }

  const command = userArgs[0];

  if (!ALL_COMMANDS.has(command)) {
    console.error(`Unknown command: ${command}`);
    console.error(
      `Phases: ${VALID_PHASES.join(", ")}`,
    );
    console.error(`Other: watch, status, cancel, compact, help`);
    process.exit(1);
  }

  return {
    command: command as Command,
    args: userArgs.slice(1),
  };
}
