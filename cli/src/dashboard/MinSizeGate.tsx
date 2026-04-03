import type { ReactNode } from "react";
import { Box, Text } from "ink";
import { useTerminalSize } from "./hooks/use-terminal-size.js";

export interface MinSizeGateProps {
  minColumns?: number;
  minRows?: number;
  children: ReactNode;
}

/** Renders children only if terminal meets minimum size; otherwise shows a message. */
export default function MinSizeGate({
  minColumns = 80,
  minRows = 24,
  children,
}: MinSizeGateProps) {
  const { columns, rows } = useTerminalSize();

  if (columns < minColumns || rows < minRows) {
    return (
      <Box justifyContent="center" alignItems="center" width="100%" height="100%">
        <Text color="yellow">
          terminal too small (need {minColumns}x{minRows}, have {columns}x{rows})
        </Text>
      </Box>
    );
  }

  return <>{children}</>;
}
