/**
 * Cucumber lifecycle hooks for store integration tests.
 */

import { Before, After } from "@cucumber/cucumber";
import type { StoreWorld } from "./store-world.js";

Before(function (this: StoreWorld) {
  this.setup();
});

After(function (this: StoreWorld) {
  this.teardown();
});
