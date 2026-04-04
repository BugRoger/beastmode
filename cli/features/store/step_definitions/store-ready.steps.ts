import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { StoreWorld } from "../support/store-world.js";
import type { Entity } from "../../../src/store/types.js";

Given("a store is initialized", function (this: StoreWorld) {
  assert.ok(this.store, "Store should be initialized");
});

Given(
  "an epic {string} exists in the store",
  function (this: StoreWorld, epicName: string) {
    this.createEpic(epicName);
  },
);

Given(
  "a feature {string} exists under {string} with no dependencies",
  function (this: StoreWorld, featureName: string, epicName: string) {
    this.createFeature(featureName, epicName);
  },
);

Given(
  "a feature {string} exists under {string} depending on {string}",
  function (this: StoreWorld, featureName: string, epicName: string, depName: string) {
    this.createFeature(featureName, epicName);
    this.addDependency(featureName, depName);
  },
);

Given(
  "a feature {string} exists under {string} with no dependencies and status {string}",
  function (this: StoreWorld, featureName: string, epicName: string, status: string) {
    this.createFeature(featureName, epicName);
    this.setFeatureStatus(featureName, status);
  },
);

Given(
  "feature {string} has status {string}",
  function (this: StoreWorld, featureName: string, status: string) {
    this.setFeatureStatus(featureName, status);
  },
);

When("an agent queries for ready features", function (this: StoreWorld) {
  this.lastOutput = this.store.ready();
});

Then(
  "the result should include feature {string}",
  function (this: StoreWorld, featureName: string) {
    const results = this.lastOutput as Entity[];
    const feature = this.getFeatureByName(featureName);
    const found = results.some((e) => e.id === feature.id);
    assert.ok(found, `Expected result to include feature "${featureName}" (${feature.id}), got: ${results.map((e) => e.id).join(", ")}`);
  },
);

Then(
  "the result should not include feature {string}",
  function (this: StoreWorld, featureName: string) {
    const results = this.lastOutput as Entity[];
    const feature = this.getFeatureByName(featureName);
    const found = results.some((e) => e.id === feature.id);
    assert.ok(!found, `Expected result NOT to include feature "${featureName}" (${feature.id})`);
  },
);

Then("the result should be empty", function (this: StoreWorld) {
  const results = this.lastOutput as Entity[];
  assert.strictEqual(results.length, 0, `Expected empty result, got ${results.length} items`);
});
