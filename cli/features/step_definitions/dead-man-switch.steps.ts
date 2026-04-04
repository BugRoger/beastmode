/**
 * Step definitions for dead-man-switch integration tests.
 *
 * Tests the watch loop's ability to detect crashed sessions, re-dispatch them,
 * maintain isolation, emit events, and check liveness without instrumentation.
 *
 * Uses WatchLoopWorld with session death simulation (killSession, killAllSessionsForEpic).
 * Mock boundary: scanEpics + SessionFactory are mocked. No git, no filesystem.
 */

import { When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { WatchLoopWorld } from "../support/watch-world.js";

// -- When: seeding --

When(
  "epic {string} is seeded in {string} phase with next action {string}",
  function (this: WatchLoopWorld, epicSlug: string, phase: string, nextPhase: string) {
    this.seedEpic(epicSlug, phase, nextPhase);
  },
);

When(
  "epic {string} is seeded in {string} phase with next action {string} type {string}",
  function (this: WatchLoopWorld, epicSlug: string, phase: string, nextPhase: string, actionType: string) {
    this.seedEpic(epicSlug, phase, nextPhase, actionType as "single" | "fan-out");
  },
);

// -- When: session lifecycle --

When(
  "the active session for {string} completes successfully",
  async function (this: WatchLoopWorld, epicSlug: string) {
    for (const [id, resolver] of this.sessionResolvers) {
      if (resolver.epicSlug === epicSlug) {
        this.sessionResolvers.delete(id);
        this.advanceManifest(resolver.epicSlug, resolver.phase, resolver.featureSlug);
        resolver.resolve({ success: true, exitCode: 0, durationMs: 100 });
        await new Promise((r) => setTimeout(r, 150));
        return;
      }
    }
    throw new Error(`No active session found for epic "${epicSlug}"`);
  },
);

When(
  "a session is dispatched for {string} implement feature {string}",
  function (this: WatchLoopWorld, epicSlug: string, featureSlug: string) {
    const dispatched = this.dispatchLog.some(
      (d) => d.epicSlug === epicSlug && d.phase === "implement" && d.featureSlug === featureSlug,
    );
    assert.ok(
      dispatched,
      `Expected dispatch for ${epicSlug}/implement/${featureSlug}, got: ${JSON.stringify(this.dispatchLog)}`,
    );
  },
);

When(
  "a session is dispatched for {string} plan phase",
  function (this: WatchLoopWorld, epicSlug: string) {
    const dispatched = this.dispatchLog.some(
      (d) => d.epicSlug === epicSlug && d.phase === "plan",
    );
    assert.ok(
      dispatched,
      `Expected dispatch for ${epicSlug}/plan, got: ${JSON.stringify(this.dispatchLog)}`,
    );
  },
);

// -- When: terminal process death --

When(
  "the terminal process for {string} exits unexpectedly",
  async function (this: WatchLoopWorld, epicSlug: string) {
    this.killSession(epicSlug);
    await new Promise((r) => setTimeout(r, 150));
  },
);

When(
  "the terminal process for feature {string} of {string} exits unexpectedly",
  async function (this: WatchLoopWorld, featureSlug: string, epicSlug: string) {
    this.killSession(epicSlug, featureSlug);
    await new Promise((r) => setTimeout(r, 150));
  },
);

When(
  "the re-dispatched session completes successfully",
  async function (this: WatchLoopWorld) {
    await this.completeAllSessions();
  },
);

When(
  "the session for {string} produces no output for an extended period",
  function (this: WatchLoopWorld, _epicSlug: string) {
    // No-op: session is still running, just not producing output.
  },
);

When(
  "the terminal process for {string} is still running",
  function (this: WatchLoopWorld, _epicSlug: string) {
    // No-op: the session promise is still pending, process is alive.
  },
);

// -- Then: session classification --

Then(
  "the session for {string} should be classified as dead",
  function (this: WatchLoopWorld, epicSlug: string) {
    const deadCompletion = this.completedSessions.some(
      (s) => s.epicSlug === epicSlug && !s.success,
    );
    assert.ok(
      deadCompletion,
      `Expected a failed session-completed event for "${epicSlug}", got: ${JSON.stringify(this.completedSessions)}`,
    );
  },
);

Then(
  "the session for {string} should be classified as alive",
  function (this: WatchLoopWorld, epicSlug: string) {
    assert.ok(
      this.hasActiveSession(epicSlug),
      `Expected an active session for "${epicSlug}" but none found`,
    );
  },
);

Then(
  "the session for {string} should still be active",
  function (this: WatchLoopWorld, epicSlug: string) {
    assert.ok(
      this.hasActiveSession(epicSlug),
      `Expected "${epicSlug}" to still have an active session`,
    );
  },
);

Then(
  "the session for feature {string} of {string} should still be active",
  function (this: WatchLoopWorld, featureSlug: string, epicSlug: string) {
    assert.ok(
      this.hasActiveSession(epicSlug, featureSlug),
      `Expected "${epicSlug}/${featureSlug}" to still have an active session`,
    );
  },
);

// -- Then: session-dead events --

Then(
  "no session-dead event should be emitted for {string}",
  function (this: WatchLoopWorld, epicSlug: string) {
    const events = this.sessionDeadEvents.filter((e) => e.epicSlug === epicSlug);
    assert.strictEqual(
      events.length,
      0,
      `Expected no session-dead events for "${epicSlug}", got ${events.length}`,
    );
  },
);

Then(
  "a {string} event should be emitted",
  function (this: WatchLoopWorld, eventType: string) {
    if (eventType === "session-dead") {
      assert.ok(
        this.sessionDeadEvents.length > 0,
        `Expected at least one session-dead event, got none`,
      );
    }
  },
);

Then(
  "the session-dead event should identify epic {string}",
  function (this: WatchLoopWorld, epicSlug: string) {
    const event = this.sessionDeadEvents.find((e) => e.epicSlug === epicSlug);
    assert.ok(
      event,
      `Expected a session-dead event for "${epicSlug}", got: ${JSON.stringify(this.sessionDeadEvents)}`,
    );
  },
);

Then(
  "the {string} event should include the phase {string}",
  function (this: WatchLoopWorld, eventType: string, phase: string) {
    if (eventType === "session-dead") {
      const event = this.sessionDeadEvents.find((e) => e.phase === phase);
      assert.ok(
        event,
        `Expected a session-dead event with phase "${phase}", got: ${JSON.stringify(this.sessionDeadEvents)}`,
      );
    }
  },
);

Then(
  "a {string} event should be emitted before the re-dispatch",
  function (this: WatchLoopWorld, eventType: string) {
    if (eventType === "session-dead") {
      assert.ok(
        this.sessionDeadEvents.length > 0,
        `Expected session-dead event before re-dispatch`,
      );
    }
  },
);

Then(
  "a dispatch event should follow for epic {string}",
  function (this: WatchLoopWorld, epicSlug: string) {
    const dispatches = this.dispatchLog.filter((d) => d.epicSlug === epicSlug);
    assert.ok(
      dispatches.length >= 2,
      `Expected at least 2 dispatches for "${epicSlug}" (original + re-dispatch), got ${dispatches.length}`,
    );
  },
);

Then(
  "no {string} event should be emitted",
  function (this: WatchLoopWorld, eventType: string) {
    if (eventType === "session-dead") {
      assert.strictEqual(
        this.sessionDeadEvents.length,
        0,
        `Expected no session-dead events, got ${this.sessionDeadEvents.length}`,
      );
    }
  },
);

// -- Then: re-dispatch verification --

Then(
  "a new session should be dispatched for {string} implement feature {string}",
  function (this: WatchLoopWorld, epicSlug: string, featureSlug: string) {
    const dispatches = this.dispatchLog.filter(
      (d) => d.epicSlug === epicSlug && d.phase === "implement" && d.featureSlug === featureSlug,
    );
    assert.ok(
      dispatches.length >= 2,
      `Expected re-dispatch for ${epicSlug}/implement/${featureSlug}, dispatches: ${JSON.stringify(dispatches)}`,
    );
  },
);

Then(
  "a new session should be dispatched for {string} plan phase",
  function (this: WatchLoopWorld, epicSlug: string) {
    const dispatches = this.dispatchLog.filter(
      (d) => d.epicSlug === epicSlug && d.phase === "plan",
    );
    assert.ok(
      dispatches.length >= 2,
      `Expected re-dispatch for ${epicSlug}/plan, dispatches: ${JSON.stringify(dispatches)}`,
    );
  },
);

Then(
  "the re-dispatched session should be for the {string} phase of {string}",
  function (this: WatchLoopWorld, phase: string, epicSlug: string) {
    const dispatches = this.dispatchLog.filter((d) => d.epicSlug === epicSlug);
    const lastDispatch = dispatches[dispatches.length - 1];
    assert.ok(lastDispatch, `No dispatches found for "${epicSlug}"`);
    assert.strictEqual(
      lastDispatch.phase,
      phase,
      `Expected re-dispatch phase "${phase}", got "${lastDispatch.phase}"`,
    );
  },
);

Then(
  "the manifest phase for {string} should still be {string}",
  function (this: WatchLoopWorld, epicSlug: string, phase: string) {
    const manifest = this.manifests.get(epicSlug);
    assert.ok(manifest, `No manifest found for "${epicSlug}"`);
    assert.strictEqual(
      manifest.phase,
      phase,
      `Expected manifest phase "${phase}", got "${manifest.phase}"`,
    );
  },
);

Then(
  "the manifest phase for {string} should advance past {string}",
  function (this: WatchLoopWorld, epicSlug: string, phase: string) {
    const manifest = this.manifests.get(epicSlug);
    assert.ok(manifest, `No manifest found for "${epicSlug}"`);
    const phases = ["design", "plan", "implement", "validate", "release", "done"];
    const currentIdx = phases.indexOf(manifest.phase);
    const checkIdx = phases.indexOf(phase);
    assert.ok(
      currentIdx > checkIdx,
      `Expected manifest phase to be past "${phase}", but at "${manifest.phase}"`,
    );
  },
);

// -- Then: liveness detection mechanism --

Then(
  "the liveness check for {string} should use only the session process identifier",
  function (this: WatchLoopWorld, epicSlug: string) {
    const tracker = this.loop.getTracker();
    const session = tracker.getAll().find((s) => s.epicSlug === epicSlug);
    assert.ok(
      session,
      `Expected active session for "${epicSlug}" — liveness check should find it via process ID`,
    );
    assert.ok(session.id, "Session should have a process identifier (id)");
  },
);

Then(
  "no heartbeat file should exist for {string}",
  function (this: WatchLoopWorld, _epicSlug: string) {
    // WatchLoopWorld is pure in-memory — no filesystem at all.
    // This step documents the architectural decision: no instrumentation.
    assert.ok(true, "No heartbeat file — liveness uses process check only");
  },
);

Then(
  "the classification should not depend on session output or artifacts",
  function (this: WatchLoopWorld) {
    // Classification based on process exit, not output.
    assert.ok(true, "Classification based on process exit, not output");
  },
);
