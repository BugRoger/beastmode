import type { ReactNode } from "react";
import { Box, Text } from "ink";
import MinSizeGate from "./MinSizeGate.js";
import PanelBox from "./PanelBox.js";

/** Dark charcoal background for panel interiors. */
const DARK_CHARCOAL = "#2d2d2d";

export interface TwoColumnLayoutProps {
  /** Watch loop running state. */
  watchRunning: boolean;
  /** Current clock string (HH:MM:SS). */
  clock: string;
  /** Content for the epics panel (left column, top). */
  epicsSlot?: ReactNode;
  /** Content for the details panel (left column, bottom). */
  detailsSlot?: ReactNode;
  /** Content for the log/tree panel (right column, full height). */
  logSlot?: ReactNode;
  /** Key hints text for the bottom bar. */
  keyHints?: string;
  /** Whether the app is shutting down. */
  isShuttingDown?: boolean;
  /** Cancel confirmation prompt content. */
  cancelPrompt?: ReactNode;
}

/** Two-column full-height dashboard layout. */
export default function TwoColumnLayout({
  watchRunning,
  clock,
  epicsSlot,
  detailsSlot,
  logSlot,
  keyHints,
  isShuttingDown,
  cancelPrompt,
}: TwoColumnLayoutProps) {
  return (
    <MinSizeGate>
      <Box flexDirection="column" width="100%" height="100%">
        {/* Header — plain row, no outer chrome border */}
        <Box flexDirection="row" justifyContent="space-between" paddingX={1}>
          <Text bold color="cyan">
            beastmode
          </Text>
          <Box>
            <Text color={watchRunning ? "green" : "red"}>
              {watchRunning ? "watch: running" : "watch: stopped"}
            </Text>
            <Text> </Text>
            <Text dimColor>{clock}</Text>
          </Box>
        </Box>

        {/* Two-column body — fills remaining height */}
        <Box flexDirection="row" flexGrow={1}>
          {/* Left column: 40% width, epics (60%) stacked above details (40%) */}
          <Box flexDirection="column" width="40%">
            <PanelBox title="EPICS" height="60%" backgroundColor={DARK_CHARCOAL}>
              {epicsSlot}
            </PanelBox>
            <PanelBox title="DETAILS" flexGrow={1} backgroundColor={DARK_CHARCOAL}>
              {detailsSlot}
            </PanelBox>
          </Box>

          {/* Right column: 60% width, full-height tree view */}
          <PanelBox title="LOG" width="60%" flexGrow={1} backgroundColor={DARK_CHARCOAL}>
            {logSlot}
          </PanelBox>
        </Box>

        {/* Cancel confirmation prompt — between columns and hints bar */}
        {cancelPrompt}

        {/* Footer — key hints bar */}
        <Box paddingX={1}>
          {isShuttingDown ? (
            <Text color="yellow">shutting down...</Text>
          ) : (
            <Text dimColor>{keyHints}</Text>
          )}
        </Box>
      </Box>
    </MinSizeGate>
  );
}
