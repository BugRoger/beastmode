import { findProjectRoot } from "../config.js";
import { JsonFileStore } from "../store/json-file-store.js";
import { join } from "path";

function jsonOut(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

function jsonError(message: string): never {
  process.stderr.write(JSON.stringify({ error: message }) + "\n");
  process.exit(1);
}

/** Parse --key=value flags from args array */
export function parseFlags(args: string[]): { positional: string[]; flags: Record<string, string> } {
  const positional: string[] = [];
  const flags: Record<string, string> = {};

  for (const arg of args) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) {
      flags[match[1]] = match[2];
    } else if (arg.startsWith("--")) {
      flags[arg.slice(2)] = "true";
    } else {
      positional.push(arg);
    }
  }

  return { positional, flags };
}

export async function storeCommand(args: string[]): Promise<void> {
  if (args.length === 0) {
    jsonError("Usage: beastmode store <subcommand>");
  }

  const subcommand = args[0];
  const subArgs = args.slice(1);

  const projectRoot = findProjectRoot();
  const storePath = join(projectRoot, ".beastmode", "state", "store.json");
  const store = new JsonFileStore(storePath);

  switch (subcommand) {
    case "epic":
      await epicCommand(store, subArgs);
      break;
    case "feature":
      await featureCommand(store, subArgs);
      break;
    case "ready":
      await readyCommand(store, subArgs);
      break;
    case "blocked":
      await blockedCommand(store);
      break;
    case "tree":
      await treeCommand(store, subArgs);
      break;
    case "search":
      await searchCommand(store, subArgs);
      break;
    default:
      jsonError(`Unknown store subcommand: ${subcommand}`);
  }
}

async function epicCommand(store: JsonFileStore, args: string[]): Promise<void> {
  jsonError("Not implemented yet");
}

async function featureCommand(store: JsonFileStore, args: string[]): Promise<void> {
  jsonError("Not implemented yet");
}

async function readyCommand(store: JsonFileStore, args: string[]): Promise<void> {
  jsonError("Not implemented yet");
}

async function blockedCommand(store: JsonFileStore): Promise<void> {
  jsonError("Not implemented yet");
}

async function treeCommand(store: JsonFileStore, args: string[]): Promise<void> {
  jsonError("Not implemented yet");
}

async function searchCommand(store: JsonFileStore, args: string[]): Promise<void> {
  jsonError("Not implemented yet");
}
