/**
 * Step definitions for US-3 (cross-epic deps) and US-6 (dependency ordering).
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { StoreWorld } from "../support/store-world.js";
import type { Entity, Epic } from "../../../src/store/types.js";

Given(
  "a feature {string} exists under {string} with status {string}",
  function (this: StoreWorld, featureName: string, epicName: string, status: string) {
    this.createFeature(featureName, epicName);
    this.setFeatureStatus(featureName, status);
  },
);

Given(
  "epic {string} depends on feature {string}",
  function (this: StoreWorld, epicName: string, featureName: string) {
    this.addDependency(epicName, featureName);
  },
);

Given(
  "an epic {string} exists with feature {string} status {string}",
  function (this: StoreWorld, epicName: string, featureName: string, status: string) {
    this.createEpic(epicName);
    this.createFeature(featureName, epicName);
    this.setFeatureStatus(featureName, status);
  },
);

Given(
  "feature {string} also depends on {string}",
  function (this: StoreWorld, featureName: string, depName: string) {
    this.addDependency(featureName, depName);
  },
);

When(
  "the orchestrator evaluates epic readiness",
  function (this: StoreWorld) {
    this.lastOutput = this.store.ready({ type: "epic" });
  },
);

When(
  "the orchestrator computes execution order",
  function (this: StoreWorld) {
    this.lastOutput = this.store.ready();
  },
);

When(
  "the store checks for circular dependencies",
  function (this: StoreWorld) {
    this.lastOutput = this.store.detectCycles();
  },
);

When(
  "feature {string} is completed",
  function (this: StoreWorld, featureName: string) {
    this.setFeatureStatus(featureName, "completed");
    this.lastOutput = this.store.ready();
  },
);

When(
  "{string} and {string} are completed",
  function (this: StoreWorld, name1: string, name2: string) {
    this.setFeatureStatus(name1, "completed");
    this.setFeatureStatus(name2, "completed");
    this.lastOutput = this.store.ready();
  },
);

When(
  "feature {string} is reset to {string}",
  function (this: StoreWorld, featureName: string, status: string) {
    this.setFeatureStatus(featureName, status);
    this.lastOutput = this.store.ready();
  },
);

Then(
  "epic {string} should not be ready",
  function (this: StoreWorld, epicName: string) {
    const results = this.lastOutput as Entity[];
    const epic = this.getEpicByName(epicName);
    const found = results.some((e) => e.id === epic.id);
    assert.ok(!found, `Epic "${epicName}" should not be ready`);
  },
);

Then(
  "epic {string} should be ready",
  function (this: StoreWorld, epicName: string) {
    const results = this.lastOutput as Entity[];
    const epic = this.getEpicByName(epicName);
    const found = results.some((e) => e.id === epic.id);
    assert.ok(found, `Epic "${epicName}" should be ready`);
  },
);

Then(
  "circular dependencies should be detected",
  function (this: StoreWorld) {
    const cycles = this.lastOutput as string[][];
    assert.ok(cycles.length > 0, "Expected circular dependencies to be detected");
  },
);

Then(
  "{string} should be available for dispatch",
  function (this: StoreWorld, featureName: string) {
    const results = this.lastOutput as Entity[];
    const feature = this.featuresByName.get(featureName);
    assert.ok(feature, `Feature "${featureName}" not found`);
    const found = results.some((e) => e.id === feature.id);
    assert.ok(found, `Feature "${featureName}" should be available for dispatch, ready: [${results.map((e) => (e as any).name).join(", ")}]`);
  },
);

Then(
  "{string} should not be available for dispatch",
  function (this: StoreWorld, featureName: string) {
    const results = this.lastOutput as Entity[];
    const feature = this.featuresByName.get(featureName);
    assert.ok(feature, `Feature "${featureName}" not found`);
    const found = results.some((e) => e.id === feature.id);
    assert.ok(!found, `Feature "${featureName}" should NOT be available for dispatch`);
  },
);

Then(
  "{string} and {string} should both be available for dispatch",
  function (this: StoreWorld, name1: string, name2: string) {
    const results = this.lastOutput as Entity[];
    const f1 = this.featuresByName.get(name1);
    const f2 = this.featuresByName.get(name2);
    assert.ok(f1, `Feature "${name1}" not found`);
    assert.ok(f2, `Feature "${name2}" not found`);
    assert.ok(results.some((e) => e.id === f1.id), `"${name1}" should be available`);
    assert.ok(results.some((e) => e.id === f2.id), `"${name2}" should be available`);
  },
);
