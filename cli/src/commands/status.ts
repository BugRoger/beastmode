import type { BeastmodeConfig } from "../config";
import type { EnrichedManifest } from "../state-scanner";
import { scanEpics } from "../state-scanner";
import { findProjectRoot } from "../project-root";

export interface StatusRow {
  name: string;
  phase: string;
  features: string;
  status: string;
}

// ---------------------------------------------------------------------------
// ANSI color helpers (no dependencies)
// ---------------------------------------------------------------------------

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
} as const;

function color(text: string, ...codes: string[]): string {
  return `${codes.join("")}${text}${ANSI.reset}`;
}

// ---------------------------------------------------------------------------
// Phase color mapping
// ---------------------------------------------------------------------------

function colorPhase(phase: string): string {
  switch (phase) {
    case "design": return color(phase, ANSI.magenta);
    case "plan": return color(phase, ANSI.blue);
    case "implement": return color(phase, ANSI.yellow);
    case "validate": return color(phase, ANSI.cyan);
    case "release": return color(phase, ANSI.green);
    default: return phase;
  }
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

export function formatFeatures(epic: EnrichedManifest): string {
  const total = epic.features.length;
  if (total === 0) return "-";
  const completed = epic.features.filter(f => f.status === "completed").length;
  return `${completed}/${total}`;
}

export function formatStatus(epic: EnrichedManifest): string {
  if (epic.blocked) {
    return color(`blocked: run beastmode ${epic.phase} ${epic.slug}`, ANSI.red);
  }
  // Check if all features completed and phase is beyond implement
  if (epic.phase === "release" && epic.nextAction === null) {
    return color("done", ANSI.green, ANSI.dim);
  }
  return epic.phase;
}

// ---------------------------------------------------------------------------
// Row building — sort by phase lifecycle, then alpha
// ---------------------------------------------------------------------------

const PHASE_ORDER: Record<string, number> = {
  design: 0,
  plan: 1,
  implement: 2,
  validate: 3,
  release: 4,
};

export function buildStatusRows(epics: EnrichedManifest[]): StatusRow[] {
  return epics
    .sort((a, b) => {
      const aPhase = PHASE_ORDER[a.phase] ?? 99;
      const bPhase = PHASE_ORDER[b.phase] ?? 99;
      if (aPhase !== bPhase) return bPhase - aPhase; // furthest phase first
      return a.slug.localeCompare(b.slug);
    })
    .map(epic => ({
      name: epic.slug,
      phase: colorPhase(epic.phase),
      features: formatFeatures(epic),
      status: formatStatus(epic),
    }));
}

// ---------------------------------------------------------------------------
// ANSI-aware table formatting
// ---------------------------------------------------------------------------

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

function padDisplay(str: string, len: number): string {
  const visible = stripAnsi(str).length;
  return visible >= len ? str : str + " ".repeat(len - visible);
}

export function formatTable(rows: StatusRow[]): string {
  if (rows.length === 0) return "No epics found.";

  const headers: (keyof StatusRow)[] = ["name", "phase", "features", "status"];
  const labels: Record<keyof StatusRow, string> = {
    name: "Epic",
    phase: "Phase",
    features: "Features",
    status: "Status",
  };

  const widths = Object.fromEntries(
    headers.map(h => [
      h,
      Math.max(labels[h].length, ...rows.map(r => stripAnsi(r[h]).length)),
    ]),
  ) as Record<keyof StatusRow, number>;

  const headerLine = headers.map(h => padDisplay(color(labels[h], ANSI.bold), widths[h])).join("  ");
  const separator = headers.map(h => "-".repeat(widths[h])).join("  ");
  const dataLines = rows.map(row =>
    headers.map(h => padDisplay(row[h], widths[h])).join("  "),
  );

  return [headerLine, separator, ...dataLines].join("\n");
}

// ---------------------------------------------------------------------------
// Command entry point
// ---------------------------------------------------------------------------

export async function statusCommand(_config: BeastmodeConfig, _args: string[] = []): Promise<void> {
  const projectRoot = findProjectRoot();
  const { epics } = await scanEpics(projectRoot);
  const rows = buildStatusRows(epics);
  console.log(formatTable(rows));
}
