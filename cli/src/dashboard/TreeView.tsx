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

import { Box, Text } from "ink";
import type { TreeState, EpicNode, FeatureNode } from "./tree-types.js";
import { formatTreeLine } from "./tree-format.js";
import { isDim, isFeatureDim, PHASE_COLOR, FEATURE_STATUS_COLOR, CHROME, BADGE_WIDTH } from "./monokai-palette.js";
import { EPIC_SPINNER, FEATURE_SPINNER, useSpinnerTick, isActive } from "./spinner.js";

export interface TreeViewProps {
  /** Full tree state to render. */
  state: TreeState;
  /** Maximum lines to render. Omit for unlimited. */
  maxLines?: number;
  /** Scroll offset — skip this many lines from the top before rendering. */
  scrollOffset?: number;
}

/** A single renderable line with a stable key. */
interface FlatLine {
  key: string;
  node: React.ReactNode;
}

function flattenFeature(feat: FeatureNode, tick: number, isLast: boolean): FlatLine[] {
  const dim = isFeatureDim(feat.status);
  const active = feat.status === "in-progress";
  const color = FEATURE_STATUS_COLOR[feat.status];
  const badge = `[${feat.status}]`.padEnd(BADGE_WIDTH);
  const dotColor = dim ? CHROME.muted : (color ?? CHROME.muted);
  const dot = active ? FEATURE_SPINNER[tick % FEATURE_SPINNER.length] : "○";
  const connector = isLast ? "└─" : "├─";

  const lines: FlatLine[] = [];

  lines.push({
    key: `f-${feat.slug}`,
    node: (
      <Text dimColor={dim}>
        <Text>{"  "}</Text>
        <Text color={CHROME.muted}>{connector}</Text>
        <Text color={dotColor}>{dot}</Text>
        <Text>{" "}</Text>
        {color ? <Text color={color}>{badge}</Text> : <Text dimColor>{badge}</Text>}
        <Text>{" "}</Text>
        <Text dimColor={dim}>{feat.name ?? feat.slug}</Text>
      </Text>
    ),
  });

  const leafDepth = isLast ? "leaf-feature-last" as const : "leaf-feature" as const;
  for (const entry of feat.entries) {
    lines.push({
      key: `fe-${feat.slug}-${entry.seq}`,
      node: (
        <Text>
          {formatTreeLine(leafDepth, entry.level, entry.phase, entry.message, entry.timestamp)}
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
  const badge = `[${epic.status}]`.padEnd(BADGE_WIDTH);
  const dotColor = dim ? CHROME.muted : (color ?? CHROME.muted);
  const dot = active ? EPIC_SPINNER[tick % EPIC_SPINNER.length] : "●";

  const lines: FlatLine[] = [];

  lines.push({
    key: `e-${epic.slug}`,
    node: (
      <Text dimColor={dim} bold>
        <Text>{"  "}</Text>
        <Text color={dotColor}>{dot}</Text>
        <Text>{" "}</Text>
        {color ? <Text color={color}>{badge}</Text> : <Text dimColor>{badge}</Text>}
        <Text>{" "}</Text>
        <Text dimColor={dim}>{epic.name ?? epic.slug}</Text>
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

  for (let fi = 0; fi < epic.features.length; fi++) {
    const isLastFeature = fi === epic.features.length - 1;
    lines.push(...flattenFeature(epic.features[fi], tick, isLastFeature));
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
          <Text>{"  "}</Text>
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
