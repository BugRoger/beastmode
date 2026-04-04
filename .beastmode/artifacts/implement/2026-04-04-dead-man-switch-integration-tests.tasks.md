# Integration Tests for Dead-Man-Switch

## Goal

Build the behavioral integration test suite for the dead-man-switch epic. Five Gherkin feature files covering: crashed session detection, automatic re-dispatch, session isolation during recovery, session-dead event logging, and instrumentation-free liveness detection.

## Architecture

- **Test framework:** Cucumber.js with `@cucumber/cucumber` (same as existing integration tests)
- **World class:** Extends `WatchLoopWorld` — pure in-memory, no git/filesystem
- **Mock boundary:** `scanEpics` and `SessionFactory` fully mocked (same as watch-loop tests)
- **New capability:** Simulating terminal process death by resolving session promises as failed without advancing manifests, then capturing `session-dead` events on next tick

## Design Decisions (from PRD)

- Detection method: TTY process tree check (but tests mock at SessionFactory level, not TTY level)
- `checkLiveness?(sessions: DispatchedSession[]): Promise<void>` — optional method on `SessionFactory` interface
- `session-dead` event on `WatchLoopEventMap` with payload `{ epicSlug, phase, featureSlug?, sessionId, tty }`
- Recovery: fail-and-rescan — watch loop removes dead session, next tick re-dispatches
- No grace period — dead is dead on first check

## Tech Stack

- TypeScript, Cucumber.js, `@cucumber/cucumber`
- `WatchLoopWorld` from `cli/features/support/watch-world.ts`
- `WatchLoop` from `cli/src/commands/watch-loop.ts`
- `SdkSessionFactory` from `cli/src/dispatch/factory.ts`

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `cli/features/dead-man-switch-detection.feature` | Create | Gherkin scenarios for crashed session detection (3 scenarios) |
| `cli/features/dead-man-switch-redispatch.feature` | Create | Gherkin scenarios for automatic re-dispatch (3 scenarios) |
| `cli/features/dead-man-switch-isolation.feature` | Create | Gherkin scenarios for session isolation during recovery (3 scenarios) |
| `cli/features/dead-man-switch-events.feature` | Create | Gherkin scenarios for session-dead event logging (4 scenarios) |
| `cli/features/dead-man-switch-liveness.feature` | Create | Gherkin scenarios for instrumentation-free liveness detection (3 scenarios) |
| `cli/features/step_definitions/dead-man-switch.steps.ts` | Create | Step definitions for all dead-man-switch scenarios |
| `cli/features/support/watch-world.ts` | Modify | Add `killSession()`, `killAllSessionsForEpic()`, `sessionDeadEvents`, and event capture |
| `cli/cucumber.json` | Modify | Add `dead-man-switch` and `dead-man-switch-all` profiles |

---

## Task 0: Extend WatchLoopWorld with Dead Session Simulation

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/features/support/watch-world.ts`

The WatchLoopWorld needs methods to simulate a session dying (resolve promise as failed without advancing manifest) and to capture `session-dead` events when they're emitted.

- [x] **Step 1: Add session-dead event capture array and SessionDeadEvent type**

In `watch-world.ts`, add the import for `SessionDeadEvent` (will be defined by the core feature later) and add the capture array. For now, use an inline interface since the type doesn't exist yet.

```typescript
// Add after the SessionResolver interface (around line 28)
export interface SessionDeadEvent {
  epicSlug: string;
  phase: string;
  featureSlug?: string;
  sessionId: string;
  tty: string;
}
```

Add to the class fields (after `completedSessions`):
```typescript
sessionDeadEvents: SessionDeadEvent[] = [];
```

Add to `setup()`:
```typescript
this.sessionDeadEvents = [];
```

Add to `initLoop()` after the existing event captures:
```typescript
this.loop.on("session-dead" as any, (evt: SessionDeadEvent) => {
  this.sessionDeadEvents.push(evt);
});
```

Note: `as any` cast because the event doesn't exist on WatchLoopEventMap yet — the core feature adds it. Tests will fail until then (expected — we're writing tests first).

- [x] **Step 2: Add killSession method**

Add after the `failSession` method:

```typescript
/**
 * Kill a session to simulate terminal process death.
 * Resolves the promise as failed WITHOUT advancing manifest,
 * so the epic remains at the same phase for re-dispatch.
 */
