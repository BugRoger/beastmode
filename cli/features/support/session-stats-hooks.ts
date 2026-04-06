/**
 * Cucumber lifecycle hooks for session stats accumulator integration tests.
 */

import { Before } from "@cucumber/cucumber";
import { EventEmitter } from "node:events";
import type { SessionStatsWorld } from "./session-stats-world.js";

Before(function (this: SessionStatsWorld) {
  this.emitter = new EventEmitter();
  this.accumulator = null;
  this.startTime = 0;
  this.currentTime = 0;
});
