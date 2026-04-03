import { Box, Text } from "ink";
import type { CrumbEntry } from "./view-stack.js";

export interface CrumbBarProps {
  crumbs: CrumbEntry[];
}

export default function CrumbBar({ crumbs }: CrumbBarProps) {
  return (
    <Box>
      {crumbs.map((crumb, idx) => (
        <Box key={idx}>
          {idx > 0 && <Text> › </Text>}
          <Text>{crumb.label}</Text>
        </Box>
      ))}
    </Box>
  );
}
