import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { StoreWorld } from "../support/store-world.js";
import type { Epic, Feature } from "../../../src/store/types.js";

Given(
  "an epic {string} exists with features {string} and {string}",
  function (this: StoreWorld, epicName: string, feat1: string, feat2: string) {
    this.createEpic(epicName);
    this.createFeature(feat1, epicName);
    this.createFeature(feat2, epicName);
  },
);

When(
  "a caller invokes getEpic with the epic's entity ID",
  function (this: StoreWorld) {
    const epic = this.getEpicByName("auth-system");
    this.lastOutput = this.store.getEpic(epic.id);
  },
);

Then("the store should return the epic", function (this: StoreWorld) {
  const result = this.lastOutput as Epic | undefined;
  assert.ok(result, "Expected epic to be returned");
  assert.strictEqual(result.type, "epic");
});

Then(
  "the epic should contain its slug and name",
  function (this: StoreWorld) {
    const epic = this.lastOutput as Epic;
    assert.ok(epic.slug, "Epic should have a slug");
    assert.strictEqual(epic.name, "auth-system");
  },
);

When(
  "a caller invokes getFeature with the feature's entity ID",
  function (this: StoreWorld) {
    const feature = this.getFeatureByName("login-flow");
    this.lastOutput = this.store.getFeature(feature.id);
  },
);

Then("the store should return the feature", function (this: StoreWorld) {
  const result = this.lastOutput as Feature | undefined;
  assert.ok(result, "Expected feature to be returned");
  assert.strictEqual(result.type, "feature");
});

Then(
  "the feature should contain its slug and parent epic reference",
  function (this: StoreWorld) {
    const feature = this.lastOutput as Feature;
    assert.ok(feature.slug, "Feature should have a slug");
    const epic = this.getEpicByName("auth-system");
    assert.strictEqual(feature.parent, epic.id);
  },
);

When(
  "a caller attempts to invoke a generic find method on the store",
  function (this: StoreWorld) {
    this.lastOutput = typeof (this.store as any).find;
  },
);

Then("the method should not exist", function (this: StoreWorld) {
  assert.strictEqual(this.lastOutput, "undefined", "store.find should not exist");
});

Then(
  "the caller should be directed to use getEpic or getFeature",
  function (this: StoreWorld) {
    assert.strictEqual(typeof this.store.getEpic, "function");
    assert.strictEqual(typeof this.store.getFeature, "function");
  },
);
