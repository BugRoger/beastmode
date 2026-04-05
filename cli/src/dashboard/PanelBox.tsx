import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Box, Text, measureElement } from "ink";
import { CHROME } from "./monokai-palette.js";

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
  /** Override border color (default: CHROME.border). */
  borderColor?: string;
}

/** Bordered panel with title embedded in the top border line. */
export default function PanelBox({
  title,
  children,
  width,
  height,
  flexGrow,
  borderColor: borderColorProp,
}: PanelBoxProps) {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  const effectiveBorder = borderColorProp ?? CHROME.border;

  useEffect(() => {
    if (ref.current) {
      const measured = measureElement(ref.current).width;
      if (measured !== w) setW(measured);
    }
  });

  // Build top border: ┌─ TITLE ─────...─┐ at exact measured width.
  // Before measurement, fall back to long fill + truncate.
  const prefix = title ? `┌─ ${title} ` : "┌";
  const fill = w > 0
    ? Math.max(0, w - prefix.length - 1)
    : 300;
  const suffix = w > 0 ? "┐" : "";
  const topBorder = prefix + "─".repeat(fill) + suffix;

  return (
    <Box ref={ref} flexDirection="column" width={width} height={height} flexGrow={flexGrow}>
      <Text wrap="truncate-end" color={effectiveBorder}>
        {topBorder}
      </Text>

      {/* Content area with side + bottom borders */}
      <Box
        borderStyle="single"
        borderColor={effectiveBorder}
        borderTop={false}
        flexDirection="column"
        flexGrow={1}
        overflowY="hidden"
        paddingX={1}
      >
        {children}
      </Box>
    </Box>
  );
}
