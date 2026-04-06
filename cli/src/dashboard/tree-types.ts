/**
 * Tree data types for the hierarchical log view.
 *
 * Two-level hierarchy under synthetic SYSTEM root: SYSTEM > Epic > Feature.
 * Phase is a label on entries, not a tree level.
 */

import type { LogLevel } from "../logger.js";

/** A leaf log entry in the tree. */
export interface TreeEntry {
  /** Timestamp in milliseconds since epoch. */
  timestamp: number;
  /** Log level for coloring. */
  level: LogLevel;
  /** Message text. */
  message: string;
  /** Unique sequence number for stable ordering. */
  seq: number;
  /** Phase label (design, plan, implement, validate, release). */
  phase: string;
}

/** A feature node under an epic. */
export interface FeatureNode {
  /** Feature slug. */
  slug: string;
  /** Feature status (pending, in-progress, completed, blocked). */
  status: string;
  /** Leaf entries under this feature. */
  entries: TreeEntry[];
}

/** An epic node — second level of the tree. */
export interface EpicNode {
  /** Epic slug. */
  slug: string;
  /** Epic status (design, plan, implement, validate, release, done, cancelled). */
  status: string;
  /** Feature nodes under this epic. */
  features: FeatureNode[];
  /** Direct entries under the epic (no feature). */
  entries: TreeEntry[];
}

/** System-level entry — renders under the SYSTEM root node. */
export interface SystemEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  seq: number;
}

/** SYSTEM root node — synthetic root holding system-level entries. */
export interface CliNode {
  /** System-level entries (watch loop start/stop, scan events, errors). */
  entries: SystemEntry[];
}

/** Full tree state passed to the TreeView component. */
export interface TreeState {
  /** SYSTEM root node with system entries. */
  cli: CliNode;
  /** Epic trees, ordered by creation time. */
  epics: EpicNode[];
}
