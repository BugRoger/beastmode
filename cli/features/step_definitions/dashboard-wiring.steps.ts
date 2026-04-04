/**
 * Step definitions for dashboard wiring integration tests.
 *
 * Tests verify structural properties of the dashboard source code
 * and runtime behavior of pure functions (nyanColor, constants).
 * No React rendering — source analysis and function calls only.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { DashboardWorld } from "../support/dashboard-world.js";

// =============================================================================
// Given steps
// =============================================================================

Given("the App component source is loaded", function (this: DashboardWorld) {
  assert.ok(this.appSource.length > 0, "App.tsx source should be loaded");
});

Given("the ThreePanelLayout source is loaded", function (this: DashboardWorld) {
  assert.ok(this.threePanelSource.length > 0, "ThreePanelLayout.tsx source should be loaded");
});

Given("the nyan color runtime is loaded", function (this: DashboardWorld) {
  assert.ok(this.nyanPalette.length === 6, "NYAN_PALETTE should have 6 colors");
  assert.ok(typeof this.nyanColorFn === "function", "nyanColor should be a function");
});

Given("the NyanBanner source is loaded", function (this: DashboardWorld) {
  assert.ok(this.nyanBannerSource.length > 0, "NyanBanner.tsx source should be loaded");
});

Given("the OverviewPanel source is loaded", function (this: DashboardWorld) {
  assert.ok(this.overviewPanelSource.length > 0, "OverviewPanel.tsx source should be loaded");
});

Given("the App component is initialized with config", function (this: DashboardWorld) {
  assert.ok(
    this.appSource.includes("export default function App"),
    "App.tsx should export default function App",
  );
});

// =============================================================================
// When steps
// =============================================================================

When("I check the top-level layout component", function (this: DashboardWorld) {
  // Analysis happens in Then steps — this is a semantic marker
});

When("I check the header section", function (this: DashboardWorld) {
  // Analysis happens in Then steps
});

When("the tick offset advances by 1", function (this: DashboardWorld) {
  (this as any)._colorAtTick0 = this.nyanColorFn("█", 0, 0);
  (this as any)._colorAtTick1 = this.nyanColorFn("█", 0, 1);
});

When("I check panel dimensions", function (this: DashboardWorld) {
  // Analysis happens in Then steps
});

When("I check panel titles", function (this: DashboardWorld) {
  // Analysis happens in Then steps
});

When("I check the overview panel content", function (this: DashboardWorld) {
  // Analysis happens in Then steps
});

When("I check the log panel", function (this: DashboardWorld) {
  // Analysis happens in Then steps
});

When("I check the clock effect", function (this: DashboardWorld) {
  // Analysis happens in Then steps
});

When("I check the tick interval", function (this: DashboardWorld) {
  // Analysis happens in Then steps
});

When("I verify all five flashy-dashboard requirements", function (this: DashboardWorld) {
  // Composite verification — individual Then steps do the checks
});

// =============================================================================
// Then steps
// =============================================================================

// --- App root layout ---

Then("App renders ThreePanelLayout as the top-level layout", function (this: DashboardWorld) {
  assert.ok(
    this.appRendersComponent("ThreePanelLayout"),
    "App.tsx should render <ThreePanelLayout> in its JSX",
  );
});

Then("App does not render TwoColumnLayout", function (this: DashboardWorld) {
  assert.ok(
    !this.appRendersComponent("TwoColumnLayout"),
    "App.tsx should NOT render <TwoColumnLayout> in its JSX",
  );
});

// --- Nyan banner ---

Then("the header contains a NyanBanner component", function (this: DashboardWorld) {
  assert.ok(
    this.threePanelSource.includes("<NyanBanner"),
    "ThreePanelLayout should contain <NyanBanner /> in the header",
  );
});

Then("the color assigned to charIndex 0 changes", function (this: DashboardWorld) {
  const c0 = (this as any)._colorAtTick0 as string;
  const c1 = (this as any)._colorAtTick1 as string;
  assert.notStrictEqual(
    c0,
    c1,
    `nyanColor("█", 0, 0)=${c0} should differ from nyanColor("█", 0, 1)=${c1}`,
  );
});

// --- Layout proportions ---

Then("the top section height is {string}", function (this: DashboardWorld, expected: string) {
  const height = this.extractHeight("Top section");
  assert.strictEqual(height, expected, `Top section height should be ${expected}, got ${height}`);
});

Then("the epics panel width is {string}", function (this: DashboardWorld, expected: string) {
  const width = this.extractPanelWidth("EPICS");
  assert.strictEqual(width, expected, `EPICS panel width should be ${expected}, got ${width}`);
});

Then("the overview panel width is {string}", function (this: DashboardWorld, expected: string) {
  const width = this.extractPanelWidth("OVERVIEW");
  assert.strictEqual(width, expected, `OVERVIEW panel width should be ${expected}, got ${width}`);
});

Then("the log panel uses flexGrow", function (this: DashboardWorld) {
  const logPattern = /title="LOG"\s+flexGrow=\{1\}/;
  assert.ok(
    logPattern.test(this.threePanelSource),
    "LOG panel should use flexGrow={1}",
  );
});

// --- Inline panel titles ---

Then("the epics panel has title {string}", function (this: DashboardWorld, title: string) {
  assert.ok(this.hasPanelTitle(title), `ThreePanelLayout should have panel titled "${title}"`);
});

Then("the overview panel has title {string}", function (this: DashboardWorld, title: string) {
  assert.ok(this.hasPanelTitle(title), `ThreePanelLayout should have panel titled "${title}"`);
});

Then("the log panel has title {string}", function (this: DashboardWorld, title: string) {
  assert.ok(this.hasPanelTitle(title), `ThreePanelLayout should have panel titled "${title}"`);
});

// --- Overview panel ---

Then("the overview panel shows {string}", function (this: DashboardWorld, text: string) {
  assert.ok(
    this.overviewPanelSource.includes(text),
    `OverviewPanel should contain "${text}"`,
  );
});

// --- Full terminal height ---

Then("the log panel uses flexGrow for remaining vertical space", function (this: DashboardWorld) {
  const logPattern = /title="LOG"\s+flexGrow=\{1\}/;
  assert.ok(
    logPattern.test(this.threePanelSource),
    "LOG panel should use flexGrow={1} for remaining vertical space",
  );
});

Then("the outer container uses rows prop for height", function (this: DashboardWorld) {
  assert.ok(
    this.threePanelSource.includes("height={rows"),
    "Outer container should use rows prop for height",
  );
});

// --- Clock and tick ---

Then("the clock interval is {int} milliseconds", function (this: DashboardWorld, expected: number) {
  const interval = this.extractClockInterval();
  assert.strictEqual(interval, expected, `Clock interval should be ${expected}ms, got ${interval}ms`);
});

Then("the clock format is HH:MM:SS", function (this: DashboardWorld) {
  assert.ok(this.hasHHMMSSFormat(), "formatClock should produce HH:MM:SS format");
});

Then("the tick interval is {int} milliseconds", function (this: DashboardWorld, expected: number) {
  assert.strictEqual(
    this.tickIntervalMs,
    expected,
    `TICK_INTERVAL_MS should be ${expected}, got ${this.tickIntervalMs}`,
  );
});

// --- End-to-end composite ---

Then("all three panels have inline titles", function (this: DashboardWorld) {
  for (const title of ["EPICS", "OVERVIEW", "LOG"]) {
    assert.ok(this.hasPanelTitle(title), `ThreePanelLayout should have panel titled "${title}"`);
  }
});

Then("the overview panel is a static display component", function (this: DashboardWorld) {
  assert.ok(
    !this.overviewPanelSource.includes("useState"),
    "OverviewPanel should not use useState (static display)",
  );
  assert.ok(
    this.overviewPanelSource.includes("export default function OverviewPanel"),
    "OverviewPanel should be a function component",
  );
});
