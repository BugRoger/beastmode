import { VALID_PHASES, type Command } from "./types";

/** Utility commands (not phases) */
const UTILITY_COMMANDS = new Set(["watch", "status", "cancel", "compact", "dashboard", "store", "help"]);

/** All recognized top-level commands: phases + utilities */
const ALL_COMMANDS = new Set([...VALID_PHASES, ...UTILITY_COMMANDS]);

export interface ParsedCommand {
  command: Command;
  args: string[];
  verbosity: number;
  force: boolean;
}

/**
 * Parse -v / -vv / -vvv flags from an args array.
 * Returns the verbosity count and remaining args with -v flags stripped.
 */
export function parseVerbosity(args: string[]): { verbosity: number; rest: string[] } {
  let verbosity = 0;
  const rest: string[] = [];

  for (const arg of args) {
    if (/^-v+$/.test(arg)) {
      verbosity += arg.length - 1; // count v's after the dash
    } else {
      rest.push(arg);
    }
  }

  return { verbosity, rest };
}

/**
 * Extract --force flag from an args array.
 * Returns whether the flag was present and remaining args with --force stripped.
 */
export function parseForce(args: string[]): { force: boolean; rest: string[] } {
  const rest: string[] = [];
  let force = false;

  for (const arg of args) {
    if (arg === "--force") {
      force = true;
    } else {
      rest.push(arg);
    }
  }

  return { force, rest };
}

export function parseArgs(argv: string[]): ParsedCommand {
  // Bun: argv[0] = bun, argv[1] = script path, rest = user args
  const userArgs = argv.slice(2);

  if (userArgs.length === 0) {
    return { command: "help", args: [], verbosity: 0, force: false };
  }

  const command = userArgs[0];

  if (!ALL_COMMANDS.has(command)) {
    process.stderr.write(`Unknown command: ${command}\n`);
    process.stderr.write(`Phases: ${VALID_PHASES.join(", ")}\n`);
    process.stderr.write(`Other: watch, status, cancel, compact, dashboard, help\n`);
    process.exit(1);
  }

  const { verbosity, rest } = parseVerbosity(userArgs.slice(1));

  // Extract --force for cancel command
  if (command === "cancel") {
    const { force, rest: finalArgs } = parseForce(rest);
    return {
      command: command as Command,
      args: finalArgs,
      verbosity,
      force,
    };
  }

  return {
    command: command as Command,
    args: rest,
    verbosity,
    force: false,
  };
}
