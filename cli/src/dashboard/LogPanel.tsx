import { Box, Text } from "ink";
import type { MergedLogEntry } from "./hooks/use-log-entries.js";

export interface LogPanelProps {
  /** Merged, sorted log entries to display. */
  entries: MergedLogEntry[];
  /** Maximum visible lines to render. Default: 50 */
  maxVisibleLines?: number;
}

/** Format a timestamp (ms since epoch) to HH:MM:SS. */
function formatTime(ts: number): string {
  const d = new Date(ts);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

/** Maximum width for the label column. */
const LABEL_WIDTH = 20;

export default function LogPanel({
  entries,
  maxVisibleLines = 50,
}: LogPanelProps) {
  if (entries.length === 0) {
    return (
      <Box justifyContent="center" alignItems="center" flexGrow={1}>
        <Text dimColor>no active sessions</Text>
      </Box>
    );
  }

  // Take only the last N entries for auto-follow
  const visible = entries.length > maxVisibleLines
    ? entries.slice(entries.length - maxVisibleLines)
    : entries;

  return (
    <Box flexDirection="column">
      {visible.map((entry) => {
        const time = formatTime(entry.timestamp);
        const label = entry.label.length > LABEL_WIDTH
          ? entry.label.slice(0, LABEL_WIDTH - 1) + "\u2026"
          : entry.label.padEnd(LABEL_WIDTH);

        if (entry.isError) {
          return (
            <Text key={`${entry.label}-${entry.seq}`} color="red">
              {time}  {label}  {entry.text}
            </Text>
          );
        }

        return (
          <Box key={`${entry.label}-${entry.seq}`}>
            <Text dimColor>{time}</Text>
            <Text>  </Text>
            <Text bold>{label}</Text>
            <Text>  </Text>
            <Text>{entry.text}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
