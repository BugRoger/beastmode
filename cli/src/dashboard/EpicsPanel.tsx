import { useState, useEffect } from "react";
import { Box, Text } from "ink";
import type { EnrichedEpic } from "../store/index.js";
import { PHASE_COLOR, FEATURE_STATUS_COLOR, CHROME, isDim, isFeatureDim } from "./monokai-palette.js";
import type { SelectableRow } from "./epics-tree-model.js";

// --- Shared utilities ---

const EPIC_SPINNER = ["○", "◔", "◑", "◕", "●", "◕", "◑", "◔"];
const FEATURE_SPINNER = ["◉", "◎", "○", "◎"];
const SPINNER_INTERVAL_MS = 120;

function useSpinnerFrame(): number {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((f) => f + 1);
    }, SPINNER_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);
  return frame;
}

// --- Props ---

export interface EpicsPanelProps {
  /** Flat rows including (all), epics, and expanded features */
  flatRows: SelectableRow[];
  /** Set of epic slugs with active sessions */
  activeSessions: Set<string>;
  /** Currently selected row index (0 = "(all)" entry) */
  selectedIndex: number;
  /** Slug currently in cancel-confirmation state */
  cancelConfirmingSlug?: string;
  /** Maximum visible rows in the viewport */
  visibleHeight: number;
}

// --- Component ---

export default function EpicsPanel({
  flatRows,
  activeSessions,
  selectedIndex,
  cancelConfirmingSlug,
  visibleHeight,
}: EpicsPanelProps) {
  const tick = useSpinnerFrame();
  const [scrollOffset, setScrollOffset] = useState(0);

  // Keep selected index in view
  useEffect(() => {
    if (selectedIndex < scrollOffset) {
      setScrollOffset(selectedIndex);
    } else if (selectedIndex >= scrollOffset + visibleHeight) {
      setScrollOffset(selectedIndex - visibleHeight + 1);
    }
  }, [selectedIndex, visibleHeight]);

  // Build all rows, then slice to viewport
  const rows: React.ReactNode[] = [];

  for (let i = 0; i < flatRows.length; i++) {
    const row = flatRows[i];
    const isSelected = i === selectedIndex;

    if (row.type === "all") {
      rows.push(
        <Box key="__all__">
          <Text>
            <Text color={isSelected ? CHROME.title : CHROME.muted}>{"●"}</Text>
            <Text>{" "}</Text>
            <Text inverse={isSelected} color={isSelected ? CHROME.title : undefined}>
              {"(all)"}
            </Text>
          </Text>
        </Box>,
      );
    } else if (row.type === "epic") {
      const epic = row.epic;
      const isActive = activeSessions.has(epic.slug);
      const isConfirming = cancelConfirmingSlug === epic.slug;
      const dim = isDim(epic.status);
      const color = PHASE_COLOR[epic.status];
      const dotColor = isSelected ? CHROME.title : dim ? CHROME.muted : (color ?? CHROME.muted);

      rows.push(
        <Box key={`e-${epic.slug}`}>
          <Box flexGrow={1}>
            <Text dimColor={dim} bold>
              {isActive && !isSelected ? (
                <Text color={dotColor as Parameters<typeof Text>[0]["color"]}>{EPIC_SPINNER[tick % EPIC_SPINNER.length]}</Text>
              ) : (
                <Text color={dotColor as Parameters<typeof Text>[0]["color"]}>{"●"}</Text>
              )}
              <Text>{" "}</Text>
              <Text inverse={isSelected} dimColor={dim}>{epic.slug}</Text>
            </Text>
          </Box>
          <Box>
            <Text dimColor={dim} bold>
              {isConfirming ? (
                <Text color="red" bold>{"[cancel? y/n]"}</Text>
              ) : color ? (
                <Text color={color as Parameters<typeof Text>[0]["color"]} dimColor={dim}>
                  {`[${epic.status}]`}
                </Text>
              ) : (
                <Text dimColor>{`[${epic.status}]`}</Text>
              )}
            </Text>
          </Box>
        </Box>,
      );
    } else {
      // feature row
      const dim = isFeatureDim(row.featureStatus);
      const color = FEATURE_STATUS_COLOR[row.featureStatus];
      const dotColor = dim ? CHROME.muted : (color ?? CHROME.muted);
      const featureActive = row.featureStatus === "in-progress";

      rows.push(
        <Box key={`f-${row.epicSlug}-${row.slug}`}>
          <Box flexGrow={1}>
            <Text dimColor={dim}>
              <Text color={CHROME.muted}>{"├─"}</Text>
              <Text color={isSelected ? CHROME.title : dotColor as Parameters<typeof Text>[0]["color"]}>
                {featureActive && !isSelected
                  ? FEATURE_SPINNER[tick % FEATURE_SPINNER.length]
                  : isSelected ? "●" : "○"}
              </Text>
              <Text>{" "}</Text>
              <Text inverse={isSelected} dimColor={dim}>{row.slug}</Text>
            </Text>
          </Box>
          <Box>
            <Text dimColor={dim}>
              {color ? (
                <Text color={color as Parameters<typeof Text>[0]["color"]} dimColor={dim}>
                  {`[${row.featureStatus}]`}
                </Text>
              ) : (
                <Text dimColor>{`[${row.featureStatus}]`}</Text>
              )}
            </Text>
          </Box>
        </Box>,
      );
    }
  }

  if (flatRows.length <= 1) {
    rows.push(
      <Box key="__empty__" paddingLeft={2}>
        <Text dimColor>no epics</Text>
      </Box>,
    );
  }

  const visible = rows.slice(scrollOffset, scrollOffset + visibleHeight);

  return (
    <Box flexDirection="column" flexGrow={1}>
      {visible}
    </Box>
  );
}
