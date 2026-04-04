import type { ReactNode } from "react";
import { Box, Text } from "ink";

export interface PanelBoxProps {
  /** Title displayed at the top of the panel. */
  title?: string;
  /** Children rendered inside the panel. */
  children?: ReactNode;
  /** Width — percentage string or number. */
  width?: string | number;
  /** Height — percentage string or number. */
  height?: string | number;
  /** Flex grow factor. */
  flexGrow?: number;
  /** Background color for panel interior. */
  backgroundColor?: string;
}

/** Bordered panel with optional inset title. Uses cyan single-line borders. */
export default function PanelBox({
  title,
  children,
  width,
  height,
  flexGrow,
  backgroundColor,
}: PanelBoxProps) {
  return (
    <Box
      borderStyle="single"
      borderColor="cyan"
      flexDirection="column"
      width={width}
      height={height}
      flexGrow={flexGrow}
    >
      {title && (
        <Box paddingX={1}>
          <Text color="cyan" bold>
            {"─── "}
            {title}
            {" ───"}
          </Text>
        </Box>
      )}
      <Box flexDirection="column" flexGrow={1} paddingX={1} backgroundColor={backgroundColor}>
        {children}
      </Box>
    </Box>
  );
}
