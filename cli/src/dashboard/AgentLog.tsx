import { useState, useEffect, useRef } from "react";
import { Box, Text } from "ink";
import type { LogEntry, SessionEmitter } from "../sdk-streaming.js";

const ENTRY_COLOR: Record<LogEntry["type"], string> = {
  "text": "white",
  "tool-start": "blue",
  "tool-result": "green",
  "heartbeat": "gray",
  "result": "cyan",
};

export interface AgentLogProps {
  /** Epic slug for display */
  epicSlug: string;
  /** Feature slug for display */
  featureSlug: string;
  /** Session emitter to subscribe to, or null if no active session */
  emitter: SessionEmitter | null;
  /** Whether follow mode is active (auto-scroll to bottom) */
  follow: boolean;
  /** Maximum visible lines */
  maxLines?: number;
}

export default function AgentLog({
  epicSlug,
  featureSlug,
  emitter,
  follow,
  maxLines = 30,
}: AgentLogProps) {
  const [entries, setEntries] = useState<LogEntry[]>(() =>
    emitter ? emitter.getBuffer() : [],
  );
  const [done, setDone] = useState(false);
  const scrollOffsetRef = useRef(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Sync with emitter
  useEffect(() => {
    if (!emitter) return;

    // Initial load from buffer
    setEntries(emitter.getBuffer());
    setDone(false);

    const onEntry = () => {
      setEntries(emitter.getBuffer());
    };

    const onDone = () => {
      setEntries(emitter.getBuffer());
      setDone(true);
    };

    emitter.on("entry", onEntry);
    emitter.on("done", onDone);

    return () => {
      emitter.off("entry", onEntry);
      emitter.off("done", onDone);
    };
  }, [emitter]);

  // Auto-scroll when follow mode is on
  useEffect(() => {
    if (follow && entries.length > maxLines) {
      const newOffset = entries.length - maxLines;
      scrollOffsetRef.current = newOffset;
      setScrollOffset(newOffset);
    }
  }, [entries.length, follow, maxLines]);

  if (!emitter) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text dimColor>No active session for {epicSlug}/{featureSlug}.</Text>
      </Box>
    );
  }

  if (entries.length === 0) {
    return (
      <Box flexDirection="column" paddingX={1}>
        <Text dimColor>Waiting for output...</Text>
      </Box>
    );
  }

  // Compute visible window
  const startIndex = follow
    ? Math.max(0, entries.length - maxLines)
    : Math.min(scrollOffset, Math.max(0, entries.length - maxLines));
  const visible = entries.slice(startIndex, startIndex + maxLines);

  return (
    <Box flexDirection="column">
      {/* Status line */}
      <Box paddingX={1}>
        <Text dimColor>
          {entries.length} entries{done ? " (done)" : ""}
          {" | "}
          {follow ? "follow: on" : "follow: off"}
        </Text>
      </Box>
      {/* Log entries */}
      {visible.map((entry) => (
        <Box key={entry.seq} paddingX={1}>
          <Text color={ENTRY_COLOR[entry.type] as any}>
            {entry.type === "text" ? entry.text : `[${entry.type}] ${entry.text}`}
          </Text>
        </Box>
      ))}
    </Box>
  );
}

/** Scroll direction for external navigation */
export type ScrollDirection = "up" | "down";

/** Compute new scroll offset for manual scroll */
export function computeScroll(
  current: number,
  direction: ScrollDirection,
  totalEntries: number,
  maxLines: number,
): number {
  const maxOffset = Math.max(0, totalEntries - maxLines);
  if (direction === "up") return Math.max(0, current - 1);
  if (direction === "down") return Math.min(maxOffset, current + 1);
  return current;
}
