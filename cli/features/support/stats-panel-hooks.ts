import { Before } from "@cucumber/cucumber";
import type { StatsPanelWorld } from "./stats-panel-world.js";

Before(async function (this: StatsPanelWorld) {
  this.emitter = new (await import("node:events")).EventEmitter();
  this.accumulator = null;
  this.stats = null;
  this.contentResult = null;
  this.setup();
});
