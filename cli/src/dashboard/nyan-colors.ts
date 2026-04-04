/**
 * Nyan cat rainbow color palette — 6 stripe colors.
 * Order matches the classic nyan cat trail (top to bottom).
 */
export const NYAN_PALETTE = [
  "#FF0000", // Red
  "#FF9008", // Orange
  "#F6FF00", // Yellow
  "#7CFF27", // Green
  "#5FFBFF", // Cyan
  "#6400FF", // Purple
] as const;

/**
 * Returns the hex color for a non-space character in the banner.
 * Space characters return undefined (no color applied).
 *
 * @param char - The character to colorize
 * @param charIndex - Position of the character in the banner line
 * @param tickOffset - Current animation tick (increments every 80ms)
 * @returns Hex color string or undefined for spaces
 */
export function nyanColor(
  char: string,
  charIndex: number,
  tickOffset: number,
): string | undefined {
  if (char === " ") return undefined;
  const paletteIndex = ((charIndex + tickOffset) % NYAN_PALETTE.length + NYAN_PALETTE.length) % NYAN_PALETTE.length;
  return NYAN_PALETTE[paletteIndex];
}
