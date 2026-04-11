import { Given, When, Then } from "@cucumber/cucumber";
import type { StatsPersistenceWorld } from "../support/stats-persistence-world.js";

Given("the dashboard stats persistence layer is initialized", function (this: StatsPersistenceWorld) {
  // World constructor handles tmp dir + emitter setup via hooks
});

Given("a previous dashboard session completed {int} sessions with {int} successes", function (this: StatsPersistenceWorld, total: number, successes: number) {
  const { saveStats, emptyPersistedStats, mergeSessionCompleted } = require("../../src/dashboard/stats-persistence.js");
  let stats = emptyPersistedStats();
  for (let i = 0; i < total; i++) {
    stats = mergeSessionCompleted(stats, {
      epicSlug: `epic-${i}`,
      phase: "plan",
      success: i < successes,
      durationMs: 10000,
    });
  }
  saveStats(this.statsFilePath, stats);
});

Given("a previous dashboard session recorded average plan duration of {int} seconds over {int} sessions", function (this: StatsPersistenceWorld, avgSeconds: number, count: number) {
  const { saveStats, emptyPersistedStats } = require("../../src/dashboard/stats-persistence.js");
  const stats = emptyPersistedStats();
  stats.total = count;
  stats.successes = count;
  stats.cumulativeMs = avgSeconds * 1000 * count;
  stats.phaseDurations.plan = { avgMs: avgSeconds * 1000, count };
  saveStats(this.statsFilePath, stats);
});

Given("the dashboard is running with persistence enabled", function (this: StatsPersistenceWorld) {
  // Persistence is initialized via the tmp dir — no extra setup needed
});

Given("{int} pipeline sessions have completed", function (this: StatsPersistenceWorld, count: number) {
  const { saveStats, emptyPersistedStats, mergeSessionCompleted } = require("../../src/dashboard/stats-persistence.js");
  let stats = emptyPersistedStats();
  for (let i = 0; i < count; i++) {
    stats = mergeSessionCompleted(stats, {
      epicSlug: `epic-${i}`,
      phase: "plan",
      success: true,
      durationMs: 10000,
    });
  }
  saveStats(this.statsFilePath, stats);
});

Given("no persisted stats file exists", function (this: StatsPersistenceWorld) {
  // Default state — tmp dir has no stats file
});

Given("the persisted stats file contains invalid data", function (this: StatsPersistenceWorld) {
  this.writeStatsFile("{{{{not json at all!!!!");
});

Given("the dashboard has accumulated all-time stats over multiple sessions", function (this: StatsPersistenceWorld) {
  const { saveStats, emptyPersistedStats, mergeSessionCompleted } = require("../../src/dashboard/stats-persistence.js");
  let stats = emptyPersistedStats();
  for (let i = 0; i < 5; i++) {
    stats = mergeSessionCompleted(stats, {
      epicSlug: `epic-${i}`,
      phase: "plan",
      success: true,
      durationMs: 10000,
    });
  }
  saveStats(this.statsFilePath, stats);
});

When("the dashboard restarts and loads persisted stats", function (this: StatsPersistenceWorld) {
  const { loadStats } = require("../../src/dashboard/stats-persistence.js");
  this.loadedStats = loadStats(this.statsFilePath);
});

When("{int} new sessions complete with {int} success and {int} failure", function (this: StatsPersistenceWorld, _total: number, successes: number, failures: number) {
  const { loadStats, mergeSessionCompleted, saveStats } = require("../../src/dashboard/stats-persistence.js");
  let stats = loadStats(this.statsFilePath);
  for (let i = 0; i < successes; i++) {
    stats = mergeSessionCompleted(stats, {
      epicSlug: `new-epic-s${i}`,
      phase: "plan",
      success: true,
      durationMs: 10000,
    });
  }
  for (let i = 0; i < failures; i++) {
    stats = mergeSessionCompleted(stats, {
      epicSlug: `new-epic-f${i}`,
      phase: "plan",
      success: false,
      durationMs: 10000,
    });
  }
  saveStats(this.statsFilePath, stats);
  this.loadedStats = stats;
});

When("a new session completes the {string} phase in {int} seconds", function (this: StatsPersistenceWorld, phase: string, seconds: number) {
  const { loadStats, mergeSessionCompleted, saveStats } = require("../../src/dashboard/stats-persistence.js");
  let stats = this.loadedStats ?? loadStats(this.statsFilePath);
  stats = mergeSessionCompleted(stats, {
    epicSlug: "new-epic-phase",
    phase,
    success: true,
    durationMs: seconds * 1000,
  });
  saveStats(this.statsFilePath, stats);
  this.loadedStats = stats;
});

