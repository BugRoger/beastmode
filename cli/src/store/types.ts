/**
 * Structured Task Store — type definitions.
 *
 * Defines the TaskStore interface, entity types, and status enums
 * for the structured task store. Implementation provided by store-backend feature.
 */

// --- Status Enums ---

export type EpicStatus = "design" | "plan" | "implement" | "validate" | "release" | "done" | "cancelled";
export type FeatureStatus = "pending" | "in-progress" | "completed" | "blocked";
export type EntityType = "epic" | "feature";

// --- Entity Types ---

export interface Epic {
  id: string;
  type: "epic";
  name: string;
  slug: string;
  status: EpicStatus;
  summary?: string | { problem: string; solution: string };
  design?: string;
  plan?: string;
  implement?: string;
  validate?: string;
  release?: string;
  worktree?: { branch: string; path: string };
  depends_on: string[];
  created_at: string;
  updated_at: string;
}

export interface Feature {
  id: string;
  type: "feature";
  parent: string;
  name: string;
  slug: string;
  description?: string;
  status: FeatureStatus;
  reDispatchCount?: number;
  wave?: number;
  plan?: string;
  implement?: string;
  depends_on: string[];
  created_at: string;
  updated_at: string;
}

export type Entity = Epic | Feature;

// --- Patch Types ---

export type EpicPatch = Partial<Omit<Epic, "id" | "type" | "created_at">>;
export type FeaturePatch = Partial<Omit<Feature, "id" | "type" | "parent" | "slug" | "created_at">>;

// --- Tree Node ---

export interface TreeNode {
  entity: Entity;
  children: TreeNode[];
}

// --- Enrichment Types ---

export interface NextAction {
  phase: string;
  args: string[];
  type: "single" | "fan-out";
  features?: string[];
}

export interface EnrichedEpic extends Epic {
  nextAction: NextAction | null;
  features: Feature[];
}

// --- TaskStore Interface ---

export interface TaskStore {
  // Epic CRUD
  getEpic(id: string): Epic | undefined;
  listEpics(): Epic[];
  addEpic(opts: { name: string }): Epic;
  updateEpic(id: string, patch: EpicPatch): Epic;
  deleteEpic(id: string): void;

  // Feature CRUD
  getFeature(id: string): Feature | undefined;
  listFeatures(epicId: string): Feature[];
  addFeature(opts: { parent: string; name: string; description?: string }): Feature;
  updateFeature(id: string, patch: FeaturePatch): Feature;
  deleteFeature(id: string): void;

  // Queries
  ready(opts?: { epicId?: string; type?: EntityType }): Entity[];
  blocked(): Entity[];
  tree(rootId?: string): TreeNode[];
  find(idOrSlug: string): Entity | undefined;

  // Dependency graph
  dependencyChain(id: string): Entity[];
  computeWave(id: string): number;
  detectCycles(): string[][];

  // Lifecycle
  load(): void;
  save(): void;
}
