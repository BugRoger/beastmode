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

export async function epicCommand(store: JsonFileStore, args: string[]): Promise<void> {
  if (args.length === 0) jsonError("Usage: beastmode store epic <ls|show|add|update|delete>");

  const action = args[0];
  const actionArgs = args.slice(1);

  switch (action) {
    case "ls": {
      const result = await store.transact(s => s.listEpics());
      jsonOut(result);
      break;
    }
    case "show": {
      const { positional, flags } = parseFlags(actionArgs);
      if (positional.length === 0) jsonError("Usage: beastmode store epic show <id-or-slug>");
      const result = await store.transact(s => {
        const entity = s.find(positional[0]);
        if (!entity || entity.type !== "epic") throw new Error(`Epic not found: ${positional[0]}`);
        if (flags["deps"] === "true") {
          return { ...entity, deps: s.dependencyChain(entity.id) };
        }
        return entity;
      });
      jsonOut(result);
      break;
    }
    case "add": {
      const { flags } = parseFlags(actionArgs);
      if (!flags["name"]) jsonError("Usage: beastmode store epic add --name=\"X\"");
      const result = await store.transact(s => s.addEpic({ name: flags["name"], slug: flags["slug"] }));
      jsonOut(result);
      break;
    }
    case "update": {
      const { positional, flags } = parseFlags(actionArgs);
      if (positional.length === 0) jsonError("Usage: beastmode store epic update <id> [--field=value]");
      const result = await store.transact(s => {
        const entity = s.find(positional[0]);
        if (!entity || entity.type !== "epic") throw new Error(`Epic not found: ${positional[0]}`);
        const epicId = entity.id;

        const patch: Record<string, unknown> = {};
        if (flags["name"]) patch.name = flags["name"];
        if (flags["slug"]) patch.slug = flags["slug"];
        if (flags["status"]) patch.status = flags["status"];
        if (flags["summary"]) patch.summary = flags["summary"];
        if (flags["design"]) patch.design = flags["design"];
        if (flags["validate"]) patch.validate = flags["validate"];
        if (flags["release"]) patch.release = flags["release"];

        if (flags["add-dep"]) {
          const current = s.getEpic(epicId)!;
          const deps = [...current.depends_on];
          if (!deps.includes(flags["add-dep"])) deps.push(flags["add-dep"]);
          patch.depends_on = deps;
        }
        if (flags["rm-dep"]) {
          const current = s.getEpic(epicId)!;
          patch.depends_on = current.depends_on.filter((d: string) => d !== flags["rm-dep"]);
        }

        return s.updateEpic(epicId, patch as any);
      });
      jsonOut(result);
      break;
    }
    case "delete": {
      const { positional } = parseFlags(actionArgs);
      if (positional.length === 0) jsonError("Usage: beastmode store epic delete <id>");
      await store.transact(s => {
        const entity = s.find(positional[0]);
        if (!entity || entity.type !== "epic") throw new Error(`Epic not found: ${positional[0]}`);
        s.deleteEpic(entity.id);
      });
      jsonOut({ deleted: true });
      break;
    }
    default:
      jsonError(`Unknown epic action: ${action}`);
  }
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

// --- Testable helpers (bypass projectRoot resolution) ---

export async function epicLsTestable(store: JsonFileStore): Promise<any> {
  return store.transact(s => s.listEpics());
}

export async function epicShowTestable(store: JsonFileStore, args: string[]): Promise<any> {
  const { positional, flags } = parseFlags(args);
  return store.transact(s => {
    const entity = s.find(positional[0]);
    if (!entity || entity.type !== "epic") throw new Error(`Epic not found: ${positional[0]}`);
    if (flags["deps"] === "true") {
      return { ...entity, deps: s.dependencyChain(entity.id) };
    }
    return entity;
  });
}

export async function epicUpdateTestable(store: JsonFileStore, args: string[]): Promise<any> {
  const { positional, flags } = parseFlags(args);
  return store.transact(s => {
    const entity = s.find(positional[0]);
    if (!entity || entity.type !== "epic") throw new Error(`Epic not found: ${positional[0]}`);
    const epicId = entity.id;
    const patch: Record<string, unknown> = {};
    if (flags["name"]) patch.name = flags["name"];
    if (flags["slug"]) patch.slug = flags["slug"];
    if (flags["status"]) patch.status = flags["status"];
    if (flags["summary"]) patch.summary = flags["summary"];
    if (flags["design"]) patch.design = flags["design"];
    if (flags["validate"]) patch.validate = flags["validate"];
    if (flags["release"]) patch.release = flags["release"];
    if (flags["add-dep"]) {
      const current = s.getEpic(epicId)!;
      const deps = [...current.depends_on];
      if (!deps.includes(flags["add-dep"])) deps.push(flags["add-dep"]);
      patch.depends_on = deps;
    }
    if (flags["rm-dep"]) {
      const current = s.getEpic(epicId)!;
      patch.depends_on = current.depends_on.filter((d: string) => d !== flags["rm-dep"]);
    }
    return s.updateEpic(epicId, patch as any);
  });
}

export async function epicDeleteTestable(store: JsonFileStore, args: string[]): Promise<any> {
  const { positional } = parseFlags(args);
  return store.transact(s => {
    const entity = s.find(positional[0]);
    if (!entity || entity.type !== "epic") throw new Error(`Epic not found: ${positional[0]}`);
    s.deleteEpic(entity.id);
  });
}