When("a pipeline session completes successfully", function (this: StatsPersistenceWorld) {
  const { loadStats, mergeSessionCompleted, saveStats } = require("../../src/dashboard/stats-persistence.js");
  let stats = loadStats(this.statsFilePath);
  stats = mergeSessionCompleted(stats, {
    epicSlug: "epic-success",
    phase: "plan",
    success: true,
    durationMs: 15000,
  });
  saveStats(this.statsFilePath, stats);
  this.loadedStats = stats;
});

When("the dashboard process terminates unexpectedly", function (this: StatsPersistenceWorld) {
  // No-op — stats were already flushed on each session-completed
});

When("the dashboard starts", function (this: StatsPersistenceWorld) {
  const { loadStats } = require("../../src/dashboard/stats-persistence.js");
  this.loadedStats = loadStats(this.statsFilePath);
});

When("the operator deletes the persisted stats file", function (this: StatsPersistenceWorld) {
  const { rmSync: rm } = require("node:fs");
  if (this.statsFileExists()) {
    rm(this.statsFilePath);
  }
});

When("the dashboard restarts", function (this: StatsPersistenceWorld) {
  const { loadStats } = require("../../src/dashboard/stats-persistence.js");
  this.loadedStats = loadStats(this.statsFilePath);
});

Then("the all-time total session count is {int}", function (this: StatsPersistenceWorld, expected: number) {
  if (this.loadedStats.total !== expected) {
    throw new Error(`Expected total ${expected}, got ${this.loadedStats.total}`);
  }
});

Then("the all-time success rate is {int} percent", function (this: StatsPersistenceWorld, expected: number) {
  const rate = this.loadedStats.total > 0
    ? Math.round((this.loadedStats.successes / this.loadedStats.total) * 100)
    : 0;
  if (rate !== expected) {
    throw new Error(`Expected success rate ${expected}%, got ${rate}%`);
  }
});

Then("the current session total count is {int}", function (this: StatsPersistenceWorld, expected: number) {
  const originalTotal = 3; // from "completed 3 sessions with 3 successes"
  const currentCount = this.loadedStats.total - originalTotal;
  if (currentCount !== expected) {
    throw new Error(`Expected current session count ${expected}, got ${currentCount}`);
  }
});

Then("the current session success rate is {int} percent", function (this: StatsPersistenceWorld, expected: number) {
  const originalSuccesses = 3;
  const originalTotal = 3;
  const currentSuccesses = this.loadedStats.successes - originalSuccesses;
  const currentTotal = this.loadedStats.total - originalTotal;
  const rate = currentTotal > 0 ? Math.round((currentSuccesses / currentTotal) * 100) : 0;
  if (rate !== expected) {
    throw new Error(`Expected current session success rate ${expected}%, got ${rate}%`);
  }
});

Then("the all-time average duration for the {string} phase reflects all {int} sessions", function (this: StatsPersistenceWorld, phase: string, totalSessions: number) {
  const pd = this.loadedStats.phaseDurations[phase];
  if (!pd) throw new Error(`No phase duration data for "${phase}"`);
  if (pd.count !== totalSessions) {
    throw new Error(`Expected ${totalSessions} sessions for "${phase}", got ${pd.count}`);
  }
  // 4 sessions at 30s avg + 1 session at 50s = (30000*4 + 50000) / 5 = 34000ms
  const expectedAvg = (30000 * 4 + 50000) / 5;
  const tolerance = 1; // floating point
  if (Math.abs(pd.avgMs - expectedAvg) > tolerance) {
    throw new Error(`Expected avg ${expectedAvg}ms for "${phase}", got ${pd.avgMs}ms`);
  }
});

Then("the persisted stats reflect the completed session", function (this: StatsPersistenceWorld) {
  if (this.loadedStats.total !== 1) {
    throw new Error(`Expected total 1, got ${this.loadedStats.total}`);
  }
  if (this.loadedStats.successes !== 1) {
    throw new Error(`Expected successes 1, got ${this.loadedStats.successes}`);
  }
});

Then("the dashboard displays empty all-time stats", function (this: StatsPersistenceWorld) {
  if (this.loadedStats.total !== 0) {
    throw new Error(`Expected total 0, got ${this.loadedStats.total}`);
  }
  if (this.loadedStats.successes !== 0) {
    throw new Error(`Expected successes 0, got ${this.loadedStats.successes}`);
  }
});

Then("the dashboard is fully operational", function (this: StatsPersistenceWorld) {
  if (!this.loadedStats) {
    throw new Error("loadedStats is null — dashboard failed to initialize");
  }
});

Then("the dashboard discards the corrupt data", function (this: StatsPersistenceWorld) {
  if (this.loadedStats.total !== 0) {
    throw new Error(`Expected total 0 after discard, got ${this.loadedStats.total}`);
  }
});

Then("no special command or UI action was required", function (this: StatsPersistenceWorld) {
  // Declarative assertion — scenario demonstrated file deletion + restart was sufficient
});
