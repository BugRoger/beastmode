/**
 * Shared types for dashboard logging.
 */

import type { LogLevel } from "../logger.js";

export interface SystemEntryRef {
  entries: { timestamp: number; level: LogLevel; message: string; seq: number }[];
  nextSeq: () => number;
}
