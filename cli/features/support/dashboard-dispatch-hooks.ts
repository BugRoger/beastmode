/**
 * Cucumber lifecycle hooks for dashboard dispatch-fix integration tests.
 */

import { Before, After } from "@cucumber/cucumber";
import type { DashboardDispatchWorld } from "./dashboard-dispatch-world.js";

Before(async function (this: DashboardDispatchWorld) {
  this.setup();
});

After(async function (this: DashboardDispatchWorld) {
  // No teardown needed — read-only source analysis + pure function tests
});
