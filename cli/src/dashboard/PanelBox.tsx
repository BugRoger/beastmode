import type { ReactNode } from "react";
import { Box, Text } from "ink";

export interface PanelBoxProps {
  /** Title displayed inline in the top border of the panel. */
  title?: string;
  /** Children rendered inside the panel. */
  children?: ReactNode;
  /** Width — percentage string or number. */
  width?: string | number;
  /** Height — percentage string or number. */
  height?: string | number;
  /** Flex grow factor. */
  flexGrow?: number;
}

/** Bordered panel with title embedded in the top border line. Uses cyan single-line borders. */
export default function PanelBox({
  title,
  children,
  width,
  height,
  flexGrow,
}: PanelBoxProps) {
  return (
    <Box
      flexDirection="column"
      width={width}
      height={height}
      flexGrow={flexGrow}
    >
      {/* Custom top border with inline title */}
      <Box>
        <Text color="cyan">
          {title ? `┌─ ${title} ` : "┌"}
          {"─".repeat(200)}
        </Text>
      </Box>

      {/* Content area with side + bottom borders from Ink */}
      <Box
        borderStyle="single"
        borderColor="cyan"
        borderTop={false}
        flexDirection="column"
        flexGrow={1}
      >
        <Box flexDirection="column" flexGrow={1} paddingX={1}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
