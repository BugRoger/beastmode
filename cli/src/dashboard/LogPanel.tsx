import { Box, Text } from "ink";
import type { TreeState, EpicNode, FeatureNode } from "./tree-types.js";
import TreeView from "./TreeView.js";
import { shouldShowEntry } from "./verbosity.js";

export interface LogPanelProps {
  /** Tree state to render. */
  state: TreeState;
  /** Current verbosity level (0=info, 1=debug). Default: 0 */
  verbosity?: number;
  /** Scroll offset from top (line index). */
  scrollOffset?: number;
  /** Whether to auto-follow newest entries. Default: true */
  autoFollow?: boolean;
  /** Maximum visible lines to render. Default: 50 */
  maxVisibleLines?: number;
}

/**
 * Count total rendered lines in a tree state.
 * CLI root label + CLI entries + for each epic (1 label + direct entries + for each feature (1 label + entries)).
 */
export function countTreeLines(state: TreeState): number {
  // CLI root: always 1 label + N entries
  let count = 1 + state.cli.entries.length;

  for (const epic of state.epics) {
    count += 1; // epic label
    count += epic.entries.length; // direct entries
    for (const feat of epic.features) {
      count += 1; // feature label
      count += feat.entries.length;
    }
  }
  return count;
}

/**
 * Trim a tree state to the last N rendered lines by dropping
 * oldest entries from the front. Preserves tree structure (labels)
 * and removes leaf entries from earliest epics first.
 */
export function trimTreeToTail(state: TreeState, maxLines: number): TreeState {
  const total = countTreeLines(state);
  if (total <= maxLines) return state;

  let toDrop = total - maxLines;

  // Drop CLI entries first (oldest)
  let cliEntries = state.cli.entries;
  if (toDrop > 0 && cliEntries.length > 0) {
    const cliDrop = Math.min(toDrop, cliEntries.length);
    cliEntries = cliEntries.slice(cliDrop);
    toDrop -= cliDrop;
  }

  if (toDrop <= 0) return { cli: { entries: cliEntries }, epics: state.epics };

  // Drop from epics in order (oldest first)
  const epics: EpicNode[] = [];
  for (const epic of state.epics) {
    if (toDrop <= 0) {
      epics.push(epic);
      continue;
    }

    // Drop epic direct entries
    const epicEntryDrop = Math.min(toDrop, epic.entries.length);
    const entries = epic.entries.slice(epicEntryDrop);
    toDrop -= epicEntryDrop;

    // Drop feature entries
    const features = [];
    for (const feat of epic.features) {
      if (toDrop <= 0) {
        features.push(feat);
        continue;
      }
      const featEntryDrop = Math.min(toDrop, feat.entries.length);
      const fEntries = feat.entries.slice(featEntryDrop);
      toDrop -= featEntryDrop;
      features.push({ ...feat, entries: fEntries });
    }

    epics.push({ ...epic, entries, features });
  }

  return { cli: { entries: cliEntries }, epics };
}

/**
 * Filter tree entries by verbosity level.
 * Entries with level above current verbosity are removed.
 * CLI entries are not filtered (always shown).
 * warn/error entries are always shown regardless of verbosity.
 */
export function filterTreeByVerbosity(state: TreeState, verbosity: number): TreeState {
  return {
    cli: state.cli, // CLI entries always shown
    epics: state.epics.map((epic) => ({
      ...epic,
      entries: epic.entries.filter((e) => shouldShowEntry(e.level, verbosity)),
      features: epic.features.map((feat) => ({
        ...feat,
        entries: feat.entries.filter((e) => shouldShowEntry(e.level, verbosity)),
      })),
    })),
  };
}

/**
 * Filter tree entries by phase — only keeps entries matching the given phase.
 * When phase is 'all', returns tree unchanged.
 * Epic and feature skeleton nodes are preserved to maintain hierarchy context.
 * CLI entries are never filtered.
 */
export function filterTreeByPhase(state: TreeState, phase: string): TreeState {
  if (phase === "all") return state;
  return {
    cli: state.cli,
    epics: state.epics.map((epic) => ({
      ...epic,
      entries: epic.entries.filter((e) => e.phase === phase),
      features: epic.features.map((feat) => ({
        ...feat,
        entries: feat.entries.filter((e) => e.phase === phase),
      })),
    })),
  };
}

