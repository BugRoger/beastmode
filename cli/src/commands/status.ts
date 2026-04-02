import type { BeastmodeConfig } from "../config";
import type { EnrichedManifest } from "../manifest-store";
import { listEnriched } from "../manifest-store";
import { findProjectRoot } from "../project-root";
import { readLockfile } from "../lockfile";
import { toSnapshots, detectChanges as detectMapChanges } from "../change-detect";
import type { EpicSnapshot } from "../change-detect";
import { buildStatusRows as sharedBuildStatusRows } from "../shared/status-data";
import type { StatusRow, WatchMeta } from "../shared/status-data";

export type { StatusRow, WatchMeta, StatusSnapshot } from "../shared/status-data";
export { PHASE_ORDER, buildSnapshot, detectChanges } from "../shared/status-data";

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
// Watch indicator
// ---------------------------------------------------------------------------

/** Check if beastmode watch is running via lockfile + PID check. */
export function isWatchRunning(projectRoot: string): boolean {
  const lock = readLockfile(projectRoot);
  if (!lock) return false;
  try {
    process.kill(lock.pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Render the watch status line for the dashboard header. */
export function renderWatchIndicator(running: boolean): string {
  return running
    ? color("watch: running", ANSI.green)
    : color("watch: stopped", ANSI.dim);
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
    case "done": return color(phase, ANSI.green, ANSI.dim);
    case "cancelled": return color(phase, ANSI.red, ANSI.dim);
    default: return phase;
  }
}

// ---------------------------------------------------------------------------
// Wave display helpers
// ---------------------------------------------------------------------------

/**
 * Compact wave indicator for multi-wave implement epics.
 * Returns "W{current}/{total}" or "" if not applicable.
 */
export function formatWaveIndicator(epic: EnrichedManifest): string {
  if (epic.phase !== "implement") return "";
  const waves = new Set(epic.features.map(f => f.wave).filter((w): w is number => w !== undefined));
  if (waves.size <= 1) return "";
  // All completed → no indicator needed
  if (epic.features.every(f => f.status === "completed")) return "";
  const sortedWaves = [...waves].sort((a, b) => a - b);
  const currentWave = sortedWaves.find(w =>
    epic.features.some(f => f.wave === w && f.status !== "completed")
  );
  if (currentWave === undefined) return "";
  return `W${currentWave}/${sortedWaves.length}`;
}

/**
 * Build per-wave sub-rows for verbose status display.
 * Only applies to multi-wave implement epics.
 */
export function buildVerboseWaveRows(epic: EnrichedManifest): StatusRow[] {
  if (epic.phase !== "implement") return [];
  const waveMap = new Map<number, typeof epic.features>();
  for (const f of epic.features) {
    if (f.wave === undefined) continue;
    const list = waveMap.get(f.wave) ?? [];
    list.push(f);
    waveMap.set(f.wave, list);
  }
  if (waveMap.size <= 1) return [];
  const sortedWaves = [...waveMap.keys()].sort((a, b) => a - b);
  return sortedWaves.map(w => {
    const features = waveMap.get(w)!;
    const completed = features.filter(f => f.status === "completed").length;
    const total = features.length;
    const allDone = completed === total;
    const waveStatus = allDone ? "completed" : (features.some(f => f.status === "in-progress") ? "in-progress" : "pending");
    return {
      name: color(`  W${w}`, ANSI.dim),
      phase: "",
      features: `${completed}/${total}`,
      status: color(waveStatus, waveStatus === "completed" ? ANSI.green : waveStatus === "in-progress" ? ANSI.yellow : ANSI.dim),
    };
  });
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

export function formatFeatures(epic: EnrichedManifest): string {
  const total = epic.features.length;
  if (total === 0) return "-";
  const completed = epic.features.filter(f => f.status === "completed").length;
  const base = `${completed}/${total}`;
  const wave = formatWaveIndicator(epic);
  return wave ? `${base} ${wave}` : base;
}

export function formatStatus(epic: EnrichedManifest): string {
  return epic.phase;
}

// ---------------------------------------------------------------------------
// Row building — delegates to shared module with ANSI formatters
// ---------------------------------------------------------------------------

export function buildStatusRows(epics: EnrichedManifest[], opts: { all?: boolean; verbose?: boolean } = {}): StatusRow[] {
  const baseRows = sharedBuildStatusRows(epics, opts, {
    colorPhase,
    formatFeatures,
    formatStatus,
  });
  if (!opts.verbose) return baseRows;

  // Insert wave sub-rows after each epic row
  const filtered = opts.all
    ? epics
    : epics.filter(e => e.phase !== "done" && e.phase !== "cancelled");
  const epicMap = new Map(filtered.map(e => [e.slug, e]));
  const result: StatusRow[] = [];
  for (const row of baseRows) {
    result.push(row);
    const epic = epicMap.get(row.name);
    if (epic) {
      result.push(...buildVerboseWaveRows(epic));
    }
  }
  return result;
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

// ---------------------------------------------------------------------------
// Row highlight — flash changed rows for one render cycle
// ---------------------------------------------------------------------------

/** Wrap all columns of a StatusRow in bold+inverse ANSI for one render cycle. */
export function highlightRow(row: StatusRow): StatusRow {
  const hl = (s: string) => `\x1b[1m\x1b[7m${s}\x1b[0m`;
  return {
    name: hl(row.name),
    phase: hl(row.phase),
    features: hl(row.features),
    status: hl(row.status),
  };
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
// Render pipeline — pure function, no I/O
// ---------------------------------------------------------------------------

export function renderStatusTable(
  epics: EnrichedManifest[],
  opts: { all?: boolean } = {},
  changedSlugs?: Set<string>,
): string {
  let rows = buildStatusRows(epics, opts);
  if (changedSlugs && changedSlugs.size > 0) {
    rows = rows.map(row =>
      changedSlugs.has(row.name) ? highlightRow(row) : row,
    );
  }
  return formatTable(rows);
}

// ---------------------------------------------------------------------------
// Watch header + full screen render
// ---------------------------------------------------------------------------

/** Format the watch header line with timestamp and running/stopped indicator. */
export function formatWatchHeader(meta: WatchMeta): string {
  const status = meta.watchRunning
    ? color("running", ANSI.green)
    : color("stopped", ANSI.dim);
  return `Last updated: ${meta.timestamp}  watch: ${status}`;
}

/**
 * Render the complete status screen — optional header + table.
 * When meta is provided, prepends the watch header above the table.
 * When meta is undefined, returns just the table (backward compatible).
 */
export function renderStatusScreen(
  epics: EnrichedManifest[],
  opts: { all?: boolean } = {},
  meta?: WatchMeta,
  changedSlugs?: Set<string>,
): string {
  const table = renderStatusTable(epics, opts, changedSlugs);
  if (meta) {
    return [formatWatchHeader(meta), table].join("\n\n");
  }
  return table;
}

// ---------------------------------------------------------------------------
// Watch loop
// ---------------------------------------------------------------------------

export async function statusWatchLoop(projectRoot: string, all: boolean): Promise<void> {
  const POLL_MS = 2000;
  let prevSnapshot: Map<string, EpicSnapshot> = new Map();

  async function render(): Promise<void> {
    // Clear screen: cursor home + erase display
    process.stdout.write("\x1b[H\x1b[2J");

    const { epics } = listEnriched(projectRoot);

    // Change detection
    const currSnapshot = toSnapshots(epics);
    const changedSlugs = detectMapChanges(prevSnapshot, currSnapshot);
    prevSnapshot = currSnapshot;

    const now = new Date();
    const ts = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map(n => String(n).padStart(2, "0"))
      .join(":");

    const meta: WatchMeta = {
      timestamp: ts,
      watchRunning: isWatchRunning(projectRoot),
    };

    const screen = renderStatusScreen(epics, { all }, meta, changedSlugs);
    const footer = `\n${color("Ctrl+C to exit", ANSI.dim)}`;

    process.stdout.write(`${screen}\n${footer}\n`);
  }

  // SIGINT handler — clean exit
  process.on("SIGINT", () => {
    clearInterval(timer);
    process.stdout.write("\x1b[?25h"); // show cursor
    process.exit(0);
  });

  // Initial render immediately
  await render();

  // Poll loop
  const timer = setInterval(() => {
    render().catch(() => {
      // Swallow render errors to keep the loop alive
    });
  }, POLL_MS);

  // Never resolves — runs until SIGINT
  return new Promise<void>(() => {});
}

// ---------------------------------------------------------------------------
// Command entry point
// ---------------------------------------------------------------------------

export async function statusCommand(_config: BeastmodeConfig, args: string[] = [], _verbosity: number = 0): Promise<void> {
  const all = args.includes("--all");
  const watch = args.includes("--watch") || args.includes("-w");
  const projectRoot = findProjectRoot();

  if (watch) {
    await statusWatchLoop(projectRoot, all);
    return;
  }

  const { epics } = listEnriched(projectRoot);
  process.stdout.write(renderStatusScreen(epics, { all }) + "\n");
}
