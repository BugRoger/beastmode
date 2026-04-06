import { Box, Text } from "ink";
import type { EnrichedEpic } from "../store/index.js";
import type { GitStatus } from "./overview-panel.js";
import {
  type DetailsPanelSelection,
  resolveDetailsContent,
} from "./details-panel.js";
import { PHASE_COLOR, CHROME } from "./monokai-palette.js";

export interface DetailsPanelProps {
  selection: DetailsPanelSelection;
  projectRoot?: string;
  epics: EnrichedEpic[];
  activeSessions: number;
  gitStatus: GitStatus | null;
  scrollOffset: number;
  visibleHeight: number;
}

// --- Minimal markdown renderer for Ink ---

/** Parse inline markdown (bold, code) into Ink Text nodes. */
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(<Text key={key++}>{text.slice(last, match.index)}</Text>);
    }
    if (match[2]) {
      nodes.push(<Text key={key++} bold>{match[2]}</Text>);
    } else if (match[3]) {
      nodes.push(<Text key={key++} color={CHROME.title}>{match[3]}</Text>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    nodes.push(<Text key={key++}>{text.slice(last)}</Text>);
  }
  return nodes;
}

/** Render a single markdown line as Ink nodes. */
function renderMarkdownLine(line: string): React.ReactNode {
  const headingMatch = line.match(/^(#{1,3})\s+(.*)/);
  if (headingMatch) {
    return <Text bold>{headingMatch[2]}</Text>;
  }

  const numMatch = line.match(/^(\d+)\.\s+(.*)/);
  if (numMatch) {
    return <Text>{numMatch[1]}. {renderInline(numMatch[2])}</Text>;
  }

  const bulletMatch = line.match(/^[-*]\s+(.*)/);
  if (bulletMatch) {
    return <Text>{"· "}{renderInline(bulletMatch[1])}</Text>;
  }

  if (!line.trim()) return <Text>{" "}</Text>;

  return <Text>{renderInline(line)}</Text>;
}

/**
 * Build plain-text lines for the overview content.
 * Keeps rendering logic in the component but produces sliceable output.
 */
function overviewLines(
  distribution: Array<{ phase: string; count: number }>,
  sessions: string,
  git: string | null,
): Array<{ key: string; node: React.ReactNode }> {
  const lines: Array<{ key: string; node: React.ReactNode }> = [];

  lines.push({ key: "h-phase", node: <Text bold>Phase Distribution</Text> });
  if (distribution.length === 0) {
    lines.push({ key: "no-epics", node: <Text dimColor>  no epics</Text> });
  } else {
    for (const { phase, count } of distribution) {
      lines.push({
        key: `p-${phase}`,
        node: (
          <Text>
            {"  "}
            <Text color={PHASE_COLOR[phase] as Parameters<typeof Text>[0]["color"]}>
              {phase}
            </Text>
            {" "}
            {count}
          </Text>
        ),
      });
    }
  }

  lines.push({ key: "sp1", node: <Text> </Text> });
  lines.push({ key: "h-sess", node: <Text bold>Sessions</Text> });
  lines.push({ key: "sess", node: <Text>  {sessions}</Text> });

  lines.push({ key: "sp2", node: <Text> </Text> });
  lines.push({ key: "h-git", node: <Text bold>Git</Text> });
  lines.push({
    key: "git",
    node: git ? <Text>  {git}</Text> : <Text dimColor>  loading...</Text>,
  });

  return lines;
}

export default function DetailsPanel({
  selection,
  projectRoot,
  epics,
  activeSessions,
  gitStatus,
  scrollOffset,
  visibleHeight,
}: DetailsPanelProps) {
  const result = resolveDetailsContent(selection, {
    epics,
    activeSessions,
    gitStatus,
    projectRoot,
  });

  if (result.kind === "overview") {
    const lines = overviewLines(result.distribution, result.sessions, result.git);
    const clamped = Math.max(0, Math.min(scrollOffset, Math.max(0, lines.length - visibleHeight)));
    const visible = lines.slice(clamped, clamped + visibleHeight);
    return (
      <Box flexDirection="column" overflowY="hidden">
        {visible.map((l) => (
          <Box key={l.key}>{l.node}</Box>
        ))}
      </Box>
    );
  }

  if (result.kind === "not-found") {
    return (
      <Box flexDirection="column" overflowY="hidden">
        <Text dimColor>{result.message}</Text>
      </Box>
    );
  }

  // Artifact content — render with markdown formatting
  const lines = result.text.split("\n");
  const clampedOffset = Math.max(0, Math.min(scrollOffset, Math.max(0, lines.length - visibleHeight)));
  const visibleLines = lines.slice(clampedOffset, clampedOffset + visibleHeight);

  return (
    <Box flexDirection="column" overflowY="hidden">
      {visibleLines.map((line, i) => (
        <Box key={clampedOffset + i}>{renderMarkdownLine(line)}</Box>
      ))}
    </Box>
  );
}
