/**
 * Step definitions for US-2 (hash IDs), US-5 (dual reference), and US-7 (typed artifacts).
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { StoreWorld } from "../support/store-world.js";
import type { Epic, Feature, Entity } from "../../../src/store/types.js";

// -- US-2: Hash IDs --

When(
  "a developer creates an epic with slug {string}",
  function (this: StoreWorld, slug: string) {
    const epic = this.store.addEpic({ name: slug, slug });
    this.epicsByName.set(slug, epic);
    this.lastOutput = epic;
  },
);

Then(
  "the epic should have a hash-based ID matching {string} followed by a hex string",
  function (this: StoreWorld, _prefix: string) {
    const epic = this.lastOutput as Epic;
    assert.match(epic.id, /^bm-[0-9a-f]{4}$/, `Epic ID "${epic.id}" does not match bm-XXXX pattern`);
  },
);

Then(
  "the epic should be retrievable by its hash ID",
  function (this: StoreWorld) {
    const epic = this.lastOutput as Epic;
    const found = this.store.getEpic(epic.id);
    assert.ok(found, `Epic not found by ID: ${epic.id}`);
    assert.strictEqual(found.id, epic.id);
  },
);

When(
  "a developer creates a feature {string} under {string}",
  function (this: StoreWorld, featureName: string, epicName: string) {
    this.createFeature(featureName, epicName);
  },
);

Then(
  "the feature should have an ID distinct from the epic ID",
  function (this: StoreWorld) {
    const features = Array.from(this.featuresByName.values());
    const feature = features[features.length - 1];
    const epic = Array.from(this.epicsByName.values())[0];
    assert.notStrictEqual(feature.id, epic.id, "Feature ID should differ from epic ID");
  },
);

Then(
  "the feature ID should encode the parent hierarchy",
  function (this: StoreWorld) {
    const features = Array.from(this.featuresByName.values());
    const feature = features[features.length - 1];
    // Feature IDs are parentId.N format
    assert.ok(feature.id.includes("."), `Feature ID "${feature.id}" should contain dot separator`);
    const parentId = feature.id.split(".")[0];
    const epic = Array.from(this.epicsByName.values())[0];
    assert.strictEqual(parentId, epic.id, "Feature ID should encode parent epic ID");
  },
);

Then(
  "feature {string} and feature {string} should have different IDs",
  function (this: StoreWorld, name1: string, name2: string) {
    const f1 = this.getFeatureByName(name1);
    const f2 = this.getFeatureByName(name2);
    assert.notStrictEqual(f1.id, f2.id, `Features "${name1}" and "${name2}" have the same ID: ${f1.id}`);
  },
);

When(
  "a developer updates feature {string} with status {string}",
  function (this: StoreWorld, featureName: string, status: string) {
    const feature = this.getFeatureByName(featureName);
    this.lastOutput = { originalId: feature.id };
    this.setFeatureStatus(featureName, status);
  },
);

Then(
  "the feature hash ID should remain unchanged",
  function (this: StoreWorld) {
    const { originalId } = this.lastOutput as { originalId: string };
    const feature = this.store.getFeature(originalId);
    assert.ok(feature, "Feature should still exist");
    assert.strictEqual(feature.id, originalId, "Feature ID should not change on update");
  },
);

When(
  "a developer creates an epic with slug {string} via the store CLI",
  function (this: StoreWorld, slug: string) {
    const epic = this.store.addEpic({ name: slug, slug });
    this.epicsByName.set(slug, epic);
    this.lastOutput = JSON.stringify(epic);
  },
);

Then(
  "the command output should contain the hash ID of the created epic",
  function (this: StoreWorld) {
    const output = this.lastOutput as string;
    const epics = Array.from(this.epicsByName.values());
    const epic = epics[epics.length - 1];
    assert.ok(output.includes(epic.id), `Output should contain hash ID "${epic.id}"`);
  },
);

// -- US-5: Dual Reference --

Given(
  "an epic exists with slug {string} and hash ID tracked",
  function (this: StoreWorld, slug: string) {
    const epic = this.store.addEpic({ name: slug, slug });
    this.epicsByName.set(slug, epic);
    (this as any).trackedHashId = epic.id;
  },
);

When(
  "a developer queries the epic using its hash ID",
  function (this: StoreWorld) {
    const hashId = (this as any).trackedHashId as string;
    this.lastOutput = this.store.find(hashId);
  },
);

Then(
  "the store should return the epic with slug {string}",
  function (this: StoreWorld, slug: string) {
    const entity = this.lastOutput as Entity;
    assert.ok(entity, "Expected entity to be found");
    assert.strictEqual(entity.type, "epic");
    assert.strictEqual((entity as Epic).slug, slug);
  },
);

When(
  "a developer queries the epic using slug {string}",
  function (this: StoreWorld, slug: string) {
    this.lastOutput = this.store.find(slug);
  },
);

Then(
  "the store should return the epic with the tracked hash ID",
  function (this: StoreWorld) {
    const hashId = (this as any).trackedHashId as string;
    const entity = this.lastOutput as Entity;
    assert.ok(entity, "Expected entity to be found");
    assert.strictEqual(entity.id, hashId);
  },
);

When(
  "a developer runs a find command targeting the tracked hash ID",
  function (this: StoreWorld) {
    const hashId = (this as any).trackedHashId as string;
    this.lastOutput = this.store.find(hashId);
  },
);

Then(
  "the command should resolve to epic {string}",
  function (this: StoreWorld, slug: string) {
    const entity = this.lastOutput as Entity;
    assert.ok(entity, "Expected entity to be found");
    assert.strictEqual((entity as Epic).slug, slug);
  },
);

When(
  "a developer runs a find command targeting {string}",
  function (this: StoreWorld, identifier: string) {
    this.lastOutput = this.store.find(identifier);
  },
);

Then(
  "the command should resolve to the epic with the tracked hash ID",
  function (this: StoreWorld) {
    const hashId = (this as any).trackedHashId as string;
    const entity = this.lastOutput as Entity;
    assert.ok(entity, "Expected entity to be found");
    assert.strictEqual(entity.id, hashId);
  },
);

Given(
  "an epic exists with slug that matches another epic's hash ID",
  function (this: StoreWorld) {
    const existingEpic = Array.from(this.epicsByName.values())[0];
    const confusingSlug = existingEpic.id;
    const confusingEpic = this.store.addEpic({ name: "Confusing Epic", slug: confusingSlug });
    this.epicsByName.set("confusing-epic", confusingEpic);
  },
);

When(
  "a developer queries using the ambiguous reference",
  function (this: StoreWorld) {
    const hashId = (this as any).trackedHashId as string;
    this.lastOutput = this.store.find(hashId);
  },
);

Then(
  "both epics should be discoverable through unambiguous identifiers",
  function (this: StoreWorld) {
    const hashId = (this as any).trackedHashId as string;
    const confusingEpic = this.epicsByName.get("confusing-epic")!;
    const byId = this.store.getEpic(hashId);
    assert.ok(byId, `Original epic should be findable by hash ID "${hashId}"`);
    const byConfusingId = this.store.getEpic(confusingEpic.id);
    assert.ok(byConfusingId, `Confusing epic should be findable by its own hash ID "${confusingEpic.id}"`);
  },
);

// -- US-7: Typed Artifacts --

When(
  "the {word} artifact for epic {string} is set to a reference",
  function (this: StoreWorld, phase: string, epicName: string) {
    const epic = this.getEpicByName(epicName);
    const path = `artifacts/${phase}/2026-04-04-${epicName}.md`;
    const patch: Record<string, string> = {};
    patch[phase] = path;
    const updated = this.store.updateEpic(epic.id, patch);
    this.epicsByName.set(epicName, updated);
  },
);

Then(
  "the epic should have a {word} artifact reference",
  function (this: StoreWorld, phase: string) {
    const epic = Array.from(this.epicsByName.values()).pop()!;
    const refreshed = this.store.getEpic(epic.id)!;
    assert.ok((refreshed as any)[phase], `Epic should have a ${phase} artifact reference`);
  },
);

Then(
  "the epic should not have plan, implement, validate, or release artifact references",
  function (this: StoreWorld) {
    const epic = Array.from(this.epicsByName.values()).pop()!;
    const refreshed = this.store.getEpic(epic.id)!;
    for (const phase of ["plan", "implement", "validate", "release"]) {
      assert.ok(!(refreshed as any)[phase], `Epic should not have ${phase} artifact reference`);
    }
  },
);

Then(
  "the epic should have both design and plan artifact references",
  function (this: StoreWorld) {
    const epic = Array.from(this.epicsByName.values()).pop()!;
    const refreshed = this.store.getEpic(epic.id)!;
    assert.ok(refreshed.design, "Epic should have design artifact");
    assert.ok(refreshed.plan, "Epic should have plan artifact");
  },
);

Given(
  "a feature {string} exists under {string}",
  function (this: StoreWorld, featureName: string, epicName: string) {
    this.createFeature(featureName, epicName);
  },
);

When(
  "the {word} artifact for feature {string} is set to a reference",
  function (this: StoreWorld, phase: string, featureName: string) {
    const feature = this.getFeatureByName(featureName);
    const path = `artifacts/${phase}/2026-04-04-${featureName}.md`;
    const patch: Record<string, string> = {};
    patch[phase] = path;
    const updated = this.store.updateFeature(feature.id, patch);
    this.featuresByName.set(featureName, updated);
  },
);

Then(
  "the feature should have an {word} artifact reference",
  function (this: StoreWorld, phase: string) {
    const feature = Array.from(this.featuresByName.values()).pop()!;
    const refreshed = this.store.getFeature(feature.id)!;
    assert.ok((refreshed as any)[phase], `Feature should have a ${phase} artifact reference`);
  },
);

Then(
  "the feature should not have a {word} artifact reference",
  function (this: StoreWorld, phase: string) {
    const feature = Array.from(this.featuresByName.values()).pop()!;
    const refreshed = this.store.getFeature(feature.id)!;
    assert.ok(!(refreshed as any)[phase], `Feature should not have ${phase} artifact reference`);
  },
);

Given(
  "epic {string} has a design artifact reference",
  function (this: StoreWorld, epicName: string) {
    const epic = this.getEpicByName(epicName);
    const updated = this.store.updateEpic(epic.id, {
      design: `artifacts/design/2026-04-04-${epicName}.md`,
    });
    this.epicsByName.set(epicName, updated);
  },
);
