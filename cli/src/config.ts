import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

export interface GateConfig {
  [key: string]: "human" | "auto";
}

export interface GatesConfig {
  design?: GateConfig;
  plan?: GateConfig;
  implement?: GateConfig;
  validate?: GateConfig;
  retro?: GateConfig;
  release?: GateConfig;
}

export interface GitHubConfig {
  enabled: boolean;
  "project-name"?: string;
}

export type DispatchStrategy = "sdk" | "cmux" | "auto";

export interface CliConfig {
  interval?: number;
  "dispatch-strategy"?: DispatchStrategy;
}

export interface BeastmodeConfig {
  gates: GatesConfig;
  github: GitHubConfig;
  cli: CliConfig;
}

const DEFAULT_CONFIG: BeastmodeConfig = {
  gates: {},
  github: { enabled: false },
  cli: { interval: 60, "dispatch-strategy": "sdk" },
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

  const gates = (raw.gates ?? {}) as GatesConfig;
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

  return { gates, github, cli };
}

export function resolveGateMode(
  config: BeastmodeConfig,
  gatePath: string,
): "human" | "auto" {
  const [phase, gate] = gatePath.split(".");
  const phaseGates = config.gates[phase as keyof GatesConfig];
  if (!phaseGates) return "auto";
  return phaseGates[gate] ?? "auto";
}
