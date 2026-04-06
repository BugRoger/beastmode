/**
 * TreeView — Ink component that renders pipeline hierarchy as a terminal tree.
 *
 * Renders: SYSTEM > Epic > Feature with ● dot connectors and phase-based coloring.
 * Phase is displayed as a colored badge on each entry line.
 * Blocked/upcoming nodes render dimmed with status badge visible.
 * Active nodes show a spinner indicator.
 *
 * Output is flattened to a line array and sliced to maxLines to prevent overflow.
 */

import { useState, useEffect } from "react";
import { Box, Text } from "ink";
import type { TreeState, EpicNode, FeatureNode, TreeEntry } from "./tree-types.js";
import { formatTreeLine } from "./tree-format.js";
import { isDim, PHASE_COLOR, CHROME } from "./monokai-palette.js";

export interface TreeViewProps {
  /** Full tree state to render. */
  state: TreeState;
  /** Maximum lines to render. Omit for unlimited. */
  maxLines?: number;
  /** Scroll offset — skip this many lines from the top before rendering. */
  scrollOffset?: number;
}

/** Pie spinner for epic dots. */
const EPIC_SPINNER = ["○", "◔", "◑", "◕", "●", "◕", "◑", "◔"];
/** Fisheye spinner for feature dots. */
const FEATURE_SPINNER = ["◉", "◎", "○", "◎"];
const SPINNER_INTERVAL_MS = 120;

function useSpinnerTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, SPINNER_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);
  return tick;
}

function isActive(status: string): boolean {
  return status === "in-progress" || status === "implement" || status === "design" ||
    status === "plan" || status === "validate" || status === "release";
}

/** A single renderable line with a stable key. */
interface FlatLine {
  key: string;
  node: React.ReactNode;
}

function flattenFeature(feat: FeatureNode, tick: number): FlatLine[] {
  const dim = isDim(feat.status);
  const active = feat.status === "in-progress";
  const color = PHASE_COLOR[feat.status];
  const badge = `[${feat.status}]`;
  const dotColor = dim ? CHROME.muted : (color ?? CHROME.muted);
  const dot = active ? FEATURE_SPINNER[tick % FEATURE_SPINNER.length] : "○";

  const lines: FlatLine[] = [];

  lines.push({
    key: `f-${feat.slug}`,
    node: (
      <Text dimColor={dim}>
        <Text color={CHROME.muted}>{"├─"}</Text>
        <Text color={dotColor}>{dot}</Text>
        <Text>{" "}</Text>
        <Text dimColor={dim}>{feat.slug}</Text>
        {" "}
        {color ? <Text color={color}>{badge}</Text> : <Text dimColor>{badge}</Text>}
      </Text>
    ),
  });

  for (const entry of feat.entries) {
    lines.push({
      key: `fe-${feat.slug}-${entry.seq}`,
      node: (
        <Text>
          {formatTreeLine("leaf-feature", entry.level, entry.phase, entry.message, entry.timestamp)}
        </Text>
      ),
    });
  }

  return lines;
}

function flattenEpic(epic: EpicNode, tick: number): FlatLine[] {
  const dim = isDim(epic.status);
  const active = isActive(epic.status) && !isDim(epic.status);
  const color = PHASE_COLOR[epic.status];
  const badge = `[${epic.status}]`;
  const dotColor = dim ? CHROME.muted : (color ?? CHROME.muted);
  const dot = active ? EPIC_SPINNER[tick % EPIC_SPINNER.length] : "●";

  const lines: FlatLine[] = [];

  lines.push({
    key: `e-${epic.slug}`,
    node: (
      <Text dimColor={dim} bold>
        <Text color={dotColor}>{dot}</Text>
        <Text>{" "}</Text>
        <Text dimColor={dim}>{epic.slug}</Text>
        {" "}
        {color ? <Text color={color}>{badge}</Text> : <Text dimColor>{badge}</Text>}
      </Text>
    ),
  });

  for (const entry of epic.entries) {
    lines.push({
      key: `ee-${epic.slug}-${entry.seq}`,
      node: (
        <Text>
          {formatTreeLine("leaf-epic", entry.level, entry.phase, entry.message, entry.timestamp)}
        </Text>
      ),
    });
  }

  for (const feat of epic.features) {
    lines.push(...flattenFeature(feat, tick));
  }

  return lines;
}

function flattenTree(state: TreeState, tick: number): FlatLine[] {
  const lines: FlatLine[] = [];

  if (state.cli.entries.length > 0) {
    lines.push({
      key: "sys-root",
      node: (
        <Text bold>
          <Text color={CHROME.muted}>{"● "}</Text>
          <Text color={CHROME.muted}>SYSTEM</Text>
        </Text>
      ),
    });

    for (const entry of state.cli.entries) {
      lines.push({
        key: `sys-${entry.seq}`,
        node: (
          <Text>
            {formatTreeLine("system", entry.level, undefined, entry.message, entry.timestamp)}
          </Text>
        ),
      });
    }
  }

  for (const epic of state.epics) {
    lines.push(...flattenEpic(epic, tick));
  }

  return lines;
}

export default function TreeView({ state, maxLines, scrollOffset = 0 }: TreeViewProps) {
  const tick = useSpinnerTick();
  const hasContent = state.epics.length > 0 || state.cli.entries.length > 0;

  if (!hasContent) {
    return (
      <Box justifyContent="center" alignItems="center" flexGrow={1}>
        <Text dimColor>no activity</Text>
      </Box>
    );
  }

  const allLines = flattenTree(state, tick);
  const start = Math.min(scrollOffset, allLines.length);
  const end = maxLines !== undefined ? start + maxLines : allLines.length;
  const visible = allLines.slice(start, end);

  return (
    <Box flexDirection="column">
      {visible.map((line) => (
        <Box key={line.key}>{line.node}</Box>
      ))}
    </Box>
  );
}
