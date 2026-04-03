import type { ReactNode } from "react";
import { Box, Text } from "ink";
import MinSizeGate from "./MinSizeGate.js";
import PanelBox from "./PanelBox.js";

export interface ThreePanelLayoutProps {
  /** Watch loop running state. */
  watchRunning: boolean;
  /** Current clock string (HH:MM:SS). */
  clock: string;
  /** Content for the epics panel (top-left). */
  epicsSlot?: ReactNode;
  /** Content for the details panel (top-right). */
  detailsSlot?: ReactNode;
  /** Content for the log panel (bottom). */
  logSlot?: ReactNode;
  /** Key hints text for the bottom bar. */
  keyHints?: string;
  /** Whether the app is shutting down. */
  isShuttingDown?: boolean;
  /** Cancel confirmation prompt content. */
  cancelPrompt?: ReactNode;
}

/** Three-panel k9s-style dashboard layout. */
export default function ThreePanelLayout({
  watchRunning,
  clock,
  epicsSlot,
  detailsSlot,
  logSlot,
  keyHints,
  isShuttingDown,
  cancelPrompt,
}: ThreePanelLayoutProps) {
  return (
    <MinSizeGate>
      <Box flexDirection="column" width="100%" height="100%">
        {/* Outer chrome — header line with title, watch status, and clock */}
        <Box
          borderStyle="single"
          borderColor="cyan"
          flexDirection="column"
          flexGrow={1}
        >
          {/* Status bar inside outer chrome */}
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

          {/* Top section: ~35% height, two panels side by side */}
          <Box flexDirection="row" height="35%">
            <PanelBox title="EPICS" width="30%">
              {epicsSlot}
            </PanelBox>
            <PanelBox title="DETAILS" width="70%">
              {detailsSlot}
            </PanelBox>
          </Box>

          {/* Bottom section: ~65% height, full-width log panel */}
          <PanelBox title="LOG" flexGrow={1}>
            {logSlot}
          </PanelBox>
        </Box>

        {/* Cancel confirmation prompt — between chrome and hints bar */}
        {cancelPrompt}

        {/* Bottom bar — key hints, outside the bordered area */}
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
