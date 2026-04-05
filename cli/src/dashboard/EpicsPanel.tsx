import { useState, useEffect, useRef } from "react";
import { Box, Text, measureElement } from "ink";
import type { EnrichedEpic } from "../store/index.js";
import { PHASE_COLOR, CHROME, isDim } from "./monokai-palette.js";

// --- Shared utilities ---

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

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

// --- Icon logic ---

export interface IconResult {
  char: string;
  color: string | undefined;
  dim: boolean;
  spinner: boolean;
}

export function getEpicIcon(
  isSelected: boolean,
  isActive: boolean,
  phase: string,
): IconResult {
  if (isSelected) {
    return { char: ">", color: CHROME.title, dim: false, spinner: false };
  }
  if (isActive) {
    return { char: "", color: "yellow", dim: false, spinner: true };
  }
  if (isDim(phase)) {
    return { char: "\u00b7", color: undefined, dim: true, spinner: false };
  }
  return {
    char: "\u00b7",
    color: PHASE_COLOR[phase],
    dim: false,
    spinner: false,
  };
}

// --- Props ---

export interface EpicsPanelProps {
  /** Epic list (already filtered/sorted by parent) */
  epics: EnrichedEpic[];
  /** Set of epic slugs with active sessions */
  activeSessions: Set<string>;
  /** Currently selected row index (0 = "(all)" entry) */
  selectedIndex: number;
  /** Slug currently in cancel-confirmation state */
  cancelConfirmingSlug?: string;
}

// --- Component ---

export default function EpicsPanel({
  epics,
  activeSessions,
  selectedIndex,
  cancelConfirmingSlug,
}: EpicsPanelProps) {
  const ref = useRef(null);
  const [visibleRows, setVisibleRows] = useState(Infinity);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Measure available height for viewport scrolling
  useEffect(() => {
    if (ref.current) {
      const { height } = measureElement(ref.current);
      if (height !== visibleRows) setVisibleRows(height);
    }
  });

  // Keep selected index in view
  useEffect(() => {
    if (selectedIndex < scrollOffset) {
      setScrollOffset(selectedIndex);
    } else if (selectedIndex >= scrollOffset + visibleRows) {
      setScrollOffset(selectedIndex - visibleRows + 1);
    }
  }, [selectedIndex, visibleRows]);

  const allSelected = selectedIndex === 0;
  const slugWidth =
    Math.max(12, ...epics.map((e) => e.slug.length)) + 2;

  // Build all rows, then slice to viewport
  const rows: React.ReactNode[] = [];

  // (all) entry — always index 0
  rows.push(
    <Box key="__all__">
      <Box width={2}>
        <Text color={CHROME.title}>{allSelected ? ">" : " "}</Text>
      </Box>
      <Text inverse={allSelected} color={allSelected ? CHROME.title : undefined}>
        (all)
      </Text>
    </Box>
  );

  if (epics.length === 0) {
    rows.push(
      <Box key="__empty__" paddingLeft={2}>
        <Text dimColor>no epics</Text>
      </Box>
    );
  } else {
    for (let i = 0; i < epics.length; i++) {
      const epic = epics[i];
      const rowIndex = i + 1;
      const isSelected = rowIndex === selectedIndex;
      const isActive = activeSessions.has(epic.slug);
      const isConfirming = cancelConfirmingSlug === epic.slug;
      const dim = isDim(epic.status);
      const icon = getEpicIcon(isSelected, isActive, epic.status);

      rows.push(
        <Box key={epic.slug}>
          <Box width={2}>
            {icon.spinner ? (
              <InlineSpinner />
            ) : (
              <Text
                color={icon.color as Parameters<typeof Text>[0]["color"]}
                dimColor={icon.dim}
              >
                {icon.char}
              </Text>
            )}
          </Box>
          <Box width={slugWidth}>
            <Text inverse={isSelected} dimColor={dim}>
              {epic.slug}
            </Text>
          </Box>
          <Box>
            {isConfirming ? (
              <Text color="red" bold>
                Cancel {epic.slug}? y/n
              </Text>
            ) : (
              <Text
                color={PHASE_COLOR[epic.status] as Parameters<typeof Text>[0]["color"]}
                dimColor={dim}
              >
                {epic.status}
              </Text>
            )}
          </Box>
        </Box>
      );
    }
  }

  const visible = visibleRows < Infinity
    ? rows.slice(scrollOffset, scrollOffset + visibleRows)
    : rows;

  return (
    <Box ref={ref} flexDirection="column" flexGrow={1}>
      {visible}
    </Box>
  );
}
