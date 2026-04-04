import type { ReactNode } from "react";
import { Box, Text } from "ink";
import MinSizeGate from "./MinSizeGate.js";
import PanelBox from "./PanelBox.js";
import NyanBanner from "./NyanBanner.js";
import { CHROME } from "./monokai-palette.js";

export interface ThreePanelLayoutProps {
  /** Watch loop running state. */
  watchRunning: boolean;
  /** Current clock string (HH:MM:SS). */
  clock: string;
  /** Terminal row count for full-height rendering. */
  rows?: number;
  /** Content for the epics panel (top-left). */
  epicsSlot?: ReactNode;
  /** Content for the overview panel (top-right). */
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
  rows,
  epicsSlot,
  detailsSlot,
  logSlot,
  keyHints,
  isShuttingDown,
  cancelPrompt,
}: ThreePanelLayoutProps) {
  return (
    <MinSizeGate>
      <Box flexDirection="column" width="100%" height={rows ?? "100%"}>
        {/* Outer chrome — header line with title, watch status, and clock */}
        <Box
          borderStyle="single"
          borderColor={CHROME.border}
          flexDirection="column"
          flexGrow={1}
        >
          {/* Banner + status bar */}
          <Box flexDirection="row" justifyContent="space-between" paddingX={1}>
            <NyanBanner />
            <Box flexDirection="column" alignItems="flex-end" justifyContent="flex-start">
              <Box>
                <Text color={watchRunning ? CHROME.watchRunning : CHROME.watchStopped}>
                  {watchRunning ? "watch: running" : "watch: stopped"}
                </Text>
                <Text> </Text>
                <Text color={CHROME.muted}>{clock}</Text>
              </Box>
            </Box>
          </Box>

          {/* Top section: ~35% height, two panels side by side */}
          <Box flexDirection="row" height="35%">
            <PanelBox title="EPICS" width="30%">
              {epicsSlot}
            </PanelBox>
            <PanelBox title="OVERVIEW" width="70%">
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
            <Text color={CHROME.muted}>{keyHints}</Text>
          )}
        </Box>
      </Box>
    </MinSizeGate>
  );
}
