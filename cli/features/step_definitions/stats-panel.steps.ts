import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { StatsPanelWorld } from "../support/stats-panel-world.js";

Given("the stats accumulator is initialized", async function (this: StatsPanelWorld) {
  await this.loadAccumulator();
});

When("a session starts for epic {string} phase {string}", function (this: StatsPanelWorld, epic: string, phase: string) {
  this.emitSessionStarted(epic, phase, `${epic}-${phase}-${Date.now()}`);
});

When(
  "the session for epic {string} phase {string} completes successfully in {int}ms",
  function (this: StatsPanelWorld, epic: string, phase: string, durationMs: number) {
    this.emitSessionCompleted(epic, phase, true, durationMs);
  },
);

When(
  "a session completes for epic {string} phase {string} with success in {int}ms",
  function (this: StatsPanelWorld, epic: string, phase: string, durationMs: number) {
    this.emitSessionStarted(epic, phase, `${epic}-${phase}-${Date.now()}`);
    this.emitSessionCompleted(epic, phase, true, durationMs);
  },
);

When(
  "a session completes for epic {string} phase {string} with failure in {int}ms",
  function (this: StatsPanelWorld, epic: string, phase: string, durationMs: number) {
    this.emitSessionStarted(epic, phase, `${epic}-${phase}-${Date.now()}`);
    this.emitSessionCompleted(epic, phase, false, durationMs);
  },
);

When(
  "a session starts for epic {string} phase {string} as a re-dispatch",
  function (this: StatsPanelWorld, epic: string, phase: string) {
    this.emitSessionStarted(epic, phase, `${epic}-${phase}-redispatch-${Date.now()}`);
  },
);

When("I resolve details content for selection {string}", async function (this: StatsPanelWorld, kind: string) {
  await this.resolveContent({ kind });
});

Then("the stats show total sessions is {int}", function (this: StatsPanelWorld, expected: number) {
  const stats = this.getStats();
  assert.equal(stats.total, expected);
});

Then("the stats show active sessions is {int}", function (this: StatsPanelWorld, expected: number) {
  const stats = this.getStats();
  assert.equal(stats.active, expected);
});

Then("the stats show success rate is {int}", function (this: StatsPanelWorld, expected: number) {
  const stats = this.getStats();
  assert.equal(stats.successRate, expected);
});

Then("the stats show cumulative time is {int}", function (this: StatsPanelWorld, expected: number) {
  const stats = this.getStats();
  assert.equal(stats.cumulativeMs, expected);
});

Then("the stats show average duration for {string} is {int}", function (this: StatsPanelWorld, phase: string, expected: number) {
  const stats = this.getStats();
  assert.equal(stats.phaseDurations[phase], expected);
});

Then("the stats show no duration for {string}", function (this: StatsPanelWorld, phase: string) {
  const stats = this.getStats();
  assert.equal(stats.phaseDurations[phase], null);
});

Then("the stats show re-dispatches is {int}", function (this: StatsPanelWorld, expected: number) {
  const stats = this.getStats();
  assert.equal(stats.reDispatches, expected);
});

Then("the stats show failures is {int}", function (this: StatsPanelWorld, expected: number) {
  const stats = this.getStats();
  assert.equal(stats.failures, expected);
});

Then("the stats accumulator reports isEmpty is true", function (this: StatsPanelWorld) {
  const stats = this.getStats();
  assert.equal(stats.isEmpty, true);
});

Then("the stats accumulator reports isEmpty is false", function (this: StatsPanelWorld) {
  const stats = this.getStats();
  assert.equal(stats.isEmpty, false);
});

Then("the content result has kind {string}", function (this: StatsPanelWorld, kind: string) {
  assert.equal(this.contentResult.kind, kind);
});

Then("the DetailsPanel source contains a branch for {string} content kind", function (this: StatsPanelWorld, kind: string) {
  assert.ok(
    this.detailsPanelSource.includes(`result.kind === "${kind}"`) ||
    this.detailsPanelSource.includes(`result.kind === '${kind}'`),
    `DetailsPanel.tsx should contain a branch for kind "${kind}"`,
  );
});

Then(
  "the DetailsPanel source renders sections in order: Sessions, Phase Duration, Retries",
  function (this: StatsPanelWorld) {
    const src = this.detailsPanelSource;
    const sessionsIdx = src.indexOf("Sessions");
    const phaseIdx = src.indexOf("Phase Duration");
    const retriesIdx = src.indexOf("Retries");
    assert.ok(sessionsIdx > -1, "DetailsPanel should contain 'Sessions'");
    assert.ok(phaseIdx > -1, "DetailsPanel should contain 'Phase Duration'");
    assert.ok(retriesIdx > -1, "DetailsPanel should contain 'Retries'");
    assert.ok(sessionsIdx < phaseIdx, "Sessions should come before Phase Duration");
    assert.ok(phaseIdx < retriesIdx, "Phase Duration should come before Retries");
  },
);
