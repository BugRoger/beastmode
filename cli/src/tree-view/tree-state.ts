import type { LogLevel, LogContext } from "../logger.js";
import type { TreeState, TreeNode, TreeEntry, TreeNodeType } from "./types.js";

let _seq = 0;

function nextId(): string {
  return `entry-${++_seq}-${Date.now()}`;
}

function makeNode(label: string, type: TreeNodeType): TreeNode {
  return { id: `${type}-${label}`, label, type, children: [], entries: [], closed: false };
}

function makeEntry(level: LogLevel, context: LogContext, message: string): TreeEntry {
  return { id: nextId(), timestamp: Date.now(), level, message, context };
}

function findOrCreateChild(parent: { children: TreeNode[] }, label: string, type: TreeNodeType): TreeNode {
  let child = parent.children.find((c) => c.label === label);
  if (!child) {
    child = makeNode(label, type);
    parent.children.push(child);
  }
  return child;
}

function findOrCreateEpic(state: TreeState, epicSlug: string): TreeNode {
  let epic = state.epics.find((e) => e.label === epicSlug);
  if (!epic) {
    epic = makeNode(epicSlug, "epic");
    state.epics.push(epic);
  }
  return epic;
}

/** Create an empty tree state. */
export function createTreeState(): TreeState {
  return { epics: [], systemEntries: [] };
}

/**
 * Add a log entry to the tree at the correct depth based on context.
 *
 * - No epic → systemEntries (flat)
 * - Epic only → epic node entries
 * - Epic + phase → phase node entries
 * - Epic + phase + feature → feature node entries
 */
export function addEntry(state: TreeState, level: LogLevel, context: LogContext, message: string): void {
  const entry = makeEntry(level, context, message);

  if (!context.epic) {
    state.systemEntries.push(entry);
    return;
  }

  const epic = findOrCreateEpic(state, context.epic);

  if (!context.phase) {
    epic.entries.push(entry);
    return;
  }

  const phase = findOrCreateChild(epic, context.phase, "phase");

  if (!context.feature) {
    phase.entries.push(entry);
    return;
  }

  const feature = findOrCreateChild(phase, context.feature, "feature");
  feature.entries.push(entry);
}

/**
 * Open a phase node under an epic.
 * Auto-closes any prior open phase for the same epic (phase auto-derivation).
 */
export function openPhase(state: TreeState, epicSlug: string, phase: string): void {
  const epic = findOrCreateEpic(state, epicSlug);

  // Auto-close prior open phases for this epic
  for (const child of epic.children) {
    if (child.type === "phase" && !child.closed) {
      child.closed = true;
    }
  }

  findOrCreateChild(epic, phase, "phase");
}

/**
 * Close a specific phase node under an epic.
 */
export function closePhase(state: TreeState, epicSlug: string, phase: string): void {
  const epic = state.epics.find((e) => e.label === epicSlug);
  if (!epic) return;

  const phaseNode = epic.children.find((c) => c.label === phase && c.type === "phase");
  if (phaseNode) phaseNode.closed = true;
}
