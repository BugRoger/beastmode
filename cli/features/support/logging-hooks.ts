/**
 * Cucumber lifecycle hooks for logging-cleanup integration tests.
 */

import { Before, After } from "@cucumber/cucumber";
import type { LoggingWorld } from "./logging-world.js";

Before(function (this: LoggingWorld) {
  this.reset();
});

After(function (this: LoggingWorld) {
  // No teardown needed — in-memory mocks, no I/O
});
