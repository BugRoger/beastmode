import type { LogLevel, LogContext } from "../logger.js";

export interface TreeEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  context: LogContext;
}

export type TreeNodeType = "epic" | "phase" | "feature" | "system";

export interface TreeNode {
  id: string;
  label: string;
  type: TreeNodeType;
  children: TreeNode[];
  entries: TreeEntry[];
  closed: boolean;
}

export interface TreeState {
  epics: TreeNode[];
  systemEntries: TreeEntry[];
}
