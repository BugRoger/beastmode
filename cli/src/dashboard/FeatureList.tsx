import { useState, useEffect } from "react";
import { Box, Text } from "ink";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

const STATUS_COLOR: Record<string, string> = {
  "pending": "gray",
  "in-progress": "yellow",
  "completed": "green",
  "blocked": "red",
};

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

export interface Feature {
  slug: string;
  wave?: number;
  status: "pending" | "in-progress" | "completed" | "blocked";
}

export interface FeatureListProps {
  /** Epic slug for display */
  epicSlug: string;
  /** Features to display */
  features: Feature[];
  /** Currently selected row index */
  selectedIndex: number;
  /** Set of feature slugs that have active sessions */
  activeSessions?: Set<string>;
}

export default function FeatureList({
  epicSlug,
  features,
  selectedIndex,
  activeSessions = new Set(),
}: FeatureListProps) {
  if (features.length === 0) {
    return <Text dimColor>No features found for {epicSlug}.</Text>;
  }

  const slugWidth = Math.max(7, ...features.map((f) => f.slug.length));

  return (
    <Box flexDirection="column">
      {/* Header row */}
      <Box>
        <Box width={2}><Text> </Text></Box>
        <Box width={slugWidth + 2}>
          <Text bold>Feature</Text>
        </Box>
        <Box width={8}>
          <Text bold>Wave</Text>
        </Box>
        <Box>
          <Text bold>Status</Text>
        </Box>
      </Box>
      {/* Data rows */}
      {features.map((feat, rowIndex) => {
        const isSelected = rowIndex === selectedIndex;
        const isActive = activeSessions.has(feat.slug) || feat.status === "in-progress";

        return (
          <Box key={feat.slug}>
            <Box width={2}>
              <Text color="cyan">{isSelected ? ">" : " "}</Text>
            </Box>
            <Box width={slugWidth + 2}>
              <Text inverse={isSelected}>{feat.slug}</Text>
            </Box>
            <Box width={8}>
              <Text dimColor>{feat.wave ?? "-"}</Text>
            </Box>
            <Box>
              {isActive && (
                <>
                  <InlineSpinner />
                  <Text> </Text>
                </>
              )}
              <Text color={STATUS_COLOR[feat.status] as any}>
                {feat.status}
              </Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
