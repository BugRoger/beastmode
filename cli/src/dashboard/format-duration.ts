/**
 * Format millisecond duration into human-readable string.
 * Examples: "500ms", "5s", "2m 30s", "1h 15m"
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) {
    const remainingSeconds = totalSeconds % 60;
    return `${totalMinutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}