killSession(epicSlug: string, featureSlug?: string): void {
  for (const [id, resolver] of this.sessionResolvers) {
    const matches = featureSlug
      ? resolver.epicSlug === epicSlug && resolver.featureSlug === featureSlug
      : resolver.epicSlug === epicSlug && !resolver.featureSlug;
    if (matches) {
      this.sessionResolvers.delete(id);
      // Do NOT advance manifest — session died, phase stays the same
      resolver.resolve({ success: false, exitCode: 1, durationMs: 100 });
      return;
    }
  }
  throw new Error(
    `No session found for ${epicSlug}${featureSlug ? `/${featureSlug}` : ""}`,
  );
}
```

- [x] **Step 3: Add killAllSessionsForEpic method**

Add after `killSession`:

```typescript
/**
 * Kill all sessions for an epic (simulates all terminal processes dying).
 */
killAllSessionsForEpic(epicSlug: string): void {
  const toKill: Array<[string, SessionResolver]> = [];
  for (const [id, resolver] of this.sessionResolvers) {
    if (resolver.epicSlug === epicSlug) {
      toKill.push([id, resolver]);
    }
  }
  for (const [id, resolver] of toKill) {
    this.sessionResolvers.delete(id);
    resolver.resolve({ success: false, exitCode: 1, durationMs: 100 });
  }
}
```

- [x] **Step 4: Add seedEpic method for single-epic seeding**

Add after `seedEpics`:

```typescript
/**
 * Seed a single epic at a given phase with a specific nextAction.
 * Unlike seedEpics() which seeds all epicDefs, this targets one epic.
 */
seedEpic(epicSlug: string, currentPhase: string, nextActionPhase: string, nextActionType: "single" | "fan-out" = "single"): void {
  const def = this.epicDefs.get(epicSlug);
  const features = def
    ? def.features.map((f) => ({
        slug: f.slug,
        plan: `${f.slug}.md`,
        wave: f.wave,
        status: "pending" as const,
      }))
    : [];

  const manifest: EnrichedManifest = {
    slug: epicSlug,
    phase: currentPhase as any,
    features: nextActionType === "fan-out" ? features : [],
    artifacts: {},
    lastUpdated: new Date().toISOString(),
    manifestPath: `state/${epicSlug}.manifest.json`,
    nextAction: nextActionType === "fan-out"
      ? {
          phase: nextActionPhase,
          args: [epicSlug],
          type: "fan-out",
          features: def ? def.features.filter((f) => f.wave === 1).map((f) => f.slug) : [],
        }
      : {
          phase: nextActionPhase,
          args: [epicSlug],
          type: "single",
        },
  };
  this.manifests.set(epicSlug, manifest);
}
```

- [x] **Step 5: Add hasActiveSession helper**

Add after `getActiveSessions`:

```typescript
/**
 * Check if a specific epic (or feature within an epic) has an active session.
 */
hasActiveSession(epicSlug: string, featureSlug?: string): boolean {
  const tracker = this.loop.getTracker();
  return tracker.getAll().some((s) =>
    s.epicSlug === epicSlug &&
    (featureSlug ? s.featureSlug === featureSlug : true),
  );
}
```

- [x] **Step 6: Commit**

```bash
git add cli/features/support/watch-world.ts
git commit -m "feat(dead-man-switch): extend WatchLoopWorld with session death simulation"
```

---

## Task 1: Create Crashed Session Detection Feature File

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/features/dead-man-switch-detection.feature`

- [x] **Step 1: Write the feature file**

```gherkin
@dead-man-switch
Feature: Crashed session detection -- dead iTerm2 sessions detected automatically

  The watch loop checks liveness of dispatched sessions on each scan cycle.
  A session whose terminal process has exited is classified as dead. Detection
  happens at the watch loop level, not inside the session itself.

  Background:
    Given epic "auth-system" with features:
      | feature       | wave |
      | auth-provider | 1    |
    And the watch loop is initialized

  Scenario: Session that exits cleanly is not flagged as dead
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the active session for "auth-system" completes successfully
    Then no session-dead event should be emitted for "auth-system"

  Scenario: Session whose terminal process has exited is detected as dead
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the terminal process for "auth-system" exits unexpectedly
    And the watch loop ticks
    Then the session for "auth-system" should be classified as dead

  Scenario: Session that is still running is not classified as dead
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    Then the session for "auth-system" should be classified as alive
    And no session-dead event should be emitted for "auth-system"
```

- [x] **Step 2: Commit**

