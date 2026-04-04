/**
 * Step definitions for US-9 (pluggable backend).
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { InMemoryTaskStore } from "../../../src/store/in-memory.js";
import type { StoreWorld } from "../support/store-world.js";
import type { TaskStore, Epic } from "../../../src/store/types.js";

Given("the store backend interface is defined", function (this: StoreWorld) {
  const store: TaskStore = new InMemoryTaskStore();
  assert.ok(store, "In-memory store should satisfy TaskStore interface");
});

Given("the store is configured with the in-memory backend", function (this: StoreWorld) {
  this.store = new InMemoryTaskStore();
});

When("a developer creates an epic via the store", function (this: StoreWorld) {
  const epic = this.store.addEpic({ name: "test-epic", slug: "test-epic" });
  this.epicsByName.set("test-epic", epic);
});

When("the developer queries for the created epic", function (this: StoreWorld) {
  const epic = this.getEpicByName("test-epic");
  this.lastOutput = this.store.getEpic(epic.id);
});

Then("the epic should be persisted and retrievable", function (this: StoreWorld) {
  const result = this.lastOutput as Epic;
  assert.ok(result, "Epic should be retrievable");
  assert.strictEqual(result.name, "test-epic");
});

When("a developer creates an epic, adds a feature, and queries ready features", function (this: StoreWorld) {
  const epic = this.store.addEpic({ name: "contract-epic", slug: "contract-epic" });
  this.epicsByName.set("contract-epic", epic);
  const feature = this.store.addFeature({ parent: epic.id, name: "contract-feature" });
  this.featuresByName.set("contract-feature", feature);
  this.lastOutput = this.store.ready();
});

Then("the results should be consistent with the store interface contract", function (this: StoreWorld) {
  const results = this.lastOutput as any[];
  assert.ok(Array.isArray(results), "ready() should return an array");
  const feature = this.getFeatureByName("contract-feature");
  const found = results.some((e) => e.id === feature.id);
  assert.ok(found, "Ready feature should be in results");
});

When("the same store operations are executed", function (this: StoreWorld) {
  const epic = this.store.addEpic({ name: "swap-test", slug: "swap-test" });
  this.epicsByName.set("swap-test", epic);
  const feature = this.store.addFeature({ parent: epic.id, name: "swap-feature" });
  this.featuresByName.set("swap-feature", feature);
  const ready = this.store.ready();
  const blocked = this.store.blocked();
  const tree = this.store.tree();
  this.lastOutput = { ready, blocked, tree };
});

Then("the operation signatures and output format should be identical", function (this: StoreWorld) {
  const { ready, blocked, tree } = this.lastOutput as any;
  assert.ok(Array.isArray(ready), "ready() returns array");
  assert.ok(Array.isArray(blocked), "blocked() returns array");
  assert.ok(Array.isArray(tree), "tree() returns array");
});
