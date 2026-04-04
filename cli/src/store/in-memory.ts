/**
 * In-memory implementation of TaskStore for testing and development.
 */

import {
  TaskStore,
  Entity,
  Epic,
  Feature,
  EpicPatch,
  FeaturePatch,
  TreeNode,
  EntityType,
} from "./types.js";

export class InMemoryTaskStore implements TaskStore {
  private entities = new Map<string, Entity>();
  private epicCounters = new Map<string, number>(); // parent ID -> next feature ordinal

  /**
   * Generate a unique Epic ID: bm-XXXX where XXXX is 4 random hex chars
   */
  private generateEpicId(): string {
    let id: string;
    do {
      const hex = Math.floor(Math.random() * 0x10000)
        .toString(16)
        .padStart(4, "0");
      id = `bm-${hex}`;
    } while (this.entities.has(id));
    return id;
  }

  /**
   * Generate a Feature ID: {parentId}.N where N is sequential ordinal
   */
  private generateFeatureId(parentId: string): string {
    const counter = (this.epicCounters.get(parentId) ?? 0) + 1;
    this.epicCounters.set(parentId, counter);
    return `${parentId}.${counter}`;
  }

  /**
   * Get current timestamp as ISO string
   */
  private now(): string {
    return new Date().toISOString();
  }

  // --- Epic CRUD ---

  getEpic(id: string): Epic | undefined {
    const entity = this.entities.get(id);
    return entity?.type === "epic" ? entity : undefined;
  }

  listEpics(): Epic[] {
    return Array.from(this.entities.values()).filter(
      (e): e is Epic => e.type === "epic"
    );
  }

  addEpic(opts: { name: string; slug?: string }): Epic {
    const id = this.generateEpicId();
    const epic: Epic = {
      id,
      type: "epic",
      name: opts.name,
      slug: opts.slug || opts.name.toLowerCase().replace(/\s+/g, "-"),
      status: "design",
      depends_on: [],
      created_at: this.now(),
      updated_at: this.now(),
    };
    this.entities.set(id, epic);
    this.epicCounters.set(id, 0);
    return epic;
  }

  updateEpic(id: string, patch: EpicPatch): Epic {
    const epic = this.getEpic(id);
    if (!epic) throw new Error(`Epic not found: ${id}`);

    const updated: Epic = {
      ...epic,
      ...patch,
      id: epic.id, // immutable
      type: "epic", // immutable
      created_at: epic.created_at, // immutable
      updated_at: this.now(),
    };
    this.entities.set(id, updated);
    return updated;
  }

  deleteEpic(id: string): void {
    const epic = this.getEpic(id);
    if (!epic) throw new Error(`Epic not found: ${id}`);

    // Delete all child features
    const children = Array.from(this.entities.values()).filter(
      (e): e is Feature => e.type === "feature" && e.parent === id
    );
    for (const child of children) {
      this.entities.delete(child.id);
    }

    // Delete the epic
    this.entities.delete(id);
    this.epicCounters.delete(id);
  }

  // --- Feature CRUD ---

  getFeature(id: string): Feature | undefined {
    const entity = this.entities.get(id);
    return entity?.type === "feature" ? entity : undefined;
  }

  listFeatures(epicId: string): Feature[] {
    return Array.from(this.entities.values()).filter(
      (e): e is Feature => e.type === "feature" && e.parent === epicId
    );
  }

  addFeature(opts: { parent: string; name: string; description?: string }): Feature {
    const parentEpic = this.getEpic(opts.parent);
    if (!parentEpic) throw new Error(`Parent epic not found: ${opts.parent}`);

    const id = this.generateFeatureId(opts.parent);
    const feature: Feature = {
      id,
      type: "feature",
      parent: opts.parent,
      name: opts.name,
      description: opts.description,
      status: "pending",
      depends_on: [],
      created_at: this.now(),
      updated_at: this.now(),
    };
    this.entities.set(id, feature);
    return feature;
  }

  updateFeature(id: string, patch: FeaturePatch): Feature {
    const feature = this.getFeature(id);
    if (!feature) throw new Error(`Feature not found: ${id}`);

    const updated: Feature = {
      ...feature,
      ...patch,
      id: feature.id, // immutable
      type: "feature", // immutable
      parent: feature.parent, // immutable
      created_at: feature.created_at, // immutable
      updated_at: this.now(),
    };
    this.entities.set(id, updated);
    return updated;
  }

  deleteFeature(id: string): void {
    const feature = this.getFeature(id);
    if (!feature) throw new Error(`Feature not found: ${id}`);
    this.entities.delete(id);
  }

  // --- Queries ---

