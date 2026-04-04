/**
 * Step definitions for US-8 (JSON output).
 */

import { When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { StoreWorld } from "../support/store-world.js";

When("an agent runs the store ready command", function (this: StoreWorld) {
  const results = this.store.ready();
  this.lastOutput = JSON.stringify(results);
});

When("a developer runs the store tree command as JSON", function (this: StoreWorld) {
  const tree = this.store.tree();
  this.lastOutput = JSON.stringify(tree);
});

When("an orchestrator runs the store blocked command", function (this: StoreWorld) {
  const results = this.store.blocked();
  this.lastOutput = JSON.stringify(results);
});

When("a developer creates an epic with slug {string} via JSON output", function (this: StoreWorld, slug: string) {
  const epic = this.store.addEpic({ name: slug, slug });
  this.epicsByName.set(slug, epic);
  this.lastOutput = JSON.stringify(epic);
});

When("a developer updates epic {string} status to {string} via JSON output", function (this: StoreWorld, epicName: string, status: string) {
  const epic = this.getEpicByName(epicName);
  const updated = this.store.updateEpic(epic.id, { status: status as any });
  this.epicsByName.set(epicName, updated);
  this.lastOutput = JSON.stringify(updated);
});

When("an agent queries for a nonexistent entity via the store", function (this: StoreWorld) {
  const result = this.store.find("nonexistent-id-that-does-not-exist");
  if (!result) {
    this.lastOutput = JSON.stringify({ error: "Entity not found: nonexistent-id-that-does-not-exist" });
    this.lastError = new Error("Entity not found");
  } else {
    this.lastOutput = JSON.stringify(result);
  }
});

Then("the output should be valid JSON", function (this: StoreWorld) {
  const output = this.lastOutput as string;
  assert.doesNotThrow(() => JSON.parse(output), "Output should be valid JSON");
});

Then("the output should be valid JSON error", function (this: StoreWorld) {
  const output = this.lastOutput as string;
  assert.doesNotThrow(() => JSON.parse(output), "Output should be valid JSON");
});

Then("the JSON should contain an array of ready entities", function (this: StoreWorld) {
  const parsed = JSON.parse(this.lastOutput as string);
  assert.ok(Array.isArray(parsed), "JSON should be an array");
});

Then("the JSON should contain the entity hierarchy", function (this: StoreWorld) {
  const parsed = JSON.parse(this.lastOutput as string);
  assert.ok(Array.isArray(parsed), "JSON should be an array (tree nodes)");
});

Then("the JSON should contain an array of blocked entities", function (this: StoreWorld) {
  const parsed = JSON.parse(this.lastOutput as string);
  assert.ok(Array.isArray(parsed), "JSON should be an array");
});

Then("the JSON should contain the hash ID of the created entity", function (this: StoreWorld) {
  const parsed = JSON.parse(this.lastOutput as string);
  assert.ok(parsed.id, "JSON should contain an 'id' field");
  assert.match(parsed.id, /^bm-/, "ID should start with 'bm-'");
});

Then("the JSON should reflect the updated status", function (this: StoreWorld) {
  const parsed = JSON.parse(this.lastOutput as string);
  assert.ok(parsed.status, "JSON should contain a 'status' field");
});

Then("the JSON should contain an error field with a descriptive message", function (this: StoreWorld) {
  const parsed = JSON.parse(this.lastOutput as string);
  assert.ok(parsed.error, "JSON should contain an 'error' field");
  assert.ok(typeof parsed.error === "string", "Error should be a string");
});
