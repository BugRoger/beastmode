/**
 * JSON file-backed implementation of TaskStore.
 *
 * Delegates all business logic to InMemoryTaskStore.
 * Adds file I/O (load/save) and async mutex for concurrency.
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "fs";
import { dirname } from "path";
import { InMemoryTaskStore } from "./in-memory.js";
import type {
  TaskStore,
  Entity,
  Epic,
  Feature,
  EpicPatch,
  FeaturePatch,
  TreeNode,
  EntityType,
} from "./types.js";

/** On-disk JSON schema */
interface StoreFile {
  version: number;
  entities: Record<string, Entity>;
}

const CURRENT_VERSION = 1;

export class JsonFileStore implements TaskStore {
  private inner: InMemoryTaskStore;
  private filePath: string;

  /** Per-file async mutex — promise chain serializes concurrent transact() calls. */
  private lock: Promise<void> = Promise.resolve();

  constructor(filePath: string) {
    this.filePath = filePath;
    this.inner = new InMemoryTaskStore();
  }

  // --- Lifecycle ---

  load(): void {
    if (!existsSync(this.filePath)) return; // Empty store

    const raw = readFileSync(this.filePath, "utf-8");
    const data: StoreFile = JSON.parse(raw);

    // Rebuild InMemoryTaskStore from persisted entities
    this.inner = new InMemoryTaskStore();
    this.inner.loadEntities(data.entities);
  }

  save(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const data: StoreFile = {
      version: CURRENT_VERSION,
      entities: this.inner.dumpEntities(),
    };

    writeFileSync(this.filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
  }

  /**
   * Atomically load → mutate → save under an async mutex.
   * Serializes concurrent mutations to prevent data races.
   */
  async transact<T>(fn: (store: JsonFileStore) => T): Promise<T> {
    const prev = this.lock;
    let release!: () => void;
    this.lock = new Promise<void>((r) => { release = r; });
    await prev;
    try {
      this.load();
      const result = fn(this);
      this.save();
      return result;
    } finally {
      release();
    }
  }

  // --- Epic CRUD (delegate to inner) ---

  getEpic(id: string): Epic | undefined {
    return this.inner.getEpic(id);
  }

  listEpics(): Epic[] {
    return this.inner.listEpics();
  }

  addEpic(opts: { name: string }): Epic {
    return this.inner.addEpic(opts);
  }

  updateEpic(id: string, patch: EpicPatch): Epic {
    return this.inner.updateEpic(id, patch);
  }

  deleteEpic(id: string): void {
    this.inner.deleteEpic(id);
  }

  // --- Feature CRUD (delegate to inner) ---

  getFeature(id: string): Feature | undefined {
    return this.inner.getFeature(id);
  }

  listFeatures(epicId: string): Feature[] {
    return this.inner.listFeatures(epicId);
  }

  addFeature(opts: { parent: string; name: string; description?: string }): Feature {
    return this.inner.addFeature(opts);
  }

  updateFeature(id: string, patch: FeaturePatch): Feature {
    return this.inner.updateFeature(id, patch);
  }

  deleteFeature(id: string): void {
    this.inner.deleteFeature(id);
  }

  // --- Queries (delegate to inner) ---

  ready(opts?: { epicId?: string; type?: EntityType }): Entity[] {
    return this.inner.ready(opts);
  }

  blocked(): Entity[] {
    return this.inner.blocked();
  }

  tree(rootId?: string): TreeNode[] {
    return this.inner.tree(rootId);
  }

  find(idOrSlug: string): Entity | undefined {
    return this.inner.find(idOrSlug);
  }

  // --- Dependency graph (delegate to inner) ---

  dependencyChain(id: string): Entity[] {
    return this.inner.dependencyChain(id);
  }

  computeWave(id: string): number {
    return this.inner.computeWave(id);
  }

  detectCycles(): string[][] {
    return this.inner.detectCycles();
  }
}
