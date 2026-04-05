import { useState, useEffect } from "react";
import { Box, Text } from "ink";
import type { EnrichedManifest } from "../manifest/store.js";
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
  epics: EnrichedManifest[];
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
  const allSelected = selectedIndex === 0;
  const slugWidth =
    Math.max(12, ...epics.map((e) => e.slug.length)) + 2;

  return (
    <Box flexDirection="column">
      {/* (all) entry — always index 0 */}
      <Box>
        <Box width={2}>
          <Text color={CHROME.title}>{allSelected ? ">" : " "}</Text>
        </Box>
        <Text inverse={allSelected} color={allSelected ? CHROME.title : undefined}>
          (all)
        </Text>
      </Box>

      {/* Epic rows or empty state */}
      {epics.length === 0 ? (
        <Box paddingLeft={2}>
          <Text dimColor>no epics</Text>
        </Box>
      ) : (
        epics.map((epic, i) => {
          const rowIndex = i + 1;
          const isSelected = rowIndex === selectedIndex;
          const isActive = activeSessions.has(epic.slug);
          const isConfirming = cancelConfirmingSlug === epic.slug;
          const dim = isDim(epic.phase);
          const icon = getEpicIcon(isSelected, isActive, epic.phase);

          return (
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
                    color={PHASE_COLOR[epic.phase] as Parameters<typeof Text>[0]["color"]}
                    dimColor={dim}
                  >
                    {epic.phase}
                  </Text>
                )}
              </Box>
            </Box>
          );
        })
      )}
    </Box>
  );
}
