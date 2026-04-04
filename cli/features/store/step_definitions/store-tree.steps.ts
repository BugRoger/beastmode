import { When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { StoreWorld } from "../support/store-world.js";
import type { TreeNode } from "../../../src/store/types.js";

When("a developer runs the store tree command", function (this: StoreWorld) {
  this.lastOutput = this.store.tree();
});

When("a developer runs the store tree command on an empty store", function (this: StoreWorld) {
  this.lastOutput = this.store.tree();
});

Then("the tree should contain epic {string}", function (this: StoreWorld, epicName: string) {
  const tree = this.lastOutput as TreeNode[];
  const epic = this.getEpicByName(epicName);
  const found = tree.some((node) => node.entity.id === epic.id);
  assert.ok(found, `Tree should contain epic "${epicName}"`);
});

Then("the tree should contain feature {string} under {string}", function (this: StoreWorld, featureName: string, epicName: string) {
  const tree = this.lastOutput as TreeNode[];
  const epic = this.getEpicByName(epicName);
  const feature = this.getFeatureByName(featureName);
  const epicNode = tree.find((node) => node.entity.id === epic.id);
  assert.ok(epicNode, `Epic "${epicName}" not found in tree`);
  const found = epicNode.children.some((child) => child.entity.id === feature.id);
  assert.ok(found, `Feature "${featureName}" not found under "${epicName}" in tree`);
});

Then("the tree should show feature {string} depending on {string}", function (this: StoreWorld, featureName: string, depName: string) {
  const feature = this.getFeatureByName(featureName);
  const dep = this.getFeatureByName(depName);
  const refreshed = this.store.getFeature(feature.id)!;
  assert.ok(refreshed.depends_on.includes(dep.id), `Feature "${featureName}" should depend on "${depName}"`);
});

Then("the tree should be empty", function (this: StoreWorld) {
  const tree = this.lastOutput as TreeNode[];
  assert.strictEqual(tree.length, 0, "Tree should be empty");
});
