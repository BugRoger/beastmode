import { Given, When, Then } from "@cucumber/cucumber";
import type { SessionStatsWorld } from "../support/session-stats-world.js";

let sessionCounter = 0;

Given("the stats accumulator is initialized", function (this: SessionStatsWorld) {
  const { SessionStatsAccumulator } = require("../../src/dashboard/session-stats.js");
  this.accumulator = new SessionStatsAccumulator(this.emitter);
  sessionCounter = 0;
});

Given("the stats accumulator is initialized at a known start time", function (this: SessionStatsWorld) {
  this.startTime = 1000000;
  this.currentTime = this.startTime;
  const { SessionStatsAccumulator } = require("../../src/dashboard/session-stats.js");
  this.accumulator = new SessionStatsAccumulator(this.emitter, { nowFn: () => this.currentTime });
  sessionCounter = 0;
});

Given("no sessions have completed", function (this: SessionStatsWorld) {
  // No-op — accumulator starts empty
});

When("a session completes successfully", function (this: SessionStatsWorld) {
  sessionCounter++;
  this.emitter.emit("session-started", { epicSlug: `epic-${sessionCounter}`, phase: "plan", sessionId: `s-${sessionCounter}` });
  this.emitter.emit("session-completed", { epicSlug: `epic-${sessionCounter}`, phase: "plan", success: true, durationMs: 10000 });
});

When("a second session completes successfully", function (this: SessionStatsWorld) {
  sessionCounter++;
  this.emitter.emit("session-started", { epicSlug: `epic-${sessionCounter}`, phase: "plan", sessionId: `s-${sessionCounter}` });
  this.emitter.emit("session-completed", { epicSlug: `epic-${sessionCounter}`, phase: "plan", success: true, durationMs: 10000 });
});

When("a session starts", function (this: SessionStatsWorld) {
  sessionCounter++;
  this.emitter.emit("session-started", { epicSlug: `epic-${sessionCounter}`, phase: "plan", sessionId: `s-${sessionCounter}` });
});

When("a second session starts", function (this: SessionStatsWorld) {
  sessionCounter++;
  this.emitter.emit("session-started", { epicSlug: `epic-${sessionCounter}`, phase: "plan", sessionId: `s-${sessionCounter}` });
});

When("the first session completes", function (this: SessionStatsWorld) {
  this.emitter.emit("session-completed", { epicSlug: "epic-1", phase: "plan", success: true, durationMs: 10000 });
});

When("{int} sessions complete successfully", function (this: SessionStatsWorld, count: number) {
  for (let i = 0; i < count; i++) {
    sessionCounter++;
    this.emitter.emit("session-started", { epicSlug: `epic-${sessionCounter}`, phase: "plan", sessionId: `s-${sessionCounter}` });
    this.emitter.emit("session-completed", { epicSlug: `epic-${sessionCounter}`, phase: "plan", success: true, durationMs: 10000 });
  }
});

When("{int} session completes with failure", function (this: SessionStatsWorld, count: number) {
  for (let i = 0; i < count; i++) {
    sessionCounter++;
    this.emitter.emit("session-started", { epicSlug: `epic-${sessionCounter}`, phase: "plan", sessionId: `s-${sessionCounter}` });
    this.emitter.emit("session-completed", { epicSlug: `epic-${sessionCounter}`, phase: "plan", success: false, durationMs: 10000 });
  }
});

When("a session completes with a duration of {int} seconds", function (this: SessionStatsWorld, seconds: number) {
  sessionCounter++;
  this.emitter.emit("session-started", { epicSlug: `epic-${sessionCounter}`, phase: "plan", sessionId: `s-${sessionCounter}` });
  this.emitter.emit("session-completed", { epicSlug: `epic-${sessionCounter}`, phase: "plan", success: true, durationMs: seconds * 1000 });
});

When("a second session completes with a duration of {int} seconds", function (this: SessionStatsWorld, seconds: number) {
  sessionCounter++;
  this.emitter.emit("session-started", { epicSlug: `epic-${sessionCounter}`, phase: "plan", sessionId: `s-${sessionCounter}` });
  this.emitter.emit("session-completed", { epicSlug: `epic-${sessionCounter}`, phase: "plan", success: true, durationMs: seconds * 1000 });
});

When("time advances by {int} seconds", function (this: SessionStatsWorld, seconds: number) {
  this.currentTime = this.startTime + seconds * 1000;
});

When("a scan-complete event fires", function (this: SessionStatsWorld) {
  this.emitter.emit("scan-complete", { epicsScanned: 1, dispatched: 0 });
});

When("a session completes the {string} phase in {int} seconds", function (this: SessionStatsWorld, phase: string, seconds: number) {
  sessionCounter++;
  this.emitter.emit("session-started", { epicSlug: `epic-${sessionCounter}`, phase, sessionId: `s-${sessionCounter}` });
  this.emitter.emit("session-completed", { epicSlug: `epic-${sessionCounter}`, phase, success: true, durationMs: seconds * 1000 });
});

When("a second session completes the {string} phase in {int} seconds", function (this: SessionStatsWorld, phase: string, seconds: number) {
  sessionCounter++;
  this.emitter.emit("session-started", { epicSlug: `epic-${sessionCounter}`, phase, sessionId: `s-${sessionCounter}` });
  this.emitter.emit("session-completed", { epicSlug: `epic-${sessionCounter}`, phase, success: true, durationMs: seconds * 1000 });
});

