/**
 * Step definitions for US-10 (blocked entities).
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { StoreWorld } from "../support/store-world.js";
import type { Entity, Epic } from "../../../src/store/types.js";

Given("epic {string} has status {string}", function (this: StoreWorld, epicName: string, status: string) {
  this.setEpicStatus(epicName, status);
});

When("an orchestrator queries for blocked entities", function (this: StoreWorld) {
  this.lastOutput = this.store.blocked();
});

Then("the blocked result should include feature {string}", function (this: StoreWorld, featureName: string) {
  const results = this.lastOutput as Entity[];
  const feature = this.getFeatureByName(featureName);
  const found = results.some((e) => e.id === feature.id);
  assert.ok(found, `Blocked results should include feature "${featureName}"`);
});

Then("the blocked result should include epic {string}", function (this: StoreWorld, epicName: string) {
  const results = this.lastOutput as Entity[];
  const epic = this.getEpicByName(epicName);
  const found = results.some((e) => e.id === epic.id);
  assert.ok(found, `Blocked results should include epic "${epicName}"`);
});

Then("the blocked result should be empty", function (this: StoreWorld) {
  const results = this.lastOutput as Entity[];
  assert.strictEqual(results.length, 0, `Expected empty blocked results, got ${results.length}`);
});
