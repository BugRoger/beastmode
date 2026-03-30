import { VALID_PHASES, type Phase } from "./types";

const UTILITY_COMMANDS = new Set(["watch", "status", "cancel", "help"]);
const ALL_COMMANDS = new Set([...VALID_PHASES, ...UTILITY_COMMANDS]);

export type Command = Phase | "watch" | "status" | "cancel" | "help";

export interface ParsedCommand {
  command: Command;
  args: string[];
  verbosity: number;
}

/**
 * Count -v flag occurrences and return remaining args.
 * Handles: -v (1), -vv (2), -vvv (3), -v -v -v (3), no flags (0).
 */
export function parseVerbosity(args: string[]): { verbosity: number; rest: string[] } {
  let verbosity = 0;
  const rest: string[] = [];

  for (const arg of args) {
    if (/^-v+$/.test(arg)) {
      verbosity += arg.length - 1; // -v = 1, -vv = 2, -vvv = 3
    } else {
      rest.push(arg);
    }
  }

  return { verbosity, rest };
}

export function parseArgs(argv: string[]): ParsedCommand {
  const userArgs = argv.slice(2);

  if (userArgs.length === 0) {
    return { command: "help", args: [], verbosity: 0 };
  }

  const command = userArgs[0];

  if (!ALL_COMMANDS.has(command)) {
    process.stderr.write(`Unknown command: ${command}\n`);
    process.stderr.write(`Phases: ${VALID_PHASES.join(", ")}\n`);
    process.stderr.write(`Other: watch, status, cancel, help\n`);
    process.exit(1);
  }

  const { verbosity, rest } = parseVerbosity(userArgs.slice(1));

  return {
    command: command as Command,
    args: rest,
    verbosity,
  };
}
