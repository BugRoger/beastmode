/**
 * Cucumber lifecycle hooks for spring-cleaning integration tests.
 */

import { Before, After } from "@cucumber/cucumber";
import type { SpringCleaningWorld } from "./spring-cleaning-world.js";

Before(async function (this: SpringCleaningWorld) {
  this.setup();
});

After(async function (this: SpringCleaningWorld) {
  // No teardown needed — read-only source analysis
});
