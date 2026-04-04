# Watch Loop Wiring — Implementation Tasks

## Goal

Wire the liveness engine into the watch loop's scan cycle and make dead session events observable. The liveness engine (`ITermSessionFactory.checkLiveness`) already exists — this feature connects it to the watch loop, emits `session-dead` events, and extends the logger subscriber.

## Architecture

- **Watch loop tick integration**: Call `checkLiveness` on the session factory before the epic scan in `tick()`, passing all tracked sessions from `DispatchTracker`
- **Event emission**: Emit `session-dead` from the watch loop after detecting a force-resolved session, before re-dispatch
- **Logger subscriber**: Extend `attachLoggerSubscriber` to handle `session-dead` with distinct formatting
- **Session isolation**: Only the specific dead session is affected — other sessions continue uninterrupted

## Tech Stack

- TypeScript, Bun runtime, Vitest for testing
- EventEmitter-based watch loop with typed event map
- Injectable SessionFactory interface with optional `checkLiveness` method

## File Structure

- **Modify:** `cli/src/commands/watch-loop.ts` — add liveness check to `tick()`, emit `session-dead`, extend logger subscriber
- **Modify:** `cli/src/__tests__/watch-events.test.ts` — tests for `session-dead` event emission and logger subscriber handling
- **Existing (read-only context):** `cli/src/dispatch/types.ts` — `SessionDeadEvent` and `WatchLoopEventMap` already have `session-dead`
- **Existing (read-only context):** `cli/src/dispatch/it2.ts` — `checkLiveness` already implemented
- **Existing (read-only context):** `cli/src/dispatch/tracker.ts` — `DispatchTracker.getAll()` already exists

---

