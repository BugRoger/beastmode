/**
 * TreeView — Ink component that renders pipeline hierarchy as a terminal tree.
 *
 * Renders: Epic > Phase > Feature with │ · connectors and phase-based coloring.
 * System entries render flat (no prefix).
 * Full scrollback — all entries rendered, no truncation.
 */

import { Box, Text } from "ink";
import type { TreeState, EpicNode, PhaseNode, FeatureNode, TreeEntry } from "./tree-types.js";
import { formatTreeLine } from "./tree-format.js";

export interface TreeViewProps {
  /** Full tree state to render. */
  state: TreeState;
}

function EntryLine({ depth, level, phase, message, timestamp }: {
  depth: "leaf-phase" | "leaf-feature" | "system";
  level: TreeEntry["level"];
  phase?: string;
  message: string;
  timestamp: number;
}) {
  const formatted = formatTreeLine(depth, level, phase, message, timestamp);
  return <Text>{formatted}</Text>;
}

function FeatureNodeView({ node, phase }: { node: FeatureNode; phase: string }) {
  return (
    <>
      <Text>{formatTreeLine("feature", "info", phase, node.slug, 0)}</Text>
      {node.entries.map((entry) => (
        <EntryLine
          key={entry.seq}
          depth="leaf-feature"
          level={entry.level}
          phase={phase}
          message={entry.message}
          timestamp={entry.timestamp}
        />
      ))}
    </>
  );
}

function PhaseNodeView({ node }: { node: PhaseNode }) {
  return (
    <>
      <Text>{formatTreeLine("phase", "info", node.phase, node.phase, 0)}</Text>
      {node.entries.map((entry) => (
        <EntryLine
          key={entry.seq}
          depth="leaf-phase"
          level={entry.level}
          phase={node.phase}
          message={entry.message}
          timestamp={entry.timestamp}
        />
      ))}
      {node.features.map((feat) => (
        <FeatureNodeView key={feat.slug} node={feat} phase={node.phase} />
      ))}
    </>
  );
}

function EpicNodeView({ node }: { node: EpicNode }) {
  return (
    <>
      <Text bold>{formatTreeLine("epic", "info", undefined, node.slug, 0)}</Text>
      {node.phases.map((phase) => (
        <PhaseNodeView key={phase.phase} node={phase} />
      ))}
    </>
  );
}

export default function TreeView({ state }: TreeViewProps) {
  const hasContent = state.epics.length > 0 || state.system.length > 0;

  if (!hasContent) {
    return (
      <Box justifyContent="center" alignItems="center" flexGrow={1}>
        <Text dimColor>no activity</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* System entries first */}
      {state.system.map((entry) => (
        <EntryLine
          key={`sys-${entry.seq}`}
          depth="system"
          level={entry.level}
          message={entry.message}
          timestamp={entry.timestamp}
        />
      ))}
      {/* Epic trees */}
      {state.epics.map((epic) => (
        <EpicNodeView key={epic.slug} node={epic} />
      ))}
    </Box>
  );
}
