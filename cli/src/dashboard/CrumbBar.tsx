import { Box, Text } from "ink";

export interface CrumbBarProps {
  /** Breadcrumb string from view-stack's crumbBar() function, e.g. "epics > my-epic > feat-1" */
  crumbs: string;
}

export default function CrumbBar({ crumbs }: CrumbBarProps) {
  const parts = crumbs.split(" > ");

  return (
    <Box paddingX={1}>
      {parts.map((part, i) => {
        const isLast = i === parts.length - 1;
        return (
          <Box key={`${part}-${i}`}>
            {i > 0 && <Text dimColor> &gt; </Text>}
            {isLast ? (
              <Text bold color="cyan">
                {part}
              </Text>
            ) : (
              <Text dimColor>{part}</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