### Task 0: Add liveness check to tick() and emit session-dead

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/commands/watch-loop.ts:137-153` (tick method)
- Modify: `cli/src/commands/watch-loop.ts:49-61` (WatchLoop class — new helper method)

- [ ] **Step 1: Write the failing test — tick calls checkLiveness before scan when factory supports it**

Add to `cli/src/__tests__/watch-events.test.ts`:

```typescript
test("tick calls checkLiveness before epic scan when factory supports it", async () => {
  const callOrder: string[] = [];

  const deps = makeDeps({
    scanEpics: async () => {
      callOrder.push("scan");
      return [];
    },
    sessionFactory: {
      async create(opts: SessionCreateOpts): Promise<SessionHandle> {
        return {
          id: `session-${Date.now()}`,
          worktreeSlug: opts.epicSlug,
          promise: new Promise(() => {}),
        };
      },
      async checkLiveness(_sessions: import("../dispatch/types").DispatchedSession[]) {
        callOrder.push("checkLiveness");
      },
    },
  });

  const loop = new WatchLoop(makeConfig(), deps);
  loop.setRunning(true);

  await loop.tick();

  expect(callOrder).toEqual(["checkLiveness", "scan"]);
  loop.setRunning(false);
});
```

- [ ] **Step 2: Write the failing test — tick skips checkLiveness when factory does not support it**

Add to `cli/src/__tests__/watch-events.test.ts`:

```typescript
test("tick skips checkLiveness when factory does not support it", async () => {
  const deps = makeDeps({
    scanEpics: async () => [],
    sessionFactory: {
      async create(opts: SessionCreateOpts): Promise<SessionHandle> {
        return {
          id: `session-${Date.now()}`,
          worktreeSlug: opts.epicSlug,
          promise: new Promise(() => {}),
        };
      },
      // No checkLiveness method
    },
  });

  const loop = new WatchLoop(makeConfig(), deps);
  loop.setRunning(true);

  // Should not throw
  await loop.tick();
  loop.setRunning(false);
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dead-man-switch/cli && bun test --run src/__tests__/watch-events.test.ts`
Expected: FAIL — `checkLiveness` not called by tick

- [ ] **Step 4: Implement liveness check in tick()**

In `cli/src/commands/watch-loop.ts`, modify the `tick()` method to call `checkLiveness` before scanning:

```typescript
/** Run a single scan-and-dispatch cycle. */
async tick(): Promise<void> {
  // Check liveness of active sessions before scanning
  if (this.deps.sessionFactory.checkLiveness && this.tracker.size > 0) {
    try {
      await this.deps.sessionFactory.checkLiveness(this.tracker.getAll());
    } catch (err) {
      this.logger.warn(`Liveness check failed: ${err}`);
    }
  }

  let epics: EnrichedManifest[];
  try {
    const result = await this.deps.scanEpics(this.config.projectRoot);
    epics = Array.isArray(result) ? result : result.epics;
  } catch (err) {
    this.logger.error(`State scan failed: ${err}`);
    return;
  }

  let dispatched = 0;
  for (const epic of epics) {
    dispatched += await this.processEpic(epic);
  }
  this.emitTyped('scan-complete', { epicsScanned: epics.length, dispatched });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dead-man-switch/cli && bun test --run src/__tests__/watch-events.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add cli/src/commands/watch-loop.ts cli/src/__tests__/watch-events.test.ts
git commit -m "feat(dead-man-switch): wire checkLiveness into watch loop tick()"
```

---

### Task 1: Emit session-dead event when liveness check detects dead sessions

**Wave:** 1
**Depends on:** Task 0

**Files:**
- Modify: `cli/src/commands/watch-loop.ts:137-153` (tick method — wrap checkLiveness with dead session detection)
- Modify: `cli/src/__tests__/watch-events.test.ts`

- [ ] **Step 1: Write the failing test — session-dead event emitted for dead sessions**

Add to `cli/src/__tests__/watch-events.test.ts`:

```typescript
test("emits session-dead when liveness check detects dead session", async () => {
  // Track sessions added to tracker for later force-resolution
  let trackedSessions: import("../dispatch/types").DispatchedSession[] = [];

  let scanCount = 0;
  const deps = makeDeps({
    scanEpics: async () => {
      scanCount++;
      if (scanCount === 1) {
        return [makeEpic({ slug: "dead-epic", nextAction: { phase: "plan", args: ["dead-epic"], type: "single" as const } })];
      }
      return [];
    },
    sessionFactory: {
      async create(opts: SessionCreateOpts): Promise<SessionHandle> {
        let resolvePromise: (result: import("../dispatch/types").SessionResult) => void;
        const promise = new Promise<import("../dispatch/types").SessionResult>((resolve) => {
          resolvePromise = resolve;
        });
        const id = `session-dead-test`;
        // Stash the resolver so checkLiveness can force-resolve
        (this as any)._resolver = resolvePromise!;
        (this as any)._sessionId = id;
        return { id, worktreeSlug: opts.epicSlug, promise };
      },
      async checkLiveness(sessions: import("../dispatch/types").DispatchedSession[]) {
        trackedSessions = sessions;
        // Simulate detecting a dead session by force-resolving
        for (const session of sessions) {
          if ((this as any)._sessionId === session.id) {
            (this as any)._resolver({
              success: false,
              exitCode: 1,
              durationMs: 1000,
            });
          }
        }
      },
    },
  });

  const loop = new WatchLoop(makeConfig(), deps);
  loop.setRunning(true);

  const deadEvents: Array<{ epicSlug: string; phase: string; sessionId: string }> = [];
  loop.on("session-dead", (payload) => deadEvents.push(payload));

  // First tick dispatches the session
  await loop.tick();
  // Wait for promise chain to settle
  await new Promise((r) => setTimeout(r, 50));

  // Second tick triggers liveness check — which force-resolves the dead session
  await loop.tick();
  // Wait for event emission
  await new Promise((r) => setTimeout(r, 50));

  expect(deadEvents.length).toBe(1);
  expect(deadEvents[0].epicSlug).toBe("dead-epic");
  expect(deadEvents[0].phase).toBe("plan");
  expect(deadEvents[0].sessionId).toBe("session-dead-test");
  loop.setRunning(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dead-man-switch/cli && bun test --run src/__tests__/watch-events.test.ts -t "emits session-dead"`
Expected: FAIL — no `session-dead` event emitted

- [ ] **Step 3: Implement session-dead event emission**

Modify `tick()` in `cli/src/commands/watch-loop.ts` to snapshot active sessions before checkLiveness, then diff after to find dead ones:

```typescript
/** Run a single scan-and-dispatch cycle. */
async tick(): Promise<void> {
  // Check liveness of active sessions before scanning
  if (this.deps.sessionFactory.checkLiveness && this.tracker.size > 0) {
    const beforeIds = new Set(this.tracker.getAll().map((s) => s.id));
    const beforeSessions = new Map(this.tracker.getAll().map((s) => [s.id, s]));
    try {
      await this.deps.sessionFactory.checkLiveness(this.tracker.getAll());
    } catch (err) {
      this.logger.warn(`Liveness check failed: ${err}`);
    }
    // Detect sessions removed by force-resolution (promise settled → watchSession removed them)
    // Give microtasks a chance to process the force-resolved promises
    await new Promise((r) => setTimeout(r, 0));
    for (const id of beforeIds) {
      if (!this.tracker.has(id)) {
        const session = beforeSessions.get(id);
        if (session) {
          this.emitTyped('session-dead', {
            epicSlug: session.epicSlug,
            phase: session.phase,
            featureSlug: session.featureSlug,
            sessionId: session.id,
            tty: '',
          });
        }
      }
    }
  }

  let epics: EnrichedManifest[];
  try {
    const result = await this.deps.scanEpics(this.config.projectRoot);
    epics = Array.isArray(result) ? result : result.epics;
  } catch (err) {
    this.logger.error(`State scan failed: ${err}`);
    return;
  }

  let dispatched = 0;
  for (const epic of epics) {
    dispatched += await this.processEpic(epic);
  }
  this.emitTyped('scan-complete', { epicsScanned: epics.length, dispatched });
}
```

Also add a `has(id)` method to `DispatchTracker` in `cli/src/dispatch/tracker.ts`:

```typescript
/** Check if a session with the given ID exists. */
has(id: string): boolean {
  return this.sessions.has(id);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dead-man-switch/cli && bun test --run src/__tests__/watch-events.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/commands/watch-loop.ts cli/src/dispatch/tracker.ts cli/src/__tests__/watch-events.test.ts
git commit -m "feat(dead-man-switch): emit session-dead event on liveness check detection"
```

---

### Task 2: Extend attachLoggerSubscriber to handle session-dead events

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/commands/watch-loop.ts:420-454` (attachLoggerSubscriber function)
- Modify: `cli/src/__tests__/watch-events.test.ts`

- [ ] **Step 1: Write the failing test**

Add to the existing `attachLoggerSubscriber` test in `cli/src/__tests__/watch-events.test.ts`:

```typescript
test("attachLoggerSubscriber formats session-dead events distinctly", () => {
  const deps = makeDeps();
  const loop = new WatchLoop(makeConfig(), deps);

  const logged: string[] = [];
  const warnings: string[] = [];

  const mockLogger: Logger = {
    log: (msg: string) => logged.push(msg),
    detail: (msg: string) => logged.push(msg),
    debug: () => {},
    trace: () => {},
    warn: (msg: string) => warnings.push(msg),
    error: () => {},
    child: () => mockLogger,
  };

  attachLoggerSubscriber(loop, mockLogger);

  loop.emit("session-dead", {
    epicSlug: "my-epic",
    phase: "plan",
    sessionId: "sess-dead-1",
    tty: "/dev/ttys003",
  });

  const allOutput = [...logged, ...warnings];
  expect(allOutput.some((m) => m.includes("DEAD") || m.includes("dead"))).toBe(true);
  expect(allOutput.some((m) => m.includes("my-epic"))).toBe(true);
  expect(allOutput.some((m) => m.includes("sess-dead-1") || m.includes("plan"))).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dead-man-switch/cli && bun test --run src/__tests__/watch-events.test.ts -t "session-dead events"`
Expected: FAIL — no handler for session-dead in attachLoggerSubscriber

- [ ] **Step 3: Implement session-dead handler in attachLoggerSubscriber**

In `cli/src/commands/watch-loop.ts`, add to `attachLoggerSubscriber` before the closing brace:

```typescript
loop.on('session-dead', ({ epicSlug, phase, featureSlug, sessionId, tty }) => {
  const child = logger.child({ phase, epic: epicSlug, ...(featureSlug ? { feature: featureSlug } : {}) });
  const ttyInfo = tty ? ` (tty: ${tty})` : '';
  child.warn(`DEAD session ${sessionId}${ttyInfo} — will re-dispatch on next scan`);
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dead-man-switch/cli && bun test --run src/__tests__/watch-events.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/commands/watch-loop.ts cli/src/__tests__/watch-events.test.ts
git commit -m "feat(dead-man-switch): add session-dead handler to logger subscriber"
```

---

### Task 3: Test session isolation — parallel sessions unaffected by dead session

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/__tests__/watch-events.test.ts`

- [ ] **Step 1: Write test — parallel sessions continue when one dies**

Add to `cli/src/__tests__/watch-events.test.ts`:

```typescript
test("parallel sessions for other epics are unaffected when one session dies", async () => {
  const resolvers = new Map<string, (result: import("../dispatch/types").SessionResult) => void>();

  let scanCount = 0;
  const deps = makeDeps({
    scanEpics: async () => {
      scanCount++;
      if (scanCount === 1) {
        return [
          makeEpic({ slug: "alive-epic", nextAction: { phase: "design", args: ["alive-epic"], type: "single" as const } }),
          makeEpic({ slug: "dead-epic", nextAction: { phase: "plan", args: ["dead-epic"], type: "single" as const } }),
        ];
      }
      return [];
    },
    sessionFactory: {
      async create(opts: SessionCreateOpts): Promise<SessionHandle> {
        let resolvePromise: (result: import("../dispatch/types").SessionResult) => void;
        const promise = new Promise<import("../dispatch/types").SessionResult>((resolve) => {
          resolvePromise = resolve;
        });
        const id = `session-${opts.epicSlug}`;
        resolvers.set(id, resolvePromise!);
        return { id, worktreeSlug: opts.epicSlug, promise };
      },
      async checkLiveness(sessions: import("../dispatch/types").DispatchedSession[]) {
        // Only kill the dead-epic session
        const deadSession = sessions.find((s) => s.epicSlug === "dead-epic");
        if (deadSession) {
          const resolver = resolvers.get(deadSession.id);
          if (resolver) {
            resolver({ success: false, exitCode: 1, durationMs: 500 });
          }
        }
      },
    },
  });

  const loop = new WatchLoop(makeConfig(), deps);
  loop.setRunning(true);

  const completedEvents: Array<{ epicSlug: string; success: boolean }> = [];
  loop.on("session-completed", (payload) => completedEvents.push({ epicSlug: payload.epicSlug, success: payload.success }));

  const deadEvents: Array<{ epicSlug: string }> = [];
  loop.on("session-dead", (payload) => deadEvents.push({ epicSlug: payload.epicSlug }));

  // First tick dispatches both sessions
  await loop.tick();
  await new Promise((r) => setTimeout(r, 50));

  // Verify both sessions are tracked
  expect(loop.getTracker().size).toBe(2);

  // Second tick runs liveness — kills dead-epic only
  await loop.tick();
  await new Promise((r) => setTimeout(r, 50));

  // dead-epic should have been detected and removed
  expect(deadEvents.length).toBe(1);
  expect(deadEvents[0].epicSlug).toBe("dead-epic");

  // alive-epic should still be tracked
  expect(loop.getTracker().size).toBe(1);

  // Verify completed event for dead session
  expect(completedEvents.some((e) => e.epicSlug === "dead-epic" && !e.success)).toBe(true);

  // alive-epic should NOT have completed
  expect(completedEvents.some((e) => e.epicSlug === "alive-epic")).toBe(false);

  loop.setRunning(false);
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dead-man-switch/cli && bun test --run src/__tests__/watch-events.test.ts -t "parallel sessions"`
Expected: PASS (implementation already done in Task 0 and 1)

- [ ] **Step 3: Write test — multiple simultaneous dead sessions handled independently**

```typescript
test("multiple simultaneous dead sessions are each handled independently", async () => {
  const resolvers = new Map<string, (result: import("../dispatch/types").SessionResult) => void>();

  let scanCount = 0;
  const deps = makeDeps({
    scanEpics: async () => {
      scanCount++;
      if (scanCount === 1) {
        return [
          makeEpic({ slug: "dead-a", nextAction: { phase: "design", args: ["dead-a"], type: "single" as const } }),
          makeEpic({ slug: "dead-b", nextAction: { phase: "plan", args: ["dead-b"], type: "single" as const } }),
        ];
      }
      return [];
    },
    sessionFactory: {
      async create(opts: SessionCreateOpts): Promise<SessionHandle> {
        let resolvePromise: (result: import("../dispatch/types").SessionResult) => void;
        const promise = new Promise<import("../dispatch/types").SessionResult>((resolve) => {
          resolvePromise = resolve;
        });
        const id = `session-${opts.epicSlug}`;
        resolvers.set(id, resolvePromise!);
        return { id, worktreeSlug: opts.epicSlug, promise };
      },
      async checkLiveness(sessions: import("../dispatch/types").DispatchedSession[]) {
        // Kill all sessions
        for (const session of sessions) {
          const resolver = resolvers.get(session.id);
          if (resolver) {
            resolver({ success: false, exitCode: 1, durationMs: 300 });
          }
        }
      },
    },
  });

  const loop = new WatchLoop(makeConfig(), deps);
  loop.setRunning(true);

  const deadEvents: Array<{ epicSlug: string; sessionId: string }> = [];
  loop.on("session-dead", (payload) => deadEvents.push({ epicSlug: payload.epicSlug, sessionId: payload.sessionId }));

  // First tick dispatches both
  await loop.tick();
  await new Promise((r) => setTimeout(r, 50));

  // Second tick detects both as dead
  await loop.tick();
  await new Promise((r) => setTimeout(r, 50));

  expect(deadEvents.length).toBe(2);
  const slugs = deadEvents.map((e) => e.epicSlug).sort();
  expect(slugs).toEqual(["dead-a", "dead-b"]);

  loop.setRunning(false);
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dead-man-switch/cli && bun test --run src/__tests__/watch-events.test.ts -t "multiple simultaneous"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/__tests__/watch-events.test.ts
git commit -m "test(dead-man-switch): add isolation tests for session-dead detection"
```