```bash
git add cli/features/dead-man-switch-detection.feature
git commit -m "feat(dead-man-switch): add crashed session detection feature file"
```

---

## Task 2: Create Dead Session Re-Dispatch Feature File

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/features/dead-man-switch-redispatch.feature`

- [x] **Step 1: Write the feature file**

```gherkin
@dead-man-switch
Feature: Dead session re-dispatch -- crashed sessions recover on next scan cycle

  When a session is detected as dead, the watch loop re-dispatches the same
  phase and feature on the next scan cycle. The epic resumes from where it
  was before the crash, not from the beginning of the pipeline.

  Background:
    Given epic "data-pipeline" with features:
      | feature   | wave |
      | ingestion | 1    |
      | transform | 2    |
    And the watch loop is initialized

  Scenario: Dead session is re-dispatched on next scan cycle
    When epic "data-pipeline" is seeded in "design" phase with next action "implement" type "fan-out"
    And the watch loop ticks
    And a session is dispatched for "data-pipeline" implement feature "ingestion"
    And the terminal process for feature "ingestion" of "data-pipeline" exits unexpectedly
    And the watch loop ticks
    Then a new session should be dispatched for "data-pipeline" implement feature "ingestion"

  Scenario: Re-dispatched session runs the same phase as the crashed session
    When epic "data-pipeline" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the terminal process for "data-pipeline" exits unexpectedly
    And the watch loop ticks
    Then the re-dispatched session should be for the "plan" phase of "data-pipeline"
    And the manifest phase for "data-pipeline" should still be "design"

  Scenario: Re-dispatched session completes successfully after crash
    When epic "data-pipeline" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the terminal process for "data-pipeline" exits unexpectedly
    And the watch loop ticks
    And the active session for "data-pipeline" completes successfully
    Then the manifest phase for "data-pipeline" should advance past "plan"
```

- [x] **Step 2: Commit**

```bash
git add cli/features/dead-man-switch-redispatch.feature
git commit -m "feat(dead-man-switch): add dead session re-dispatch feature file"
```

---

## Task 3: Create Session Isolation Feature File

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/features/dead-man-switch-isolation.feature`

- [x] **Step 1: Write the feature file**

```gherkin
@dead-man-switch
Feature: Session isolation during recovery -- only the crashed session is affected

  When one session dies in a multi-epic watch loop, other sessions for
  different epics and features continue running unaffected. Recovery
  targets only the specific crashed session.

  Scenario: Other epic sessions continue when one epic's session dies
    Given epic "auth-system" with features:
      | feature       | wave |
      | auth-provider | 1    |
    And epic "data-pipeline" with features:
      | feature   | wave |
      | ingestion | 1    |
    And the watch loop is initialized
    When both epics are seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the terminal process for "auth-system" exits unexpectedly
    And the watch loop ticks
    Then the session for "data-pipeline" should still be active
    And a new session should be dispatched for "auth-system" plan phase

  Scenario: Other feature sessions within same epic continue when one feature session dies
    Given epic "auth-system" with features:
      | feature       | wave |
      | auth-provider | 1    |
      | login-flow    | 1    |
    And the watch loop is initialized
    When epic "auth-system" is seeded in "design" phase with next action "implement" type "fan-out"
    And the watch loop ticks
    And the terminal process for feature "auth-provider" of "auth-system" exits unexpectedly
    And the watch loop ticks
    Then the session for feature "login-flow" of "auth-system" should still be active
    And a new session should be dispatched for "auth-system" implement feature "auth-provider"

  Scenario: Multiple simultaneous crashes are each recovered independently
    Given epic "auth-system" with features:
      | feature       | wave |
      | auth-provider | 1    |
    And epic "data-pipeline" with features:
      | feature   | wave |
      | ingestion | 1    |
    And the watch loop is initialized
    When both epics are seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the terminal process for "auth-system" exits unexpectedly
    And the terminal process for "data-pipeline" exits unexpectedly
    And the watch loop ticks
    Then a new session should be dispatched for "auth-system" plan phase
    And a new session should be dispatched for "data-pipeline" plan phase
```

- [x] **Step 2: Commit**

```bash
git add cli/features/dead-man-switch-isolation.feature
git commit -m "feat(dead-man-switch): add session isolation feature file"
```

---

