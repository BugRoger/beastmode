/**
 * Cucumber lifecycle hooks for GitHub enrichment integration tests.
 */

import { Before, After } from "@cucumber/cucumber";
import type { GitHubEnrichmentWorld } from "./enrichment-world.js";

Before(function (this: GitHubEnrichmentWorld) {
  this.setup();
});

After(function (this: GitHubEnrichmentWorld) {
  this.teardown();
});
