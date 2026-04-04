/**
 * Centralized Monokai Pro color palette for the dashboard.
 *
 * Single source of truth for all phase colors, chrome colors,
 * and dim-state logic. Consumers import from here.
 */

/** Phase-to-hex-color mapping (Monokai Pro accent palette). */
export const PHASE_COLOR: Record<string, string> = {
  design: "#AB9DF2",
  plan: "#78DCE8",
  implement: "#FFD866",
  validate: "#A9DC76",
  release: "#FC9867",
  done: "#A9DC76",
  cancelled: "#FF6188",
  blocked: "#FF6188",
};

/** Chrome colors for borders, titles, status indicators, and muted text. */
export const CHROME = {
  border: "#727072",
  title: "#78DCE8",
  watchRunning: "#A9DC76",
  watchStopped: "#FF6188",
  muted: "#727072",
} as const;

/** Background colors for depth hierarchy (darkest → lightest). */
export const BG = {
  /** Terminal default — deepest layer (#2D2A2E). Not applied; serves as reference. */
  base: "#2D2A2E",
  /** Panel interiors — middle depth. */
  panel: "#353236",
  /** Header and hints bar — surface layer. */
  surface: "#403E41",
} as const;

/** Returns true for phases that should render dimmed. */
export function isDim(phase: string): boolean {
  return phase === "done" || phase === "cancelled";
}
