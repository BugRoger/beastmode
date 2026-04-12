import { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { PHASE_COLOR, FEATURE_STATUS_COLOR, CHROME, isDim, isFeatureDim, BADGE_WIDTH } from "./monokai-palette.js";
import { EPIC_SPINNER, FEATURE_SPINNER, useSpinnerTick, isActive } from "./spinner.js";
import type { SelectableRow } from "./epics-tree-model.js";

type InkColor = Parameters<typeof Text>[0]["color"];

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
  activeSessions: _activeSessions,
  selectedIndex,
  cancelConfirmingSlug,
  visibleHeight,
}: EpicsPanelProps) {
  const tick = useSpinnerTick();
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
      const active = isActive(epic.status);
      const isConfirming = cancelConfirmingSlug === epic.slug;
      const dim = isDim(epic.status);
      const color = PHASE_COLOR[epic.status];
      const dotColor = isSelected ? CHROME.title : dim ? CHROME.muted : (color ?? CHROME.muted);

      const badgeText = isConfirming
        ? `[cancel? y/n]`
        : `[${epic.status}]`;
      const paddedBadge = badgeText.padEnd(BADGE_WIDTH);

      rows.push(
        <Box key={`e-${epic.slug}`}>
          <Text dimColor={dim} bold>
            {active && !isSelected ? (
              <Text color={dotColor as InkColor}>{EPIC_SPINNER[tick % EPIC_SPINNER.length]}</Text>
            ) : (
              <Text color={dotColor as InkColor}>{"●"}</Text>
            )}
            <Text>{" "}</Text>
            {isConfirming ? (
              <Text color="red" bold>{paddedBadge}</Text>
            ) : color ? (
              <Text color={color as InkColor} dimColor={dim}>{paddedBadge}</Text>
            ) : (
              <Text dimColor>{paddedBadge}</Text>
            )}
            <Text>{" "}</Text>
            <Text inverse={isSelected} dimColor={dim}>{epic.name || epic.slug}</Text>
          </Text>
        </Box>,
      );
    } else {
      // feature row
      const dim = isFeatureDim(row.featureStatus);
      const color = FEATURE_STATUS_COLOR[row.featureStatus];
      const dotColor = dim ? CHROME.muted : (color ?? CHROME.muted);
      const featureActive = row.featureStatus === "in-progress";

      const fBadgeText = `[${row.featureStatus}]`;
      const fPaddedBadge = fBadgeText.padEnd(BADGE_WIDTH);

      // Check if this is the last feature under its parent epic
      const nextRow = flatRows[i + 1];
      const isLastFeature = !nextRow || nextRow.type !== "feature";
      const connector = isLastFeature ? "└─" : "├─";

      rows.push(
        <Box key={`f-${row.epicSlug}-${row.slug}`}>
          <Text dimColor={dim}>
            <Text color={CHROME.muted}>{connector}</Text>
            <Text color={isSelected ? CHROME.title : dotColor as InkColor}>
              {featureActive && !isSelected
                ? FEATURE_SPINNER[tick % FEATURE_SPINNER.length]
                : isSelected ? "●" : "○"}
            </Text>
            <Text>{" "}</Text>
            {color ? (
              <Text color={color as InkColor} dimColor={dim}>{fPaddedBadge}</Text>
            ) : (
              <Text dimColor>{fPaddedBadge}</Text>
            )}
            <Text>{" "}</Text>
            <Text inverse={isSelected} dimColor={dim}>{row.name ?? row.slug}</Text>
          </Text>
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
