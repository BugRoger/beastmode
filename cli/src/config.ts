import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

export interface GitHubConfig {
  enabled: boolean;
  "project-name"?: string;
}

export type DispatchStrategy = "sdk" | "cmux" | "iterm2" | "auto";

export interface CliConfig {
  interval?: number;
  "dispatch-strategy"?: DispatchStrategy;
}

export interface HitlConfig {
  design?: string;
  plan?: string;
  implement?: string;
  validate?: string;
  release?: string;
  timeout: number;
}

export interface FilePermissionsConfig {
  timeout: number;
  "claude-settings"?: string;
}

export interface BeastmodeConfig {
  github: GitHubConfig;
  cli: CliConfig;
  hitl: HitlConfig;
  "file-permissions": FilePermissionsConfig;
}

export const DEFAULT_HITL_PROSE = "always defer to human";

const DEFAULT_CONFIG: BeastmodeConfig = {
  github: { enabled: false },
  cli: { interval: 60, "dispatch-strategy": "sdk" },
  hitl: {
    design: DEFAULT_HITL_PROSE,
    plan: DEFAULT_HITL_PROSE,
    implement: DEFAULT_HITL_PROSE,
    validate: DEFAULT_HITL_PROSE,
    release: DEFAULT_HITL_PROSE,
    timeout: 30,
  },
  "file-permissions": {
    timeout: 30,
    "claude-settings": DEFAULT_HITL_PROSE,
  },
};

/**
 * Parse a simple YAML config file. Handles the flat/nested structure
 * of .beastmode/config.yaml without pulling in a full YAML library.
 */
function parseSimpleYaml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split("\n");
  const stack: { indent: number; obj: Record<string, unknown> }[] = [
    { indent: -1, obj: result },
  ];

  for (const line of lines) {
    // Skip comments and blank lines
    const trimmed = line.trimStart();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const indent = line.length - trimmed.length;
    const match = trimmed.match(/^([^:]+):\s*(.*)?$/);
    if (!match) continue;

    const key = match[1].trim();
    const rawValue = match[2]?.trim() ?? "";

    // Pop stack to find parent at correct indentation
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].obj;

    if (rawValue === "" || rawValue.startsWith("#")) {
      // Nested object
      const child: Record<string, unknown> = {};
      parent[key] = child;
      stack.push({ indent, obj: child });
    } else {
      // Leaf value — strip inline comments
      const value = rawValue.replace(/\s+#.*$/, "");
      if (value === "true") parent[key] = true;
      else if (value === "false") parent[key] = false;
      else if (/^\d+$/.test(value)) parent[key] = parseInt(value, 10);
      else if (/^["'].*["']$/.test(value)) parent[key] = value.slice(1, -1);
      else parent[key] = value;
    }
  }

  return result;
}

export function loadConfig(projectRoot: string): BeastmodeConfig {
  const configPath = resolve(projectRoot, ".beastmode", "config.yaml");
  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  const content = readFileSync(configPath, "utf-8");
  const raw = parseSimpleYaml(content);

  const rawGithub = (raw.github ?? {}) as Record<string, unknown>;
  const github = {
    enabled: rawGithub.enabled === true,
    "project-name": (rawGithub["project-name"] as string) ?? undefined,
  } satisfies GitHubConfig;
  const cli = {
    interval:
      ((raw.cli as Record<string, unknown>)?.interval as number) ??
      DEFAULT_CONFIG.cli.interval,
    "dispatch-strategy":
      (((raw.cli as Record<string, unknown>)?.["dispatch-strategy"] as string) ?? "sdk") as DispatchStrategy,
  } satisfies CliConfig;

  const rawHitl = (raw.hitl ?? {}) as Record<string, unknown>;
  const hitl = {
    design: (rawHitl.design as string) ?? DEFAULT_CONFIG.hitl.design,
    plan: (rawHitl.plan as string) ?? DEFAULT_CONFIG.hitl.plan,
    implement: (rawHitl.implement as string) ?? DEFAULT_CONFIG.hitl.implement,
    validate: (rawHitl.validate as string) ?? DEFAULT_CONFIG.hitl.validate,
    release: (rawHitl.release as string) ?? DEFAULT_CONFIG.hitl.release,
    timeout: (rawHitl.timeout as number) ?? DEFAULT_CONFIG.hitl.timeout,
  } satisfies HitlConfig;

  const rawFilePerms = (raw["file-permissions"] ?? {}) as Record<string, unknown>;
  const filePermissions: FilePermissionsConfig = {
    timeout: (rawFilePerms.timeout as number) ?? DEFAULT_CONFIG["file-permissions"].timeout,
    "claude-settings": (rawFilePerms["claude-settings"] as string) ?? DEFAULT_CONFIG["file-permissions"]["claude-settings"],
  };

  return { github, cli, hitl, "file-permissions": filePermissions };
}

/** Discover the project root (walks up to find .beastmode/). */
export function findProjectRoot(from: string = process.cwd()): string {
  let dir = from;
  while (dir !== "/") {
    if (existsSync(resolve(dir, ".beastmode"))) return dir;
    dir = resolve(dir, "..");
  }
  throw new Error("Not inside a beastmode project (no .beastmode/ found)");
}
