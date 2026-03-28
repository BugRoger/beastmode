export interface ParsedCommand {
  command: "run" | "watch" | "status" | "help";
  args: string[];
}

const COMMANDS = new Set(["run", "watch", "status", "help"]);

export function parseArgs(argv: string[]): ParsedCommand {
  // Bun: argv[0] = bun, argv[1] = script path, rest = user args
  const userArgs = argv.slice(2);

  if (userArgs.length === 0) {
    return { command: "help", args: [] };
  }

  const command = userArgs[0];
  if (!COMMANDS.has(command)) {
    console.error(`Unknown command: ${command}`);
    console.error(`Available commands: run, watch, status`);
    process.exit(1);
  }

  return {
    command: command as ParsedCommand["command"],
    args: userArgs.slice(1),
  };
}
