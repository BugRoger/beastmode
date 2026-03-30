import type { BeastmodeConfig } from "../config";
import type { EnrichedManifest } from "../state-scanner";
import { scanEpics } from "../state-scanner";
import { findProjectRoot } from "../project-root";
import { readLockfile } from "../lockfile";
import { toSnapshots, detectChanges as detectMapChanges } from "../change-detect";
import type { EpicSnapshot } from "../change-detect";

export interface StatusRow {
  name: string;
  phase: string;
  features: string;
  status: string;
}

export interface WatchMeta {
  /** Human-readable last-updated time */
  timestamp: string;
  /** Whether the watch loop lockfile exists and PID is alive */
  watchRunning: boolean;
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

/** Render blocked gate details for the dashboard header. */
export function renderBlockedDetails(epics: EnrichedManifest[]): string {
  const blocked = epics.filter(e => e.blocked !== null && e.blocked !== undefined);
  if (blocked.length === 0) return "";
  const lines = blocked.map(e => {
    const b = e.blocked!;
    return color(`  ${e.slug}: ${b.gate} — ${b.reason}`, ANSI.red);
  });
  return color("Blocked:", ANSI.red, ANSI.bold) + "\n" + lines.join("\n");
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
  return epic.phase;
}

// ---------------------------------------------------------------------------
// Row building — sort by phase lifecycle, then alpha
// ---------------------------------------------------------------------------

const PHASE_ORDER: Record<string, number> = {
  cancelled: -1,
  design: 0,
  plan: 1,
  implement: 2,
  validate: 3,
  release: 4,
  done: 5,
};

export function buildStatusRows(epics: EnrichedManifest[], opts: { all?: boolean } = {}): StatusRow[] {
  const filtered = opts.all
    ? epics
    : epics.filter(e => e.phase !== "done" && e.phase !== "cancelled");

  return filtered
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

// ---------------------------------------------------------------------------
// Change detection — compare two tick snapshots, return changed epic slugs
// ---------------------------------------------------------------------------

export interface StatusSnapshot {
  slug: string;
  phase: string;
  featuresCompleted: number;
  featuresTotal: number;
  blocked: boolean;
}

/** Build a snapshot from enriched manifests for change comparison. */
export function buildSnapshot(epics: EnrichedManifest[]): StatusSnapshot[] {
  return epics.map(epic => ({
    slug: epic.slug,
    phase: epic.phase,
    featuresCompleted: epic.features.filter(f => f.status === "completed").length,
    featuresTotal: epic.features.length,
    blocked: epic.blocked !== null,
  }));
}

/** Compare two snapshots and return the set of epic slugs that changed. */
export function detectChanges(prev: StatusSnapshot[], curr: StatusSnapshot[]): Set<string> {
  const changed = new Set<string>();
  const prevMap = new Map(prev.map(s => [s.slug, s]));

  for (const c of curr) {
    const p = prevMap.get(c.slug);
    if (!p) {
      // New epic appeared
      changed.add(c.slug);
      continue;
    }
    if (
      p.phase !== c.phase ||
      p.featuresCompleted !== c.featuresCompleted ||
      p.featuresTotal !== c.featuresTotal ||
      p.blocked !== c.blocked
    ) {
      changed.add(c.slug);
    }
  }

  return changed;
}

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
    const blockedSection = renderBlockedDetails(epics);
    const parts = [formatWatchHeader(meta)];
    if (blockedSection) parts.push(blockedSection);
    parts.push(table);
    return parts.join("\n\n");
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

    const { epics } = await scanEpics(projectRoot);

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

  const { epics } = await scanEpics(projectRoot);
  process.stdout.write(renderStatusScreen(epics, { all }) + "\n");
}
