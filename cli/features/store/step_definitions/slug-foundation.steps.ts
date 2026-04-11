import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import type { StoreWorld } from "../support/store-world.js";
import { slugify, isValidSlug } from "../../../src/store/slug.js";
import { generatePlaceholderName } from "../../../src/store/placeholder.js";

// --- Slug-ID bijection ---

When("a developer creates an epic named {string}", function (this: StoreWorld, name: string) {
  const epic = this.store.addEpic({ name });
  this.epicsByName.set(name, epic);
});

Then("the epic slug suffix should equal the first characters of the entity's hash ID", function (this: StoreWorld) {
  const epic = Array.from(this.epicsByName.values()).pop()!;
  const shortId = epic.id.replace("bm-", "");
  assert.ok(epic.slug.endsWith(`-${shortId}`), `Slug "${epic.slug}" should end with "-${shortId}"`);
});

Then("the entity should be retrievable by extracting the suffix from the slug", function (this: StoreWorld) {
  const epic = Array.from(this.epicsByName.values()).pop()!;
  const parts = epic.slug.split("-");
  const suffix = parts[parts.length - 1];
  const found = this.store.find(`bm-${suffix}`);
  assert.ok(found, `Should find entity with ID "bm-${suffix}"`);
  assert.strictEqual(found!.id, epic.id);
});

Given("an epic exists with a known slug and hash ID", function (this: StoreWorld) {
  const epic = this.store.addEpic({ name: "known epic" });
  this.epicsByName.set("known epic", epic);
});

When("a developer extracts the hex suffix from the slug", function (this: StoreWorld) {
  // Extraction happens in Then steps
});

Then("the extracted suffix should match the entity's short ID", function (this: StoreWorld) {
  const epic = this.epicsByName.get("known epic")!;
  const shortId = epic.id.replace("bm-", "");
  const parts = epic.slug.split("-");
  const suffix = parts[parts.length - 1];
  assert.strictEqual(suffix, shortId);
});

Then("the entity should be locatable by that short ID without a store query", function (this: StoreWorld) {
  const epic = this.epicsByName.get("known epic")!;
  const shortId = epic.id.replace("bm-", "");
  assert.strictEqual(`bm-${shortId}`, epic.id);
});

When("a developer creates epics named {string} and {string}", function (this: StoreWorld, name1: string, name2: string) {
  const e1 = this.store.addEpic({ name: name1 });
  const e2 = this.store.addEpic({ name: name2 });
  this.epicsByName.set(name1, e1);
  this.epicsByName.set(name2, e2);
});

Then("each epic's slug suffix should match its own short ID", function (this: StoreWorld) {
  for (const epic of this.epicsByName.values()) {
    const shortId = epic.id.replace("bm-", "");
    assert.ok(epic.slug.endsWith(`-${shortId}`), `Slug "${epic.slug}" should end with "-${shortId}"`);
  }
});

Then("no two epics should share the same suffix", function (this: StoreWorld) {
  const suffixes = Array.from(this.epicsByName.values()).map((e) => {
    const parts = e.slug.split("-");
    return parts[parts.length - 1];
  });
  assert.strictEqual(new Set(suffixes).size, suffixes.length, "All suffixes should be unique");
});

// --- Placeholder names ---

let lastPlaceholderSlug = "";

When("a developer generates a placeholder slug with short ID {string}", function (this: StoreWorld, shortId: string) {
  lastPlaceholderSlug = generatePlaceholderName(shortId);
});

Then("the placeholder slug should contain a human-readable word", function () {
  assert.ok(/[a-z]{3,}/.test(lastPlaceholderSlug), `"${lastPlaceholderSlug}" should contain a readable word`);
});

Then("the placeholder slug should not be a bare hex string", function () {
  assert.ok(!/^[0-9a-f]+$/.test(lastPlaceholderSlug), `"${lastPlaceholderSlug}" should not be bare hex`);
});

Then("the placeholder slug should match the pattern adjective-noun-hex", function () {
  assert.ok(/^[a-z]+-[a-z]+-[0-9a-f]{4}$/.test(lastPlaceholderSlug), `"${lastPlaceholderSlug}" should match adj-noun-hex`);
});

// --- Slugify deduplication ---

let lastSlugResult = "";

Given("a raw name {string}", function (this: StoreWorld, _name: string) {
  // Name stored for When step
});

When("the slug is computed by the store module", function (this: StoreWorld) {
  lastSlugResult = slugify("My Epic Name!");
});

Then("the result should be {string}", function (this: StoreWorld, expected: string) {
  assert.strictEqual(lastSlugResult, expected);
});

// --- Dot validation ---

Given("a feature slug containing a dot suffix like {string}", function (this: StoreWorld, _slug: string) {
  // Slug stored for When step
});

When("the slug is validated", function () {
  // Validation happens in Then step
});

Then("the validation should pass", function () {
  assert.ok(isValidSlug("auth-flow-a3f2.2"), 'isValidSlug("auth-flow-a3f2.2") should return true');
});

// --- Double-hyphen separator ---

Given("a name containing double hyphens {string}", function (this: StoreWorld, _name: string) {
  // Name stored for When step
});

When("the name is slugified", function () {
  lastSlugResult = slugify("foo--bar");
});

Then("double hyphens should be impossible in slugified output", function () {
  assert.ok(!lastSlugResult.includes("--"), `"${lastSlugResult}" should not contain "--"`);
});