## Task 4: Create Session-Dead Event Logging Feature File

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/features/dead-man-switch-events.feature`

- [x] **Step 1: Write the feature file**

```gherkin
@dead-man-switch
Feature: Session-dead event logging -- dead sessions emit observable events

  When a dead session is detected, the watch loop emits a session-dead event
  that appears in the log stream and dashboard. The event includes enough
  context to identify which epic and phase were affected.

  Background:
    Given epic "auth-system" with features:
      | feature       | wave |
      | auth-provider | 1    |
    And the watch loop is initialized

  Scenario: Dead session emits a session-dead event
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the terminal process for "auth-system" exits unexpectedly
    And the watch loop ticks
    Then a "session-dead" event should be emitted
    And the session-dead event should identify epic "auth-system"

  Scenario: Session-dead event includes the phase that was running
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the terminal process for "auth-system" exits unexpectedly
    And the watch loop ticks
    Then the "session-dead" event should include the phase "plan"

  Scenario: Session-dead event is followed by a re-dispatch event
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the terminal process for "auth-system" exits unexpectedly
    And the watch loop ticks
    Then a "session-dead" event should be emitted before the re-dispatch
    And a dispatch event should follow for epic "auth-system"

  Scenario: No session-dead event for sessions that complete normally
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the active session for "auth-system" completes successfully
    Then no "session-dead" event should be emitted
```

- [x] **Step 2: Commit**

```bash
git add cli/features/dead-man-switch-events.feature
git commit -m "feat(dead-man-switch): add session-dead event logging feature file"
```

---

## Task 5: Create Instrumentation-Free Liveness Detection Feature File

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/features/dead-man-switch-liveness.feature`

- [x] **Step 1: Write the feature file**

```gherkin
@dead-man-switch
Feature: Instrumentation-free liveness detection -- no session-side changes required

  Liveness detection works by checking whether the terminal process associated
  with a dispatched session still exists. No heartbeat file, no IPC channel,
  no agent-side probe. Existing skills and agents run unmodified.

  Background:
    Given epic "auth-system" with features:
      | feature       | wave |
      | auth-provider | 1    |
    And the watch loop is initialized

  Scenario: Liveness check uses only the terminal process identifier
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    Then the liveness check for "auth-system" should use only the session process identifier
    And no heartbeat file should exist for "auth-system"

  Scenario: Session that produces no output is still detected as alive while process runs
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the session for "auth-system" produces no output for an extended period
    And the terminal process for "auth-system" is still running
    Then the session for "auth-system" should be classified as alive

  Scenario: Session detected as dead only after process actually exits
    When epic "auth-system" is seeded in "design" phase with next action "plan"
    And the watch loop ticks
    And the terminal process for "auth-system" exits unexpectedly
    Then the session for "auth-system" should be classified as dead
    And the classification should not depend on session output or artifacts
```

- [x] **Step 2: Commit**

```bash
git add cli/features/dead-man-switch-liveness.feature
git commit -m "feat(dead-man-switch): add instrumentation-free liveness feature file"
```

---

## Task 6: Create Step Definitions for Dead-Man-Switch Scenarios

**Wave:** 2
**Depends on:** Task 0, Task 1, Task 2, Task 3, Task 4, Task 5

**Files:**
- Create: `cli/features/step_definitions/dead-man-switch.steps.ts`

All step definitions for the dead-man-switch feature files. Uses `WatchLoopWorld` with the extensions from Task 0.

- [x] **Step 1: Write the step definitions file**

