/**
 * Appends run metadata to .beastmode-runs.json in the project root.
 */

import { resolve } from "path";
import { readFile, writeFile } from "fs/promises";
import type { RunLogEntry, PhaseResult, Phase } from "../types";

const RUN_LOG_FILENAME = ".beastmode-runs.json";

export async function appendRunLog(
  projectRoot: string,
  phase: Phase,
  args: string[],
  result: PhaseResult,
): Promise<void> {
  const logPath = resolve(projectRoot, RUN_LOG_FILENAME);

  let entries: RunLogEntry[] = [];
  try {
    const raw = await readFile(logPath, "utf-8");
    entries = JSON.parse(raw);
  } catch {
    // File doesn't exist or is invalid — start fresh
  }

  const entry: RunLogEntry = {
    epic: args[0] ?? null,
    phase,
    feature: args[1] ?? null,
    cost_usd: result.cost_usd,
    duration_ms: result.duration_ms,
    exit_status: result.exit_status,
    timestamp: new Date().toISOString(),
    session_id: result.session_id,
  };

  entries.push(entry);
  await writeFile(logPath, JSON.stringify(entries, null, 2) + "\n");
}