/**
 * Filter tree by blocked status.
 * When showBlocked is true, returns tree unchanged.
 * When false, removes epics/features with status "blocked".
 */
export function filterTreeByBlocked(state: TreeState, showBlocked: boolean): TreeState {
  if (showBlocked) return state;
  return {
    cli: state.cli,
    epics: state.epics
      .filter((epic) => epic.status !== "blocked")
      .map((epic) => ({
        ...epic,
        features: epic.features.filter((feat) => feat.status !== "blocked"),
      })),
  };
}

/**
 * Drop the first N rendered lines from a tree state.
 * Used for scroll offset rendering — skip lines before the viewport.
 */
export function trimTreeFromHead(state: TreeState, linesToDrop: number): TreeState {
  if (linesToDrop <= 0) return state;

  let toDrop = linesToDrop;

  // Drop CLI root label
  toDrop -= 1;
  if (toDrop <= 0) return state;

  // Drop CLI entries
  let cliEntries = state.cli.entries;
  if (toDrop > 0 && cliEntries.length > 0) {
    const cliDrop = Math.min(toDrop, cliEntries.length);
    cliEntries = cliEntries.slice(cliDrop);
    toDrop -= cliDrop;
  }

  if (toDrop <= 0) return { cli: { entries: cliEntries }, epics: state.epics };

  const epics: EpicNode[] = [];
  for (const epic of state.epics) {
    if (toDrop <= 0) {
      epics.push(epic);
      continue;
    }

    // Drop epic label line
    toDrop -= 1;
    if (toDrop <= 0) {
      epics.push(epic);
      continue;
    }

    // Drop epic direct entries
    const epicEntryDrop = Math.min(toDrop, epic.entries.length);
    const entries = epic.entries.slice(epicEntryDrop);
    toDrop -= epicEntryDrop;

    // Drop feature entries
    const features: FeatureNode[] = [];
    for (const feat of epic.features) {
      if (toDrop <= 0) {
        features.push(feat);
        continue;
      }

      // Drop feature label line
      toDrop -= 1;
      if (toDrop <= 0) {
        features.push(feat);
        continue;
      }

      const featEntryDrop = Math.min(toDrop, feat.entries.length);
      const fEntries = feat.entries.slice(featEntryDrop);
      toDrop -= featEntryDrop;
      features.push({ ...feat, entries: fEntries });
    }

    epics.push({ ...epic, entries, features });
  }

  return { cli: { entries: cliEntries }, epics };
}

/**
 * LogPanel — renders pipeline log entries as a hierarchical tree.
 *
 * Supports auto-follow (tail) and manual scroll via offset.
 */
export default function LogPanel({
  state,
  verbosity = 0,
  scrollOffset,
  autoFollow = true,
  maxVisibleLines = 50,
}: LogPanelProps) {
  const filtered = filterTreeByVerbosity(state, verbosity);
  const hasContent = filtered.epics.length > 0 || filtered.cli.entries.length > 0;

  if (!hasContent) {
    return (
      <Box justifyContent="center" alignItems="center" flexGrow={1}>
        <Text dimColor>no active sessions</Text>
      </Box>
    );
  }

  // When auto-following or no scroll offset, show newest entries (trim from front)
  if (autoFollow || scrollOffset === undefined) {
    const trimmed = trimTreeToTail(filtered, maxVisibleLines);
    return (
      <Box flexDirection="column">
        <TreeView state={trimmed} />
      </Box>
    );
  }

  // Manual scroll: drop lines before viewport, then trim to maxVisibleLines
  const total = countTreeLines(filtered);
  const clampedOffset = Math.min(scrollOffset, Math.max(0, total - maxVisibleLines));
  const dropped = trimTreeFromHead(filtered, clampedOffset);
  const trimmed = trimTreeToTail(dropped, maxVisibleLines);

  return (
    <Box flexDirection="column">
      <TreeView state={trimmed} />
    </Box>
  );
}
