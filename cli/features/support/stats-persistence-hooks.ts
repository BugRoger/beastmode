import { Before, After } from "@cucumber/cucumber";
import { EventEmitter } from "node:events";
import type { StatsPersistenceWorld } from "./stats-persistence-world.js";

Before(function (this: StatsPersistenceWorld) {
  this.emitter = new EventEmitter();
  this.loadedStats = null;
  this.error = null;
  this.warningLogged = false;
  this.createTmpDir();
});

After(function (this: StatsPersistenceWorld) {
  this.cleanup();
});
