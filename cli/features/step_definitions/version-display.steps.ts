/**
 * Step definitions for version-display integration tests.
 *
 * Tests verify structural properties of the dashboard source code
 * for the version display feature.
 * No React rendering — source analysis only.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { DashboardWorld } from "../support/dashboard-world.js";

// =============================================================================
// Given steps
// =============================================================================

Given("the dashboard source is loaded", function (this: DashboardWorld) {
  assert.ok(this.appSource.length > 0, "App.tsx source should be loaded");
  assert.ok(this.threePanelSource.length > 0, "ThreePanelLayout.tsx source should be loaded");
});

// =============================================================================
// When steps
// =============================================================================

When("I examine the App component's started event handler", function (this: DashboardWorld) {
  const handlerMatch = this.appSource.match(/const onStarted\s*=\s*\([^)]*\)\s*=>\s*\{[^}]*\}/s);
  assert.ok(handlerMatch, "onStarted handler should exist in App.tsx");
  this.lastMatch = handlerMatch[0];
});

When("I examine the App component's JSX", function (this: DashboardWorld) {
  const jsxMatch = this.appSource.match(/<ThreePanelLayout[\s\S]*?\/>/);
  assert.ok(jsxMatch, "ThreePanelLayout JSX should exist in App.tsx");
  this.lastMatch = jsxMatch[0];
});

When("I examine the ThreePanelLayout props interface", function (this: DashboardWorld) {
  const interfaceMatch = this.threePanelSource.match(/export interface ThreePanelLayoutProps\s*\{[\s\S]*?\}/);
  assert.ok(interfaceMatch, "ThreePanelLayoutProps interface should exist");
  this.lastMatch = interfaceMatch[0];
});

When("I examine the ThreePanelLayout header region", function (this: DashboardWorld) {
  const headerMatch = this.threePanelSource.match(/\{\/\* Header bar[\s\S]*?<\/Box>/);
  assert.ok(headerMatch, "Header bar section should exist in ThreePanelLayout");
  this.lastMatch = headerMatch[0];
});

When("I examine the version text element", function (this: DashboardWorld) {
  const versionTextMatch = this.threePanelSource.match(/<Text[^>]*>.*version.*<\/Text>/s) ||
    this.threePanelSource.match(/\{version\s*&&/s) ||
    this.threePanelSource.match(/version\s*\?/s);
  assert.ok(versionTextMatch, "Version text element should exist in ThreePanelLayout");
  this.lastMatch = versionTextMatch[0];
});

When("I examine the version rendering logic", function (this: DashboardWorld) {
  this.lastMatch = this.threePanelSource;
});

// =============================================================================
// Then steps
// =============================================================================

Then("the handler captures the version from the event payload", function (this: DashboardWorld) {
  assert.ok(
    this.appSource.includes("setVersion") || this.appSource.match(/version.*=.*ev/),
    "onStarted handler should capture version from event payload"
  );
});

Then("ThreePanelLayout receives a version prop", function (this: DashboardWorld) {
  assert.ok(
    this.lastMatch!.includes("version=") || this.lastMatch!.includes("version={"),
    "ThreePanelLayout should receive a version prop"
  );
});

Then("the interface includes an optional version prop of type string", function (this: DashboardWorld) {
  assert.ok(
    this.lastMatch!.includes("version?:"),
    "ThreePanelLayoutProps should include optional version prop"
  );
});

Then("the version text element appears after the clock element", function (this: DashboardWorld) {
  const clockIndex = this.threePanelSource.indexOf("{clock}");
  const versionIndex = this.threePanelSource.indexOf("{version");
  assert.ok(clockIndex > -1, "Clock element should exist");
  assert.ok(versionIndex > -1, "Version element should exist");
  assert.ok(versionIndex > clockIndex, "Version should appear after clock in source");
});

Then("the version text uses CHROME.muted color", function (this: DashboardWorld) {
  const versionSection = this.threePanelSource.match(/version[\s\S]{0,200}CHROME\.muted|CHROME\.muted[\s\S]{0,200}version/);
  assert.ok(versionSection, "Version text should use CHROME.muted color");
});

Then("the version element is conditionally rendered only when version is truthy", function (this: DashboardWorld) {
  const conditionalPattern = /version\s*&&|version\s*\?/;
  assert.ok(
    conditionalPattern.test(this.threePanelSource),
    "Version should be conditionally rendered"
  );
});
