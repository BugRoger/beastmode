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
        {/* Header bar — banner + watch status */}
        <Box flexDirection="row" justifyContent="space-between" paddingX={1} paddingY={1}>
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

        {/* Main content — vertical split: left column (EPICS + OVERVIEW) | right column (LOG) */}
        <Box flexDirection="row" flexGrow={1}>
          {/* Left column — 35% width */}
          <Box flexDirection="column" width="35%">
            <PanelBox title="EPICS" height="60%">
              {epicsSlot}
            </PanelBox>
            <PanelBox title="OVERVIEW" flexGrow={1}>
              {detailsSlot}
            </PanelBox>
          </Box>

          {/* Right column — 65% width, LOG at full height */}
          <PanelBox title="LOG" width="65%">
            {logSlot}
          </PanelBox>
        </Box>

        {/* Bottom bar — key hints or cancel prompt */}
        <Box paddingX={1}>
          {cancelPrompt ?? (isShuttingDown ? (
            <Text color="yellow">shutting down...</Text>
          ) : (
            <Text color={CHROME.muted}>{keyHints}</Text>
          ))}
        </Box>
      </Box>
    </MinSizeGate>
  );
}
