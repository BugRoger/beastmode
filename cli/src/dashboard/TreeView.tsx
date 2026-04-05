/**
 * TreeView — Ink component that renders pipeline hierarchy as a terminal tree.
 *
 * Renders: CLI > Epic > Feature with │ · connectors and phase-based coloring.
 * Phase is displayed as a colored badge on each entry line.
 * Blocked/upcoming nodes render dimmed with status badge visible.
 * Active nodes show a spinner indicator.
 */

import { useState, useEffect } from "react";
import { Box, Text } from "ink";
import type { TreeState, EpicNode, FeatureNode, TreeEntry } from "./tree-types.js";
import { formatTreeLine } from "./tree-format.js";
import { isDim, PHASE_COLOR } from "./monokai-palette.js";
import chalk from "chalk";

export interface TreeViewProps {
  /** Full tree state to render. */
  state: TreeState;
}

/** Braille spinner frames (same as InlineSpinner in EpicsPanel). */
const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
const SPINNER_INTERVAL_MS = 80;

function useSpinnerFrame(): string {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % SPINNER_FRAMES.length);
    }, SPINNER_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);
  return SPINNER_FRAMES[frame];
}

function isActive(status: string): boolean {
  return status === "in-progress" || status === "implement" || status === "design" ||
    status === "plan" || status === "validate" || status === "release";
}

function EntryLine({ depth, entry }: {
  depth: "leaf-epic" | "leaf-feature" | "system";
  entry: TreeEntry;
}) {
  const formatted = formatTreeLine(depth, entry.level, entry.phase, entry.message, entry.timestamp);
  return <Text>{formatted}</Text>;
}

function StatusBadge({ status }: { status: string }) {
  const color = PHASE_COLOR[status];
  const badge = `[${status}]`;
  return color ? <Text color={color}>{badge}</Text> : <Text dimColor>{badge}</Text>;
}

function FeatureNodeView({ node, spinnerFrame }: { node: FeatureNode; spinnerFrame: string }) {
  const dim = isDim(node.status);
  const active = node.status === "in-progress";
  const prefix = "│ │ ";

  return (
    <>
      <Text dimColor={dim}>
        <Text>{chalk.hex(PHASE_COLOR.implement || "#727072")(prefix)}</Text>
        {active ? <Text color="cyan">{spinnerFrame} </Text> : null}
        <Text dimColor={dim}>{node.slug}</Text>
        {" "}
        <StatusBadge status={node.status} />
      </Text>
      {node.entries.map((entry) => (
        <EntryLine key={entry.seq} depth="leaf-feature" entry={entry} />
      ))}
    </>
  );
}

function EpicNodeView({ node, spinnerFrame }: { node: EpicNode; spinnerFrame: string }) {
  const dim = isDim(node.status);
  const active = isActive(node.status) && !isDim(node.status);
  const prefix = "│ ";
  const color = PHASE_COLOR[node.status];

  return (
    <>
      <Text dimColor={dim} bold>
        <Text>{color ? chalk.hex(color)(prefix) : prefix}</Text>
        {active ? <Text color="cyan">{spinnerFrame} </Text> : null}
        <Text dimColor={dim}>{node.slug}</Text>
        {" "}
        <StatusBadge status={node.status} />
      </Text>
      {node.entries.map((entry) => (
        <EntryLine key={entry.seq} depth="leaf-epic" entry={entry} />
      ))}
      {node.features.map((feat) => (
        <FeatureNodeView key={feat.slug} node={feat} spinnerFrame={spinnerFrame} />
      ))}
    </>
  );
}

export default function TreeView({ state }: TreeViewProps) {
  const spinnerFrame = useSpinnerFrame();
  const hasContent = state.epics.length > 0 || state.cli.entries.length > 0;

  if (!hasContent) {
    return (
      <Box justifyContent="center" alignItems="center" flexGrow={1}>
        <Text dimColor>no activity</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* CLI root node with system entries */}
      {state.cli.entries.length > 0 && (
        <>
          <Text bold>{formatTreeLine("cli", "info", undefined, "CLI", 0)}</Text>
          {state.cli.entries.map((entry) => (
            <Text key={`sys-${entry.seq}`}>
              {formatTreeLine("system", entry.level, undefined, entry.message, entry.timestamp)}
            </Text>
          ))}
        </>
      )}
      {/* Epic trees */}
      {state.epics.map((epic) => (
        <EpicNodeView key={epic.slug} node={epic} spinnerFrame={spinnerFrame} />
      ))}
    </Box>
  );
}
