import type { BeastmodeConfig } from "../config";
import { scanEpics, type EpicState } from "../state-scanner";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import type { RunLogEntry } from "../types";

export interface StatusRow {
  name: string;
  phase: string;
  progress: string;
  blocked: string;
  cost: string;
  lastActivity: string;
}

function readRunLog(projectRoot: string): RunLogEntry[] {
  const logPath = resolve(projectRoot, ".beastmode-runs.json");
  if (!existsSync(logPath)) return [];
  try {
    const raw = readFileSync(logPath, "utf-8").trim();
    if (!raw) return [];
    return JSON.parse(raw) as RunLogEntry[];
  } catch {
    return [];
  }
}

function formatCost(usd: number): string {
  if (usd === 0) return "-";
  return `$${usd.toFixed(2)}`;
}

function formatProgress(epic: EpicState): string {
  if (epic.phase !== "implement") return "-";
  const total = epic.features.length;
  if (total === 0) return "-";
  const completed = epic.features.filter(
    (f) => f.status === "completed",
  ).length;
  return `${completed}/${total}`;
}

function formatBlocked(epic: EpicState): string {
  if (!epic.blocked && !epic.gateBlocked) return "-";
  return epic.blockedGate ?? epic.gateName ?? "yes";
}

function lastActivity(
  entries: RunLogEntry[],
  epicSlug: string,
): string {
  const epicEntries = entries.filter((e) => e.epic === epicSlug);
  if (epicEntries.length === 0) return "-";
  const latest = epicEntries.reduce((a, b) =>
    a.timestamp > b.timestamp ? a : b,
  );
  return latest.timestamp.slice(0, 19).replace("T", " ");
}

export function buildStatusRows(
  epics: EpicState[],
  runLog: RunLogEntry[],
): StatusRow[] {
  return epics
    .sort((a, b) => {
      const aTime = lastActivity(runLog, a.slug);
      const bTime = lastActivity(runLog, b.slug);
      if (aTime === "-" && bTime === "-") return a.slug.localeCompare(b.slug);
      if (aTime === "-") return 1;
      if (bTime === "-") return -1;
      return bTime.localeCompare(aTime);
    })
    .map((epic) => ({
      name: epic.slug,
      phase: epic.phase,
      progress: formatProgress(epic),
      blocked: formatBlocked(epic),
      cost: formatCost(epic.costUsd),
      lastActivity: lastActivity(runLog, epic.slug),
    }));
}

function pad(str: string, len: number): string {
  return str.length >= len ? str : str + " ".repeat(len - str.length);
}

export function formatTable(rows: StatusRow[]): string {
  if (rows.length === 0) return "No epics found.";

  const headers: (keyof StatusRow)[] = [
    "name",
    "phase",
    "progress",
    "blocked",
    "cost",
    "lastActivity",
  ];
  const labels: Record<keyof StatusRow, string> = {
    name: "Epic",
    phase: "Phase",
    progress: "Progress",
    blocked: "Blocked",
    cost: "Cost",
    lastActivity: "Last Activity",
  };

  const widths = Object.fromEntries(
    headers.map((h) => [
      h,
      Math.max(labels[h].length, ...rows.map((r) => r[h].length)),
    ]),
  ) as Record<keyof StatusRow, number>;

  const headerLine = headers.map((h) => pad(labels[h], widths[h])).join("  ");
  const separator = headers.map((h) => "-".repeat(widths[h])).join("  ");
  const dataLines = rows.map((row) =>
    headers.map((h) => pad(row[h], widths[h])).join("  "),
  );

  return [headerLine, separator, ...dataLines].join("\n");
}

export async function statusCommand(_config: BeastmodeConfig): Promise<void> {
  const projectRoot = process.cwd();
  const epics = await scanEpics(projectRoot);
  const runLog = readRunLog(projectRoot);
  const rows = buildStatusRows(epics, runLog);
  console.log(formatTable(rows));
}
