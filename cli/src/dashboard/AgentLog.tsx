import { Box, Text } from "ink";

export interface AgentLogProps {
  epicSlug: string;
  featureSlug: string;
  emitter: null; // Placeholder — streaming not implemented yet
  follow: boolean;
}

export default function AgentLog({
  epicSlug,
  featureSlug,
  follow,
}: AgentLogProps) {
  return (
    <Box flexDirection="column">
      <Text>Agent Log: {epicSlug}/{featureSlug}</Text>
      <Text dimColor>{follow ? "following" : "paused"}</Text>
      <Text dimColor>No logs available</Text>
    </Box>
  );
}
