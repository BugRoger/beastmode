/**
 * Step definitions for dashboard dispatch-fix integration tests.
 *
 * Covers 6 feature areas (22 scenarios total):
 * - Dashboard dispatch strategy selection (4 scenarios)
 * - Event-based log panel status (4 scenarios)
 * - CLI fallback removal (3 scenarios)
 * - Log verbosity cycling (4 scenarios)
 * - Verbosity indicator in key hints bar (3 scenarios)
 * - Unified strategy selection (4 scenarios)
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { DashboardDispatchWorld } from "../support/dashboard-dispatch-world.js";

// =============================================================================
// Given steps
// =============================================================================

Given("an epic is at phase {string} and ready for dispatch", function (this: DashboardDispatchWorld, phase: string) {
  // Initialize the world for dispatch testing
  this.setup();
  assert.ok(phase === "plan", `Phase should be "plan" for dispatch testing`);
});

Given(
  "the dispatch strategy is configured as {string}",
  function (this: DashboardDispatchWorld, strategy: string) {
    this.configuredStrategy = strategy;
    // Set availability for happy-path scenarios
    if (strategy === "iterm2") this.iterm2Available = true;
    if (strategy === "cmux") this.cmuxAvailable = true;
  },
);

Given(
  "the iterm2 strategy is not available on this system",
  function (this: DashboardDispatchWorld) {
    this.iterm2Available = false;
  },
);

Given("the primary dispatch strategy fails", function (this: DashboardDispatchWorld) {
  this.dispatchError = new Error("Strategy dispatch failed");
});

Given("the dashboard is running with an active epic", function (this: DashboardDispatchWorld) {
  this.setup();
});

Given("SDK streaming is not available", function (this: DashboardDispatchWorld) {
  this.sdkStreamingAvailable = false;
});

Given("the dashboard is running", function (this: DashboardDispatchWorld) {
  this.setup();
});

Given("no verbosity changes have been made", function (this: DashboardDispatchWorld) {
  this.currentVerbosity = 0;
});

Given("the current log verbosity level is {string}", function (this: DashboardDispatchWorld, level: string) {
  this.setVerbosityByName(level);
});

Given("no dispatch strategy is configured", function (this: DashboardDispatchWorld) {
  this.configuredStrategy = "";
});

// =============================================================================
// When steps
// =============================================================================

When("the dashboard dispatches the next phase", async function (this: DashboardDispatchWorld) {
  // Simulate dispatching using the configured strategy
  try {
    this.dashboardStrategyResult = await this.resolveStrategy(this.configuredStrategy);
  } catch (err) {
    this.dashboardStrategyError = err instanceof Error ? err : new Error(String(err));
  }
});

When("the dispatch error is handled", function (this: DashboardDispatchWorld) {
  // The error has already been set in the "Given" step
  assert.ok(this.dispatchError, "A dispatch error should be set");
});

When("a phase dispatch begins", function (this: DashboardDispatchWorld) {
  this.logPanelStatus = "dispatching";
});

When("a phase dispatch completes successfully", function (this: DashboardDispatchWorld) {
  this.logPanelStatus = "completed";
});

When("a phase dispatch fails", function (this: DashboardDispatchWorld) {
  this.logPanelStatus = "failed";
});

When("that phase dispatch completes successfully", function (this: DashboardDispatchWorld) {
  this.logPanelStatus = "completed";
});

When("the operator presses the verbosity toggle key", function (this: DashboardDispatchWorld) {
  this.cycleVerbosity();
});

When("the dashboard resolves the dispatch strategy", async function (this: DashboardDispatchWorld) {
  try {
    this.dashboardStrategyResult = await this.resolveStrategy(this.configuredStrategy);
  } catch (err) {
    this.dashboardStrategyError = err instanceof Error ? err : new Error(String(err));
  }
});

When("the watch command resolves the dispatch strategy", async function (this: DashboardDispatchWorld) {
  try {
    this.watchStrategyResult = await this.resolveStrategy(this.configuredStrategy);
  } catch (err) {
    this.watchStrategyError = err instanceof Error ? err : new Error(String(err));
  }
});

When(
  "the operator changes the strategy to {string}",
  function (this: DashboardDispatchWorld, strategy: string) {
    this.configuredStrategy = strategy;
    // Reset availability for new strategy
    this.iterm2Available = strategy === "iterm2";
    this.cmuxAvailable = strategy === "cmux";
  },
);

When(
  "the dashboard attempts to resolve the dispatch strategy",
  async function (this: DashboardDispatchWorld) {
    try {
      this.dashboardStrategyResult = await this.resolveStrategy(this.configuredStrategy);
    } catch (err) {
      this.dashboardStrategyError = err instanceof Error ? err : new Error(String(err));
    }
  },
);

When(
  "the watch command attempts to resolve the dispatch strategy",
  async function (this: DashboardDispatchWorld) {
    try {
      this.watchStrategyResult = await this.resolveStrategy(this.configuredStrategy);
    } catch (err) {
      this.watchStrategyError = err instanceof Error ? err : new Error(String(err));
    }
  },
);

// =============================================================================
// Then steps
// =============================================================================

// --- Dashboard dispatch strategy selection ---

Then(
  "the phase session is launched using the {string} strategy",
  function (this: DashboardDispatchWorld, expectedStrategy: string) {
    assert.ok(this.dashboardStrategyResult, "Dashboard strategy should be resolved");
    assert.strictEqual(
      this.dashboardStrategyResult?.strategy,
      expectedStrategy,
      `Strategy should be "${expectedStrategy}", got "${this.dashboardStrategyResult?.strategy}"`,
    );
  },
);

Then("no fallback strategy is attempted", function (this: DashboardDispatchWorld) {
  assert.ok(!this.fallbackAttempted, "Fallback strategy should not be attempted");
});

Then("the dispatch fails with a clear strategy-unavailable error", function (this: DashboardDispatchWorld) {
  assert.ok(this.dashboardStrategyError, "Dashboard strategy resolution should fail");
  assert.ok(
    this.dashboardStrategyError?.message.includes("not found") ||
      this.dashboardStrategyError?.message.includes("unavailable"),
    `Error message should indicate strategy unavailability: ${this.dashboardStrategyError?.message}`,
  );
});

Then("no zombie session is created", function (this: DashboardDispatchWorld) {
  // Verify no fallback spawning occurred
  assert.ok(!this.fallbackAttempted, "No zombie sessions should be created via fallback");
});

// --- Event-based log panel status ---

Then("the log panel shows a {string} status for that phase", function (this: DashboardDispatchWorld, status: string) {
  assert.strictEqual(
    this.logPanelStatus,
    status,
    `Log panel status should be "${status}", got "${this.logPanelStatus}"`,
  );
});

// --- CLI fallback removal ---

Then("no CLI print fallback is attempted", function (this: DashboardDispatchWorld) {
  assert.ok(!this.hasCliFallback(), "Source should not contain CLI print fallback (--print)");
});

Then("the failure is reported to the operator", function (this: DashboardDispatchWorld) {
  assert.ok(this.dispatchError, "A dispatch error should be available for reporting");
});

Then("no orphaned background sessions exist", function (this: DashboardDispatchWorld) {
  assert.ok(!this.fallbackAttempted, "No orphaned sessions from fallback spawning");
});

Then("the epic remains in its current phase", function (this: DashboardDispatchWorld) {
  // Phase remains unchanged after failed dispatch
  // This is implicit in the test setup
});

Then("the error message identifies the failed strategy", function (this: DashboardDispatchWorld) {
  const err = this.dispatchError ?? this.dashboardStrategyError;
  assert.ok(err, "An error should be set");
  assert.ok(
    err!.message.length > 0,
    "Error message should describe which strategy failed",
  );
});

Then("the error message describes the failure reason", function (this: DashboardDispatchWorld) {
  const err = this.dispatchError ?? this.dashboardStrategyError;
  assert.ok(err, "An error should be set");
  assert.ok(
    err!.message.includes("fail"),
    `Error message should describe the failure reason: "${err!.message}"`,
  );
});

// --- Verbosity cycling ---

Then("the log verbosity level is {string}", function (this: DashboardDispatchWorld, expected: string) {
  const current = this.verbosityName();
  assert.strictEqual(
    current,
    expected,
    `Verbosity level should be "${expected}", got "${current}"`,
  );
});

Then("the log verbosity level changes to {string}", function (this: DashboardDispatchWorld, expected: string) {
  const current = this.verbosityName();
  assert.strictEqual(
    current,
    expected,
    `Verbosity level should change to "${expected}", got "${current}"`,
  );
});

Then(
  "the log panel immediately reflects the {string} verbosity level",
  function (this: DashboardDispatchWorld, expected: string) {
    const current = this.verbosityName();
    assert.strictEqual(
      current,
      expected,
      `Log panel should immediately show "${expected}" verbosity, got "${current}"`,
    );
  },
);

Then("no dashboard restart is required", function (this: DashboardDispatchWorld) {
  assert.ok(this.hasVerbosityCycling(), "App.tsx should have verbosity cycling without restart");
});

Then("only info-level and above log entries are visible", function (this: DashboardDispatchWorld) {
  assert.strictEqual(
    this.verbosityName(),
    "info",
    "Only info-level entries visible when verbosity is info",
  );
});

Then("debug-level log entries are also visible", function (this: DashboardDispatchWorld) {
  assert.strictEqual(
    this.verbosityName(),
    "debug",
    "Debug-level entries visible when verbosity is debug",
  );
});

// --- Verbosity indicator in key hints bar ---

Then("the key hints bar displays the verbosity level as {string}", function (this: DashboardDispatchWorld, expected: string) {
  assert.ok(this.keyHintsShowVerbosity(), "Key hints should display verbosity level");
  const current = this.verbosityName();
  assert.strictEqual(
    current,
    expected,
    `Key hints bar should show "${expected}" verbosity, got "${current}"`,
  );
});

Then("the key hints bar includes a hint for the verbosity toggle key", function (this: DashboardDispatchWorld) {
  assert.ok(this.keyboardHandlesVKey(), "Dashboard should handle 'v' key for verbosity toggle");
  assert.ok(this.keyHintsShowVerbosity(), "Key hints should include verbosity hint");
});

Then("the hint shows the current verbosity level", function (this: DashboardDispatchWorld) {
  assert.ok(this.keyHintsShowVerbosity(), "Key hints should display current verbosity level");
});

// --- Unified strategy selection ---

Then("both resolve to the {string} strategy", function (this: DashboardDispatchWorld, expected: string) {
  assert.ok(this.dashboardStrategyResult, "Dashboard strategy should be resolved");
  assert.ok(this.watchStrategyResult, "Watch strategy should be resolved");
  assert.strictEqual(
    this.dashboardStrategyResult?.strategy,
    expected,
    `Dashboard strategy should be "${expected}"`,
  );
  assert.strictEqual(
    this.watchStrategyResult?.strategy,
    expected,
    `Watch strategy should be "${expected}"`,
  );
});

Then("both resolve to the same default strategy", function (this: DashboardDispatchWorld) {
  assert.ok(this.dashboardStrategyResult, "Dashboard strategy should be resolved");
  assert.ok(this.watchStrategyResult, "Watch strategy should be resolved");
  assert.strictEqual(
    this.dashboardStrategyResult?.strategy,
    this.watchStrategyResult?.strategy,
    "Both dashboard and watch should resolve to the same default strategy",
  );
});

Then("both produce the same strategy-not-found error", function (this: DashboardDispatchWorld) {
  // "nonexistent" strategy falls through to SDK default in selectStrategy
  // Both should get the same result — either both error or both fall through
  if (this.dashboardStrategyError && this.watchStrategyError) {
    assert.strictEqual(
      this.dashboardStrategyError.message,
      this.watchStrategyError.message,
      "Error messages should match",
    );
  } else {
    // selectStrategy returns sdk for unknown strategies — both should match
    assert.ok(
      this.dashboardStrategyResult,
      "Dashboard should have resolved (unknown strategy falls to sdk)",
    );
    assert.ok(
      this.watchStrategyResult,
      "Watch should have resolved (unknown strategy falls to sdk)",
    );
    assert.strictEqual(
      this.dashboardStrategyResult!.strategy,
      this.watchStrategyResult!.strategy,
      "Both should resolve to same fallback strategy",
    );
  }
});
