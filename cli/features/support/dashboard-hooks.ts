/**
 * Cucumber lifecycle hooks for dashboard wiring integration tests.
 */

import { Before, After } from "@cucumber/cucumber";
import type { DashboardWorld } from "./dashboard-world.js";

Before(async function (this: DashboardWorld) {
  this.setup();
  await this.loadRuntime();
});

After(async function (this: DashboardWorld) {
  // No teardown needed — read-only tests
});
