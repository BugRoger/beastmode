/**
 * Cucumber World for structured task store integration tests.
 *
 * Provides an in-memory TaskStore for each scenario. No filesystem,
 * no git — pure store operations via the TaskStore interface.
 */

import { World, setWorldConstructor } from "@cucumber/cucumber";
import { InMemoryTaskStore } from "../../../src/store/in-memory.js";
import type { TaskStore, Epic, Feature, Entity } from "../../../src/store/types.js";

export class StoreWorld extends World {
  store!: TaskStore;

  /** Track entities by human name for step reference */
  epicsByName = new Map<string, Epic>();
  featuresByName = new Map<string, Feature>();

  /** Last command output for JSON assertions */
  lastOutput: unknown = null;
  lastError: Error | null = null;

  setup(): void {
    this.store = new InMemoryTaskStore();
    this.epicsByName.clear();
    this.featuresByName.clear();
    this.lastOutput = null;
    this.lastError = null;
  }

  teardown(): void {
    // No cleanup needed for in-memory store
  }

  /** Helper: get epic by human name, throw if missing */
  getEpicByName(name: string): Epic {
    const epic = this.epicsByName.get(name);
    if (!epic) throw new Error(`No epic registered with name "${name}"`);
    return epic;
  }

  /** Helper: get feature by human name, throw if missing */
  getFeatureByName(name: string): Feature {
    const feature = this.featuresByName.get(name);
    if (!feature) throw new Error(`No feature registered with name "${name}"`);
    return feature;
  }

  /** Helper: create an epic and track it by name */
  createEpic(name: string): Epic {
    const epic = this.store.addEpic({ name, slug: name });
    this.epicsByName.set(name, epic);
    return epic;
  }

  /** Helper: create a feature under an epic and track it by name */
  createFeature(name: string, epicName: string): Feature {
    const epic = this.getEpicByName(epicName);
    const feature = this.store.addFeature({ parent: epic.id, name });
    this.featuresByName.set(name, feature);
    return feature;
  }

  /** Helper: update a feature's status */
  setFeatureStatus(name: string, status: string): void {
    const feature = this.getFeatureByName(name);
    const updated = this.store.updateFeature(feature.id, {
      status: status as Feature["status"],
    });
    this.featuresByName.set(name, updated);
  }

  /** Helper: update an epic's status */
  setEpicStatus(name: string, status: string): void {
    const epic = this.getEpicByName(name);
    const updated = this.store.updateEpic(epic.id, {
      status: status as Epic["status"],
    });
    this.epicsByName.set(name, updated);
  }

  /** Helper: add dependency from one entity to another */
  addDependency(fromName: string, toName: string): void {
    const from = this.featuresByName.get(fromName) ?? this.epicsByName.get(fromName);
    const to = this.featuresByName.get(toName) ?? this.epicsByName.get(toName);
    if (!from) throw new Error(`Entity not found: "${fromName}"`);
    if (!to) throw new Error(`Entity not found: "${toName}"`);

    const newDeps = [...from.depends_on, to.id];
    if (from.type === "epic") {
      const updated = this.store.updateEpic(from.id, { depends_on: newDeps });
      this.epicsByName.set(fromName, updated);
    } else {
      const updated = this.store.updateFeature(from.id, { depends_on: newDeps });
      this.featuresByName.set(fromName, updated);
    }
  }
}

setWorldConstructor(StoreWorld);