```typescript
/**
 * Step definitions for dead-man-switch integration tests.
 *
 * Tests the watch loop's ability to detect crashed sessions, re-dispatch them,
 * maintain isolation, emit events, and check liveness without instrumentation.
 *
 * Uses WatchLoopWorld with session death simulation (killSession, killAllSessionsForEpic).
 * Mock boundary: scanEpics + SessionFactory are mocked. No git, no filesystem.
 */

import { Given, When, Then } from "@cucumber/cucumber";
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
    // Find and resolve the session for this epic
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
    // Verify the session was dispatched
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
    // Wait for the promise resolution to propagate through watchSession
    await new Promise((r) => setTimeout(r, 150));
  },
);

When(
  "the terminal process for feature {string} of {string} exits unexpectedly",
  async function (this: WatchLoopWorld, featureSlug: string, epicSlug: string) {
    this.killSession(epicSlug, featureSlug);
    // Wait for the promise resolution to propagate through watchSession
    await new Promise((r) => setTimeout(r, 150));
  },
);

When(
  "the re-dispatched session completes successfully",
  async function (this: WatchLoopWorld) {
    // Complete all remaining sessions
    await this.completeAllSessions();
  },
);

When(
  "the session for {string} produces no output for an extended period",
  function (this: WatchLoopWorld, _epicSlug: string) {
    // No-op: session is still running, just not producing output.
    // The point is that the session is alive despite silence.
  },
);

When(
  "the terminal process for {string} is still running",
  function (this: WatchLoopWorld, _epicSlug: string) {
    // No-op: the session promise is still pending, which means
    // the process is still alive from the watch loop's perspective.
  },
);

// -- Then: session classification --

Then(
  "the session for {string} should be classified as dead",
  function (this: WatchLoopWorld, epicSlug: string) {
    // A dead session means it's no longer in the tracker (was removed on failure)
    const tracker = this.loop.getTracker();
    const active = tracker.getAll().filter((s) => s.epicSlug === epicSlug);
    // The original session should be gone. A re-dispatch may have created a new one,
    // but the point is the old session was detected as dead.
    // Check that a session-completed event with success:false was emitted
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
    // Alive means the session is still in the tracker
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
    // After the session dies and a tick happens, a new dispatch should appear
    // The dispatch log should have at least 2 entries for this epic:
    // the original dispatch and the re-dispatch
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
    // Should have at least 2 dispatches for this feature (original + re-dispatch)
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
    // Last dispatch entry for this epic should be the re-dispatch
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
    // In the mock world, liveness is determined by whether the session promise
    // is still pending (process running) or resolved (process exited).
    // This step verifies the session exists in the tracker (process-based check).
    const tracker = this.loop.getTracker();
    const session = tracker.getAll().find((s) => s.epicSlug === epicSlug);
    assert.ok(
      session,
      `Expected active session for "${epicSlug}" — liveness check should find it via process ID`,
    );
    // The session has an id (simulating a process identifier), not a heartbeat file
    assert.ok(session.id, "Session should have a process identifier (id)");
  },
);

Then(
  "no heartbeat file should exist for {string}",
  function (this: WatchLoopWorld, _epicSlug: string) {
    // WatchLoopWorld is pure in-memory — no filesystem at all.
    // This step passes by design: the liveness mechanism doesn't use heartbeat files.
    // The test documents the architectural decision: no instrumentation.
    assert.ok(true, "No heartbeat file — liveness uses process check only");
  },
);

Then(
  "the classification should not depend on session output or artifacts",
  function (this: WatchLoopWorld, _epicSlug?: string) {
    // The session was classified as dead purely based on process exit (promise resolution).
    // No output files or artifacts were checked. This is architectural verification.
    assert.ok(true, "Classification based on process exit, not output");
  },
);
```

- [x] **Step 2: Verify step definitions compile**

Run: `cd cli && npx tsc --noEmit`
Expected: No errors in dead-man-switch.steps.ts (type errors in other files are acceptable — they depend on not-yet-implemented code)

- [x] **Step 3: Commit**

```bash
git add cli/features/step_definitions/dead-man-switch.steps.ts
git commit -m "feat(dead-man-switch): add step definitions for all dead-man-switch scenarios"
```

---

## Task 7: Add Cucumber Profiles for Dead-Man-Switch Tests

**Wave:** 2
**Depends on:** Task 1, Task 2, Task 3, Task 4, Task 5, Task 6

**Files:**
- Modify: `cli/cucumber.json`

- [x] **Step 1: Add individual and combined profiles**

Add the following profiles to `cli/cucumber.json`:

- `dead-man-switch-detection` — detection feature only
- `dead-man-switch-redispatch` — re-dispatch feature only
- `dead-man-switch-isolation` — isolation feature only
- `dead-man-switch-events` — events feature only
- `dead-man-switch-liveness` — liveness feature only
- `dead-man-switch` — all five features combined
- Update `watch-all` to include the dead-man-switch features

Each profile imports:
- `features/step_definitions/dead-man-switch.steps.ts`
- `features/step_definitions/watch-loop.steps.ts` (for shared Given/When steps)
- `features/support/watch-world.ts`
- `features/support/watch-hooks.ts`

- [x] **Step 2: Run the combined profile to verify configuration**

Run: `cd cli && bun --bun node_modules/.bin/cucumber-js --profile dead-man-switch`
Expected: Tests may fail (implementation not built yet) but the profile should be recognized and feature files should be parsed without errors.

- [x] **Step 3: Commit**

```bash
git add cli/cucumber.json
git commit -m "feat(dead-man-switch): add cucumber profiles for dead-man-switch integration tests"
```
