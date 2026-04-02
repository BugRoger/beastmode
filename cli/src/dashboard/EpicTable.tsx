import { useState, useEffect } from "react";
import { Box, Text } from "ink";
import type { EnrichedManifest } from "../manifest-store.js";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

const PHASE_ORDER: Record<string, number> = {
  cancelled: -1,
  design: 0,
  plan: 1,
  implement: 2,
  validate: 3,
  release: 4,
  done: 5,
};

const PHASE_COLOR: Record<string, string> = {
  design: "magenta",
  plan: "blue",
  implement: "yellow",
  validate: "cyan",
  release: "green",
  done: "green",
  cancelled: "red",
};

function isDim(phase: string): boolean {
  return phase === "done" || phase === "cancelled";
}

function InlineSpinner() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);
  return <Text color="yellow">{SPINNER_FRAMES[frame]}</Text>;
}

function ProgressBar({
  completed,
  total,
  width = 20,
}: {
  completed: number;
  total: number;
  width?: number;
}) {
  if (total === 0) return <Text dimColor>-</Text>;
  const filled = Math.round((completed / total) * width);
  const empty = width - filled;
  return (
    <Text>
      <Text color="green">{"█".repeat(filled)}</Text>
      <Text dimColor>{"░".repeat(empty)}</Text>
      <Text>
        {" "}
        {completed}/{total}
      </Text>
    </Text>
  );
}

export interface EpicTableProps {
  epics: EnrichedManifest[];
  activeSessions: Set<string>;
  showAll?: boolean;
  /** Index of the currently selected row (-1 for none) */
  selectedIndex?: number;
  /** Slug currently in cancel-confirmation state (if any) */
  cancelConfirmingSlug?: string;
}

export default function EpicTable({
  epics,
  activeSessions,
  showAll = false,
  selectedIndex = -1,
  cancelConfirmingSlug,
}: EpicTableProps) {
  const filtered = showAll
    ? epics
    : epics.filter((e) => e.phase !== "done" && e.phase !== "cancelled");

  const sorted = [...filtered].sort((a, b) => {
    const aPhase = PHASE_ORDER[a.phase] ?? 99;
    const bPhase = PHASE_ORDER[b.phase] ?? 99;
    if (aPhase !== bPhase) return bPhase - aPhase;
    return a.slug.localeCompare(b.slug);
  });

  if (sorted.length === 0) {
    return <Text dimColor>No epics found.</Text>;
  }

  const slugWidth = Math.max(5, ...sorted.map((e) => e.slug.length));

  return (
    <Box flexDirection="column">
      {/* Header row */}
      <Box>
        <Box width={2}><Text> </Text></Box>
        <Box width={slugWidth + 2}>
          <Text bold>Epic</Text>
        </Box>
        <Box width={14}>
          <Text bold>Phase</Text>
        </Box>
        <Box width={30}>
          <Text bold>Features</Text>
        </Box>
        <Box>
          <Text bold>Status</Text>
        </Box>
      </Box>
      {/* Data rows */}
      {sorted.map((epic, rowIndex) => {
        const completed = epic.features.filter(
          (f) => f.status === "completed",
        ).length;
        const total = epic.features.length;
        const isActive = activeSessions.has(epic.slug);
        const isSelected = rowIndex === selectedIndex;
        const isConfirming = cancelConfirmingSlug === epic.slug;

        return (
          <Box key={epic.slug}>
            {/* Selection indicator */}
            <Box width={2}>
              <Text color="cyan">{isSelected ? ">" : " "}</Text>
            </Box>
            <Box width={slugWidth + 2}>
              <Text inverse={isSelected}>{epic.slug}</Text>
            </Box>
            <Box width={14}>
              <Text
                color={PHASE_COLOR[epic.phase] as any}
                dimColor={isDim(epic.phase)}
                inverse={isSelected}
              >
                {epic.phase}
              </Text>
            </Box>
            <Box width={30}>
              <ProgressBar completed={completed} total={total} />
            </Box>
            <Box>
              {isConfirming ? (
                <Text color="red" bold>Cancel {epic.slug}? y/n</Text>
              ) : isActive ? (
                <>
                  <InlineSpinner />
                  <Text> </Text>
                </>
              ) : null}
              {!isConfirming && (
                isActive ? (
                  <Text color="yellow">running</Text>
                ) : (
                  <Text dimColor>{epic.phase}</Text>
                )
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