  ready(opts?: { epicId?: string; type?: EntityType }): Entity[] {
    const results: Entity[] = [];

    for (const entity of this.entities.values()) {
      // Filter by type if specified
      if (opts?.type && entity.type !== opts.type) continue;

      // For features: check if parent is not cancelled/done and status is "pending"
      if (entity.type === "feature") {
        if (entity.status !== "pending") continue;
        if (opts?.epicId && entity.parent !== opts.epicId) continue;

        const parent = this.getEpic(entity.parent);
        if (!parent) continue;
        if (parent.status === "cancelled" || parent.status === "done") continue;

        // Check all depends_on are resolved
        if (!this.areDependenciesResolved(entity)) continue;

        results.push(entity);
      }

      // For epics: check if status is "design" and matches epicId filter
      if (entity.type === "epic") {
        if (entity.status !== "design") continue;
        if (opts?.epicId && entity.id !== opts.epicId) continue;

        // Check all depends_on are resolved
        if (!this.areDependenciesResolved(entity)) continue;

        results.push(entity);
      }
    }

    return results;
  }

  blocked(): Entity[] {
    return Array.from(this.entities.values()).filter(
      (e) => e.status === "blocked"
    );
  }

  tree(rootId?: string): TreeNode[] {
    const results: TreeNode[] = [];

    if (rootId) {
      // Return subtree rooted at rootId
      const root = this.entities.get(rootId);
      if (!root) return [];

      if (root.type === "epic") {
        results.push(this.buildTreeNode(root));
      } else if (root.type === "feature") {
        // If rootId is a feature, just return that feature without children
        results.push({
          entity: root,
          children: [],
        });
      }
    } else {
      // Return all epics with their children at top level
      for (const entity of this.entities.values()) {
        if (entity.type === "epic") {
          results.push(this.buildTreeNode(entity));
        }
      }
    }

    return results;
  }

  private buildTreeNode(epic: Epic): TreeNode {
    const features = this.listFeatures(epic.id);
    const children = features.map((f) => ({
      entity: f,
      children: [] as TreeNode[],
    }));

    return {
      entity: epic,
      children,
    };
  }

  find(idOrSlug: string): Entity | undefined {
    // Try lookup by ID first
    const byId = this.entities.get(idOrSlug);
    if (byId) return byId;

    // For epics, try lookup by slug
    for (const entity of this.entities.values()) {
      if (entity.type === "epic" && entity.slug === idOrSlug) {
        return entity;
      }
    }

    return undefined;
  }

  // --- Dependency graph ---

  dependencyChain(id: string): Entity[] {
    const visited = new Set<string>();
    const result: Entity[] = [];

    const visit = (entityId: string) => {
      if (visited.has(entityId)) return;
      visited.add(entityId);

      const entity = this.entities.get(entityId);
      if (!entity) return;

      // Visit dependencies first (topological order)
      for (const depId of entity.depends_on) {
        visit(depId);
      }

      result.push(entity);
    };

    visit(id);
    return result;
  }

  computeWave(id: string): number {
    const entity = this.entities.get(id);
    if (!entity) throw new Error(`Entity not found: ${id}`);

    const visited = new Set<string>();

    const computeDepth = (entityId: string): number => {
      if (visited.has(entityId)) return 0; // Already computed
      visited.add(entityId);

      const ent = this.entities.get(entityId);
      if (!ent || ent.depends_on.length === 0) return 1;

      const maxDepDepth = Math.max(
        ...ent.depends_on.map((depId) => computeDepth(depId))
      );
      return maxDepDepth + 1;
    };

    return computeDepth(id);
  }

  detectCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string, path: string[]): void => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const entity = this.entities.get(nodeId);
      if (entity) {
        for (const depId of entity.depends_on) {
          if (!visited.has(depId)) {
            dfs(depId, [...path]);
          } else if (recursionStack.has(depId)) {
            // Found a cycle
            const cycleStart = path.indexOf(depId);
            if (cycleStart !== -1) {
              const cycle = path.slice(cycleStart).concat([depId]);
              cycles.push(cycle);
            }
          }
        }
      }

      recursionStack.delete(nodeId);
    };

    for (const entity of this.entities.values()) {
      if (!visited.has(entity.id)) {
        dfs(entity.id, []);
      }
    }

    return cycles;
  }

  // --- Lifecycle ---

  load(): void {
    // No-op for in-memory store
  }

  save(): void {
    // No-op for in-memory store
  }

  // --- Helper methods ---

  private areDependenciesResolved(entity: Entity): boolean {
    for (const depId of entity.depends_on) {
      const dep = this.entities.get(depId);
      if (!dep) return false; // Dependency not found

      if (dep.type === "epic") {
        // Epic must be "done"
        if (dep.status !== "done") return false;
      } else if (dep.type === "feature") {
        // Feature must be "completed"
        if (dep.status !== "completed") return false;
      }
    }

    return true;
  }
}
