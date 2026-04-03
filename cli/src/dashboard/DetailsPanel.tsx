import { useState, useEffect } from "react";
import { Box, Text } from "ink";
import type { EnrichedManifest } from "../manifest/store.js";

// --- Shared constants ---

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

const PHASE_COLOR: Record<string, string> = {
  design: "magenta",
  plan: "blue",
  implement: "yellow",
  validate: "cyan",
  release: "green",
  done: "green",
  cancelled: "red",
};

const STATUS_COLOR: Record<string, string> = {
  "pending": "gray",
  "in-progress": "yellow",
  "completed": "green",
  "blocked": "red",
};

// --- Spinner ---

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

// --- Props ---

export interface DetailsPanelProps {
  /** Full epics list (already filtered/sorted by parent). */
  epics: EnrichedManifest[];
  /** Currently selected row index (0 = "(all)" entry). */
  selectedIndex: number;
  /** Set of epic slugs with active sessions. */
  activeSessions: Set<string>;
}

// --- Sub-views ---

function PipelineOverview({ epics }: { epics: EnrichedManifest[] }) {
  const phaseCounts: Record<string, number> = {};
  for (const epic of epics) {
    phaseCounts[epic.phase] = (phaseCounts[epic.phase] ?? 0) + 1;
  }

  return (
    <Box flexDirection="column">
      <Text bold>Pipeline Overview</Text>
      <Text> </Text>
      <Text>Epics: {epics.length}</Text>
      {Object.entries(phaseCounts).map(([phase, count]) => (
        <Text key={phase}>
          {"  "}
          <Text color={PHASE_COLOR[phase] as Parameters<typeof Text>[0]["color"]}>
            {phase}
          </Text>
          : {count}
        </Text>
      ))}
    </Box>
  );
}

function SingleSessionDetail({
  epic,
  active,
}: {
  epic: EnrichedManifest;
  active: boolean;
}) {
  return (
    <Box flexDirection="column">
      <Text bold color="white">{epic.slug}</Text>
      <Text>
        Phase:{" "}
        <Text color={PHASE_COLOR[epic.phase] as Parameters<typeof Text>[0]["color"]}>
          {epic.phase}
        </Text>
      </Text>
      <Box>
        {active ? (
          <>
            <InlineSpinner />
            <Text> running</Text>
          </>
        ) : (
          <Text dimColor>idle</Text>
        )}
      </Box>
    </Box>
  );
}

function ImplementDetail({
  epic,
  activeSessions,
}: {
  epic: EnrichedManifest;
  activeSessions: Set<string>;
}) {
  const features = epic.features;

  return (
    <Box flexDirection="column">
      <Text bold color="white">{epic.slug}</Text>
      <Text>
        Phase:{" "}
        <Text color="yellow">implement</Text>
      </Text>
      {features.length === 0 ? (
        <Text dimColor>no features</Text>
      ) : (
        features.map((feat) => {
          const isActive =
            activeSessions.has(feat.slug) || feat.status === "in-progress";

          return (
            <Box key={feat.slug} gap={1}>
              <Text>{feat.slug}</Text>
              <Text dimColor>{feat.wave ?? "-"}</Text>
              <Box>
                {isActive && (
                  <>
                    <InlineSpinner />
                    <Text> </Text>
                  </>
                )}
                <Text color={STATUS_COLOR[feat.status] as Parameters<typeof Text>[0]["color"]}>
                  {feat.status}
                </Text>
              </Box>
            </Box>
          );
        })
      )}
    </Box>
  );
}

// --- Main component ---

export default function DetailsPanel({
  epics,
  selectedIndex,
  activeSessions,
}: DetailsPanelProps) {
  // "(all)" selected
  if (selectedIndex === 0) {
    return (
      <Box flexDirection="column" overflowY="hidden">
        <PipelineOverview epics={epics} />
      </Box>
    );
  }

  // Single epic selected
  const epic = epics[selectedIndex - 1];
  if (!epic) return <></>;

  const isImplement = epic.phase === "implement";
  const active = activeSessions.has(epic.slug);

  return (
    <Box flexDirection="column" overflowY="hidden">
      {isImplement ? (
        <ImplementDetail epic={epic} activeSessions={activeSessions} />
      ) : (
        <SingleSessionDetail epic={epic} active={active} />
      )}
    </Box>
  );
}
