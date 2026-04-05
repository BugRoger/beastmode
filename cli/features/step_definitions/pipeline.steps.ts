/**
 * Step definitions for the pipeline happy-path integration test.
 *
 * Mock boundary: only `dispatch` is mocked. Everything else runs for real --
 * git worktrees, filesystem artifacts, stop hook, task store, XState.
 */

import { Given, When, Then, DataTable } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { JsonFileStore } from "../../src/store/json-file-store.js";
import type { PipelineWorld } from "../support/world.js";
import type { Phase } from "../../src/types.js";

/** Load the task store for a project root. */
function loadStore(projectRoot: string): JsonFileStore {
  const storePath = resolve(projectRoot, ".beastmode", "state", "store.json");
  const s = new JsonFileStore(storePath);
  s.load();
  return s;
}

// -- Given --

Given("the initial epic slug is {string}", function (this: PipelineWorld, slug: string) {
  this.epicSlug = slug;
});

Given("a manifest is seeded for slug {string}", async function (this: PipelineWorld, slug: string) {
  // Mirror what the CLI design command does before calling run()
  const worktreePath = resolve(this.projectRoot, ".claude", "worktrees", slug);
  const s = loadStore(this.projectRoot);
  const epic = s.addEpic({ name: slug, slug });
  s.updateEpic(epic.id, { worktree: { branch: `feature/${slug}`, path: worktreePath } });
  s.save();
});

// -- When: dispatch writers --

When("the dispatch will write a design artifact:", function (this: PipelineWorld, table: DataTable) {
  const rows = table.rowsHash() as Record<string, string>;
  this.pendingWriter = (cwd: string) => {
    this.writeDesignArtifact(cwd, rows);
  };
});

When("the dispatch will write plan artifacts:", function (this: PipelineWorld, table: DataTable) {
  const features = table.hashes().map((row) => ({
    feature: row.feature,
    wave: parseInt(row.wave, 10),
    description: row.description,
  }));
  this.pendingWriter = (cwd: string) => {
    this.writePlanArtifacts(cwd, this.epicSlug, features);
  };
});

When(
  "the dispatch will write an implement artifact for feature {string}",
  function (this: PipelineWorld, featureSlug: string) {
    this.pendingWriter = (cwd: string) => {
      this.writeImplementArtifact(cwd, this.epicSlug, featureSlug);
    };
  },
);

When(
  "the dispatch will write a validate artifact with status {string}",
  function (this: PipelineWorld, status: string) {
    this.pendingWriter = (cwd: string) => {
      this.writeValidateArtifact(cwd, this.epicSlug, status);
    };
  },
);

When(
  "the dispatch will write a release artifact with bump {string}",
  function (this: PipelineWorld, bump: string) {
    this.pendingWriter = (cwd: string) => {
      this.writeReleaseArtifact(cwd, this.epicSlug, bump);
    };
  },
);

// -- When: pipeline execution --

When("the pipeline runs the {string} phase", async function (this: PipelineWorld, phase: string) {
  await this.runPipeline(phase as Phase);
});

When(
  "the pipeline runs the {string} phase for feature {string}",
  async function (this: PipelineWorld, phase: string, featureSlug: string) {
    await this.runPipeline(phase as Phase, { featureSlug });
  },
);

// -- Then: pipeline result --

Then("the pipeline result should be successful", function (this: PipelineWorld) {
  assert.ok(this.lastResult, "No pipeline result available");
  assert.strictEqual(this.lastResult.success, true, "Pipeline run was not successful");
});

// -- Then: store assertions (legacy "manifest" naming kept in feature files) --

Then("the manifest phase should be {string}", function (this: PipelineWorld, expectedPhase: string) {
  const s = loadStore(this.projectRoot);
  const epic = s.find(this.epicSlug);
  assert.ok(epic, `No epic found for slug: ${this.epicSlug}`);
  assert.ok(epic.type === "epic", `Entity is not an epic: ${epic.type}`);
  assert.strictEqual(epic.status, expectedPhase, `Expected phase "${expectedPhase}", got "${epic.status}"`);
});

Then("the manifest slug should be {string}", function (this: PipelineWorld, expectedSlug: string) {
  assert.strictEqual(this.epicSlug, expectedSlug, `Expected slug "${expectedSlug}", got "${this.epicSlug}"`);
  const s = loadStore(this.projectRoot);
  const epic = s.find(expectedSlug);
  assert.ok(epic, `No epic found for slug: ${expectedSlug}`);
});

Then(
  "the manifest summary problem should be {string}",
  function (this: PipelineWorld, expectedProblem: string) {
    const s = loadStore(this.projectRoot);
    const epic = s.find(this.epicSlug);
    assert.ok(epic, `No epic found for slug: ${this.epicSlug}`);
    assert.ok(epic.type === "epic", `Entity is not an epic: ${epic.type}`);
    assert.ok(epic.summary, "Epic has no summary");
    // Summary may be a string like "problem — solution" or an object
    if (typeof epic.summary === "string") {
      assert.ok(epic.summary.includes(expectedProblem), `Summary "${epic.summary}" does not contain "${expectedProblem}"`);
    } else {
      assert.strictEqual(epic.summary.problem, expectedProblem);
    }
  },
);

Then("the manifest should have {int} features", function (this: PipelineWorld, count: number) {
  const s = loadStore(this.projectRoot);
  const epic = s.find(this.epicSlug);
  assert.ok(epic, `No epic found for slug: ${this.epicSlug}`);
  assert.ok(epic.type === "epic", `Entity is not an epic: ${epic.type}`);
  const features = s.listFeatures(epic.id);
  assert.strictEqual(features.length, count, `Expected ${count} features, got ${features.length}`);
});

Then("all features should have status {string}", function (this: PipelineWorld, status: string) {
  const s = loadStore(this.projectRoot);
  const epic = s.find(this.epicSlug);
  assert.ok(epic, `No epic found for slug: ${this.epicSlug}`);
  assert.ok(epic.type === "epic", `Entity is not an epic: ${epic.type}`);
  const features = s.listFeatures(epic.id);
  for (const f of features) {
    assert.strictEqual(f.status, status, `Feature "${f.slug}" has status "${f.status}", expected "${status}"`);
  }
});

Then(
  "feature {string} should have status {string}",
  function (this: PipelineWorld, featureSlug: string, status: string) {
    const s = loadStore(this.projectRoot);
    const epic = s.find(this.epicSlug);
    assert.ok(epic, `No epic found for slug: ${this.epicSlug}`);
    assert.ok(epic.type === "epic", `Entity is not an epic: ${epic.type}`);
    const features = s.listFeatures(epic.id);
    const feature = features.find((f) => f.slug === featureSlug);
    assert.ok(feature, `Feature "${featureSlug}" not found in store`);
    assert.strictEqual(feature.status, status, `Feature "${featureSlug}" has status "${feature.status}", expected "${status}"`);
  },
);

Then("the worktree should be cleaned up", function (this: PipelineWorld) {
  const worktreeDir = resolve(this.projectRoot, ".claude", "worktrees", this.epicSlug);
  assert.strictEqual(existsSync(worktreeDir), false, `Worktree directory still exists: ${worktreeDir}`);
});
