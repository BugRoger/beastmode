/**
 * Store module barrel export.
 *
 * Re-exports the TaskStore interface, entity types, and implementations.
 */

export type {
  TaskStore,
  Entity,
  Epic,
  Feature,
  EpicPatch,
  FeaturePatch,
  TreeNode,
  EntityType,
  EpicStatus,
  FeatureStatus,
} from "./types.js";

export { InMemoryTaskStore } from "./in-memory.js";
export { JsonFileStore } from "./json-file-store.js";
export { resolveIdentifier, type ResolveResult, type ResolveOptions } from "./resolve.js";
