import { Box, Text } from "ink";
import type { EnrichedManifest } from "../manifest/store.js";

export interface FeatureListProps {
  epicSlug: string;
  features: EnrichedManifest["features"];
  selectedIndex: number;
  activeSessions: Set<string>;
}

export default function FeatureList({
  epicSlug,
  features,
  selectedIndex,
}: FeatureListProps) {
  return (
    <Box flexDirection="column">
      <Text bold>Features in {epicSlug}</Text>
      {features.map((feat, idx) => (
        <Text key={feat.slug} color={idx === selectedIndex ? "cyan" : undefined}>
          {idx === selectedIndex ? "> " : "  "}
          {feat.slug}
        </Text>
      ))}
    </Box>
  );
}