When("a session is re-dispatched", function (this: SessionStatsWorld) {
  sessionCounter++;
  this.emitter.emit("session-started", { epicSlug: "epic-redispatch", phase: "plan", sessionId: `s-${sessionCounter}` });
  this.emitter.emit("session-completed", { epicSlug: "epic-redispatch", phase: "plan", success: true, durationMs: 5000 });
  sessionCounter++;
  this.emitter.emit("session-started", { epicSlug: "epic-redispatch", phase: "plan", sessionId: `s-${sessionCounter}` });
  this.emitter.emit("session-completed", { epicSlug: "epic-redispatch", phase: "plan", success: true, durationMs: 5000 });
});

When("a session is re-dispatched again", function (this: SessionStatsWorld) {
  sessionCounter++;
  this.emitter.emit("session-started", { epicSlug: "epic-redispatch", phase: "plan", sessionId: `s-${sessionCounter}` });
  this.emitter.emit("session-completed", { epicSlug: "epic-redispatch", phase: "plan", success: true, durationMs: 5000 });
});

When("a session completes with failure", function (this: SessionStatsWorld) {
  sessionCounter++;
  this.emitter.emit("session-started", { epicSlug: `epic-${sessionCounter}`, phase: "plan", sessionId: `s-${sessionCounter}` });
  this.emitter.emit("session-completed", { epicSlug: `epic-${sessionCounter}`, phase: "plan", success: false, durationMs: 10000 });
});

Then("the total session count is {int}", function (this: SessionStatsWorld, expected: number) {
  const stats = this.accumulator.getStats();
  if (stats.total !== expected) throw new Error(`Expected total ${expected}, got ${stats.total}`);
});

Then("the active session count is {int}", function (this: SessionStatsWorld, expected: number) {
  const stats = this.accumulator.getStats();
  if (stats.active !== expected) throw new Error(`Expected active ${expected}, got ${stats.active}`);
});

Then("the success rate is {int} percent", function (this: SessionStatsWorld, expected: number) {
  const stats = this.accumulator.getStats();
  if (stats.successRate !== expected) throw new Error(`Expected success rate ${expected}%, got ${stats.successRate}%`);
});

Then("the cumulative session time is {int} seconds", function (this: SessionStatsWorld, expected: number) {
  const stats = this.accumulator.getStats();
  const actual = stats.cumulativeMs / 1000;
  if (actual !== expected) throw new Error(`Expected cumulative ${expected}s, got ${actual}s`);
});

Then("the reported uptime is approximately {int} seconds", function (this: SessionStatsWorld, expected: number) {
  const stats = this.accumulator.getStats();
  const actualSeconds = stats.uptimeMs / 1000;
  const tolerance = 2;
  if (Math.abs(actualSeconds - expected) > tolerance) {
    throw new Error(`Expected uptime ~${expected}s, got ${actualSeconds}s`);
  }
});

Then("the accumulator reports an empty state", function (this: SessionStatsWorld) {
  const stats = this.accumulator.getStats();
  if (!stats.isEmpty) throw new Error("Expected isEmpty to be true");
});

Then("the accumulator no longer reports an empty state", function (this: SessionStatsWorld) {
  const stats = this.accumulator.getStats();
  if (stats.isEmpty) throw new Error("Expected isEmpty to be false");
});

Then("the average duration for the {string} phase is {int} seconds", function (this: SessionStatsWorld, phase: string, expected: number) {
  const stats = this.accumulator.getStats();
  const avg = stats.phaseDurations[phase];
  if (avg === null || avg === undefined) throw new Error(`No duration recorded for phase "${phase}"`);
  const actualSeconds = avg / 1000;
  if (actualSeconds !== expected) throw new Error(`Expected avg ${expected}s for "${phase}", got ${actualSeconds}s`);
});

Then("the other phases show no recorded duration", function (this: SessionStatsWorld) {
  const stats = this.accumulator.getStats();
  const allPhases = ["plan", "implement", "validate", "release"];
  const seenPhases = allPhases.filter((p) => stats.phaseDurations[p] !== null);
  if (seenPhases.length > 1) throw new Error(`Expected only 1 phase with data, got: ${seenPhases.join(", ")}`);
});

Then("the {string} phase has no recorded duration", function (this: SessionStatsWorld, phase: string) {
  const stats = this.accumulator.getStats();
  if (stats.phaseDurations[phase] !== null) {
    throw new Error(`Expected null duration for "${phase}", got ${stats.phaseDurations[phase]}`);
  }
});

Then("the total re-dispatch count is {int}", function (this: SessionStatsWorld, expected: number) {
  const stats = this.accumulator.getStats();
  if (stats.reDispatches !== expected) throw new Error(`Expected re-dispatches ${expected}, got ${stats.reDispatches}`);
});

Then("the total failure count is {int}", function (this: SessionStatsWorld, expected: number) {
  const stats = this.accumulator.getStats();
  if (stats.failures !== expected) throw new Error(`Expected failures ${expected}, got ${stats.failures}`);
});
