import { Box, Text } from "ink";
import type { TreeState, EpicNode, PhaseNode } from "./tree-types.js";
import TreeView from "./TreeView.js";
import { shouldShowEntry } from "./verbosity.js";

export interface LogPanelProps {
  /** Tree state to render. */
  state: TreeState;
  /** Maximum visible lines to render. Default: 50 */
  maxVisibleLines?: number;
  /** Current verbosity level (0=info, 1=detail, 2=debug, 3=trace). Default: 0 */
  verbosity?: number;
}

/**
 * Count total rendered lines in a tree state.
 * Each epic, phase, feature, and entry renders as one line.
 */
export function countTreeLines(state: TreeState): number {
  let count = state.system.length;
  for (const epic of state.epics) {
    count += 1; // epic label
    for (const phase of epic.phases) {
      count += 1; // phase label
      count += phase.entries.length;
      for (const feat of phase.features) {
        count += 1; // feature label
        count += feat.entries.length;
      }
    }
  }
  return count;
}

/**
 * Trim a tree state to the last N rendered lines by dropping
 * oldest entries from the front. Preserves tree structure (labels)
 * and removes leaf entries from earliest epics/phases first.
 */
export function trimTreeToTail(state: TreeState, maxLines: number): TreeState {
  const total = countTreeLines(state);
  if (total <= maxLines) return state;

  let toDrop = total - maxLines;

  // Drop system entries first (oldest)
  const systemStart = Math.min(toDrop, state.system.length);
  const system = state.system.slice(systemStart);
  toDrop -= systemStart;

  if (toDrop <= 0) return { epics: state.epics, system };

  // Drop from epics in order (oldest first)
  const epics: EpicNode[] = [];
  for (const epic of state.epics) {
    if (toDrop <= 0) {
      epics.push(epic);
      continue;
    }

    const phases: PhaseNode[] = [];
    for (const phase of epic.phases) {
      if (toDrop <= 0) {
        phases.push(phase);
        continue;
      }

      // Drop phase entries
      const phaseEntryDrop = Math.min(toDrop, phase.entries.length);
      const entries = phase.entries.slice(phaseEntryDrop);
      toDrop -= phaseEntryDrop;

      // Drop feature entries
      const features = [];
      for (const feat of phase.features) {
        if (toDrop <= 0) {
          features.push(feat);
          continue;
        }
        const featEntryDrop = Math.min(toDrop, feat.entries.length);
        const fEntries = feat.entries.slice(featEntryDrop);
        toDrop -= featEntryDrop;
        // Keep feature node even if empty (preserves tree structure)
        features.push({ ...feat, entries: fEntries });
      }

      phases.push({ ...phase, entries, features });
    }

    epics.push({ ...epic, phases });
  }

  return { epics, system };
}

/**
 * Filter tree entries by verbosity level.
 * Entries with level above current verbosity are removed.
 * System entries are not filtered (always shown).
 * warn/error entries are always shown regardless of verbosity.
 */
export function filterTreeByVerbosity(state: TreeState, verbosity: number): TreeState {
  return {
    epics: state.epics.map((epic) => ({
      ...epic,
      phases: epic.phases.map((phase) => ({
        ...phase,
        entries: phase.entries.filter((e) => shouldShowEntry(e.level, verbosity)),
        features: phase.features.map((feat) => ({
          ...feat,
          entries: feat.entries.filter((e) => shouldShowEntry(e.level, verbosity)),
        })),
      })),
    })),
    system: state.system,
  };
}

/**
 * LogPanel — renders pipeline log entries as a hierarchical tree.
 *
 * Uses the shared TreeView component for consistent rendering between
 * watch and dashboard. Trims entries to the last maxVisibleLines for
 * auto-follow behavior in the dashboard's alternate screen buffer.
 */
export default function LogPanel({
  state,
  maxVisibleLines = 50,
  verbosity = 0,
}: LogPanelProps) {
  const filtered = filterTreeByVerbosity(state, verbosity);
  const hasContent = filtered.epics.length > 0 || filtered.system.length > 0;

  if (!hasContent) {
    return (
      <Box justifyContent="center" alignItems="center" flexGrow={1}>
        <Text dimColor>no active sessions</Text>
      </Box>
    );
  }

  // Trim tree to last N lines for auto-follow (show newest entries at bottom)
  const trimmed = trimTreeToTail(filtered, maxVisibleLines);

  return (
    <Box flexDirection="column">
      <TreeView state={trimmed} />
    </Box>
  );
}
