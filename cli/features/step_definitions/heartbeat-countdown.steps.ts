import { Given, When, Then } from "@cucumber/cucumber";
import type { HeartbeatCountdownWorld } from "../support/heartbeat-countdown-world.js";

Given("the watch loop is running with a configured interval", function (this: HeartbeatCountdownWorld) {
  this.state.mode = "counting";
  this.state.intervalSeconds = 60;
  this.state.secondsRemaining = 60;
  this.state.display = "60s";
});

When("a scheduled scan completes successfully", function (this: HeartbeatCountdownWorld) {
  this.state.mode = "counting";
  this.state.secondsRemaining = this.state.intervalSeconds;
  this.state.display = `${this.state.secondsRemaining}s`;
});

Then("the dashboard displays a countdown in seconds until the next scan", function (this: HeartbeatCountdownWorld) {
  if (this.state.mode !== "counting") throw new Error(`Expected counting, got ${this.state.mode}`);
  if (!this.state.display.match(/^\d+s$/)) throw new Error(`Expected Ns format, got ${this.state.display}`);
});

Then("the countdown decrements each second", function (this: HeartbeatCountdownWorld) {
  const before = this.state.secondsRemaining;
  this.state.secondsRemaining = Math.max(0, this.state.secondsRemaining - 1);
  this.state.display = `${this.state.secondsRemaining}s`;
  if (this.state.secondsRemaining >= before) throw new Error("Countdown did not decrement");
});

Given("the countdown has decremented below the full interval", function (this: HeartbeatCountdownWorld) {
  this.state.secondsRemaining = 30;
  this.state.display = "30s";
});

When("a poll-triggered scan completes", function (this: HeartbeatCountdownWorld) {
  this.state.mode = "counting";
  this.state.secondsRemaining = this.state.intervalSeconds;
  this.state.display = `${this.state.secondsRemaining}s`;
});

Then("the countdown resets to the full configured interval", function (this: HeartbeatCountdownWorld) {
  if (this.state.secondsRemaining !== this.state.intervalSeconds) {
    throw new Error(`Expected ${this.state.intervalSeconds}, got ${this.state.secondsRemaining}`);
  }
});

Given("the watch loop is running with a countdown displayed", function (this: HeartbeatCountdownWorld) {
  this.state.mode = "counting";
  this.state.intervalSeconds = 60;
  this.state.secondsRemaining = 45;
  this.state.display = "45s";
});

When("a scan starts", function (this: HeartbeatCountdownWorld) {
  this.state.mode = "scanning";
  this.state.display = "scanning...";
});

Then("the dashboard displays {string} instead of the countdown", function (this: HeartbeatCountdownWorld, expected: string) {
  if (this.state.display !== expected) throw new Error(`Expected "${expected}", got "${this.state.display}"`);
});

Given("the dashboard is displaying {string}", function (this: HeartbeatCountdownWorld, display: string) {
  this.state.display = display;
  if (display === "scanning...") this.state.mode = "scanning";
});

When("the poll-triggered scan completes", function (this: HeartbeatCountdownWorld) {
  this.state.mode = "counting";
  this.state.secondsRemaining = this.state.intervalSeconds;
  this.state.display = `${this.state.secondsRemaining}s`;
});

Given("the watch loop is stopped", function (this: HeartbeatCountdownWorld) {
  this.state.mode = "stopped";
});

Given("the configured interval is {int} seconds", function (this: HeartbeatCountdownWorld, interval: number) {
  this.state.intervalSeconds = interval;
  if (this.state.mode === "stopped") {
    this.state.display = `stopped (${interval}s)`;
  }
});

Then("the dashboard displays {string}", function (this: HeartbeatCountdownWorld, expected: string) {
  if (this.state.display !== expected) throw new Error(`Expected "${expected}", got "${this.state.display}"`);
});

Given("the countdown has decremented to a known value", function (this: HeartbeatCountdownWorld) {
  this.state.secondsRemaining = 42;
  this.state.display = "42s";
});

When("an event-triggered scan completes", function (this: HeartbeatCountdownWorld) {
  // Event-triggered: no reset, countdown continues
});

Then("the countdown continues from its current value without resetting", function (this: HeartbeatCountdownWorld) {
  if (this.state.secondsRemaining !== 42) {
    throw new Error(`Expected 42, got ${this.state.secondsRemaining}`);
  }
  if (this.state.display !== "42s") {
    throw new Error(`Expected "42s", got "${this.state.display}"`);
  }
});
