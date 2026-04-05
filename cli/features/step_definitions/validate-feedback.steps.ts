/**
 * Step definitions for validate feedback loop integration test.
 *
 * Adds targeted validate failure steps and assertions.
 * Reuses pipeline steps from pipeline.steps.ts.
 */

import { When, Then, DataTable } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { resolve } from "node:path";
import { JsonFileStore } from "../../src/store/json-file-store.js";
import type { PipelineWorld } from "../support/world.js";

/** Load the task store for a project root. */
function loadStore(projectRoot: string): JsonFileStore {
  const storePath = resolve(projectRoot, ".beastmode", "state", "store.json");
  const s = new JsonFileStore(storePath);
  s.load();
  return s;
}

// -- When: validate with per-feature failures --

When(
  "the dispatch will write a validate artifact with failures:",
  function (this: PipelineWorld, table: DataTable) {
    const results = table.hashes().map((row) => ({
      feature: row.feature,
      result: row.result,
    }));
    this.pendingWriter = (cwd: string) => {
      this.writeValidateArtifactWithFailures(cwd, this.epicSlug, results);
    };
  },
);

// -- Then: reDispatchCount assertions --

Then(
  "feature {string} should have reDispatchCount {int}",
  function (this: PipelineWorld, featureSlug: string, expectedCount: number) {
    const s = loadStore(this.projectRoot);
    const epic = s.find(this.epicSlug);
    assert.ok(epic, `No epic found for slug: ${this.epicSlug}`);
    assert.ok(epic.type === "epic", `Entity is not an epic: ${epic.type}`);
    const features = s.listFeatures(epic.id);
    const feature = features.find((f) => f.slug === featureSlug);
    assert.ok(feature, `Feature "${featureSlug}" not found in store`);
    assert.strictEqual(
      feature.reDispatchCount ?? 0,
      expectedCount,
      `Feature "${featureSlug}" has reDispatchCount ${feature.reDispatchCount ?? 0}, expected ${expectedCount}`,
    );
  },
);
