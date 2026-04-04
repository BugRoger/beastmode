# Liveness Engine — Implementation Tasks

## Goal

Implement process liveness detection for iTerm2 dispatched sessions. When a dispatched session's process dies (no `beastmode` process on its TTY), force-resolve the hung `watchForMarker` promise as failed so the watch loop can re-dispatch.

## Architecture

Three components layered on top of the existing `ITermSessionFactory`:

1. **TTY Acquisition** — After creating/splitting a pane, call `It2Client.getSessionTty()` and store the TTY path in a Map keyed by pane session ID.
2. **External Promise Resolution** — Store the `resolve` callback from `watchForMarker`'s Promise constructor in a Map keyed by session ID (the dispatch session ID, not the iTerm2 pane session ID). `checkLiveness` retrieves and calls the resolver to force-complete dead sessions.
3. **Liveness Check** — `checkLiveness(sessions)` iterates dispatched sessions, runs `ps -t <tty> -o args=` for each stored TTY, checks for `beastmode` in the process args. If absent, force-resolves the promise with `{ success: false, exitCode: 1, durationMs: elapsed }`.

## Tech Stack

- TypeScript, Bun runtime, vitest for unit tests
- `SpawnFn` for injectable process spawning (same pattern as `It2Client`)
- No new dependencies

## File Structure

- **Modify:** `cli/src/dispatch/it2.ts` — Add TTY storage, external promise resolution, `checkLiveness()` method, inject `SpawnFn` into factory
- **Modify:** `cli/src/__tests__/it2-session.test.ts` — Add liveness check tests, external promise resolution tests
- **Modify:** `cli/src/__tests__/it2-client.test.ts` — Already has `getSessionTty` tests (no changes needed)

---

## Task 0: Add SpawnFn to ITermSessionFactory constructor and TTY storage

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dispatch/it2.ts:442-460` (constructor and private fields)
- Test: `cli/src/__tests__/it2-session.test.ts`

- [x] **Step 1: Write the failing test**

Add to `cli/src/__tests__/it2-session.test.ts`:

```typescript
test("stores TTY for pane session at dispatch time", async () => {
  // Mock client that returns a TTY for the created pane
  const ttyClient = createMockIt2Client();
  ttyClient.getSessionTty = async (sessionId: string) => {
    if (sessionId === "tab-1") return "/dev/ttys003";
    return null;
  };

  const factory = new ITermSessionFactory(ttyClient, {
    watchTimeoutMs: 2000,
    createWorktree: mockCreateWorktree,
  });

  const handle = await factory.create(makeOpts());
  await tick();
  writeOutputJson("my-epic", "plan", { status: "completed", artifacts: {} });
  await handle.promise;

  // Verify getSessionTty was called for the pane
  const ttyCalls = ttyClient.calls.filter((c) => c.method === "getSessionTty");
  expect(ttyCalls).toHaveLength(1);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/it2-session.test.ts -t "stores TTY"`
Expected: FAIL — `getSessionTty` is not called during `create()`

- [x] **Step 3: Write minimal implementation**

In `cli/src/dispatch/it2.ts`, add to `ITermSessionFactory`:

1. Add private fields:
```typescript
private ttyMap = new Map<string, string>(); // pane session ID -> TTY device path
private spawnFn: SpawnFn;
```

2. Update constructor to accept and store SpawnFn:
```typescript
constructor(
  client: IIt2Client,
  opts?: { watchTimeoutMs?: number; createWorktree?: CreateWorktreeFn; spawn?: SpawnFn },
) {
  this.client = client;
  this.createWorktree =
    opts?.createWorktree ?? ((slug, o) => worktree.create(slug, o));
  this.watchTimeoutMs = opts?.watchTimeoutMs ?? 3_600_000;
  this.spawnFn = opts?.spawn ?? ((cmd, spawnOpts) => Bun.spawn(cmd, spawnOpts));
}
```

3. In `create()`, after storing the pane ID (`this.panes.set(paneKey, paneSessionId)`), add TTY acquisition:
```typescript
// Acquire TTY for liveness checks
const tty = await this.client.getSessionTty(paneSessionId);
if (tty) {
  this.ttyMap.set(paneSessionId, tty);
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd cli && bun --bun vitest run src/__tests__/it2-session.test.ts -t "stores TTY"`
Expected: PASS

- [x] **Step 5: Commit**

```bash
cd cli && git add src/dispatch/it2.ts src/__tests__/it2-session.test.ts
git commit -m "feat(dead-man-switch): add TTY storage and SpawnFn to ITermSessionFactory"
```

---

## Task 1: Add external promise resolution to watchForMarker

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dispatch/it2.ts:660-784` (watchForMarker method, new private field)
- Test: `cli/src/__tests__/it2-session.test.ts`

- [x] **Step 1: Write the failing test**

Add to `cli/src/__tests__/it2-session.test.ts`:

```typescript
test("external promise resolution completes watchForMarker as failed", async () => {
  const factory = new ITermSessionFactory(mockClient, {
    watchTimeoutMs: 10000,
    createWorktree: mockCreateWorktree,
  });

  const handle = await factory.create(makeOpts());

  // Force-resolve the session externally
  const resolved = factory.forceResolveSession(handle.id, {
    success: false,
    exitCode: 1,
    durationMs: 100,
  });
  expect(resolved).toBe(true);

  const result = await handle.promise;
  expect(result.success).toBe(false);
  expect(result.exitCode).toBe(1);
});

test("forceResolveSession returns false for unknown session", async () => {
  const factory = new ITermSessionFactory(mockClient, {
    watchTimeoutMs: 2000,
    createWorktree: mockCreateWorktree,
  });

  const resolved = factory.forceResolveSession("nonexistent-id", {
    success: false,
    exitCode: 1,
    durationMs: 0,
  });
  expect(resolved).toBe(false);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/it2-session.test.ts -t "external promise resolution"`
Expected: FAIL — `forceResolveSession` does not exist

- [x] **Step 3: Write minimal implementation**

In `cli/src/dispatch/it2.ts`, modify `ITermSessionFactory`:

1. Add private field:
```typescript
private resolvers = new Map<string, (result: SessionResult) => void>(); // dispatch session ID -> resolve fn
```

2. In `watchForMarker`, store the resolve callback. Change the beginning of the Promise constructor:
```typescript
private watchForMarker(
  sessionId: string,
  artifactDir: string,
  startTime: number,
  signal: AbortSignal,
  outputSuffix: string,
  epicSlug: string,
  broadMatch: boolean,
): Promise<SessionResult> {
  return new Promise<SessionResult>((resolvePromise, rejectPromise) => {
    // Store resolver for external resolution (dead-man switch)
    this.resolvers.set(sessionId, (result: SessionResult) => {
      this.resolvers.delete(sessionId);
      resolvePromise(result);
    });

    // ... rest of existing code (check existing output, etc.)
```

3. Ensure the resolver is cleaned up when the promise resolves normally. In all existing `resolvePromise(result)` call sites, add `this.resolvers.delete(sessionId)` before the resolve. Do this in:
   - The early `existing` check: add `this.resolvers.delete(sessionId);` before `resolvePromise(result);`
   - The fs.watch callback: add `this.resolvers.delete(sessionId);` before `resolvePromise(result);` inside the cleanup+resolve block
   - The polling interval callback: add `this.resolvers.delete(sessionId);` before `resolvePromise(result);`
   - The timeout callbacks: add `this.resolvers.delete(sessionId);` before each `resolvePromise(...)` call

4. Add public method:
```typescript
/** Force-resolve a session's watchForMarker promise. Returns true if resolved, false if session not found. */
forceResolveSession(sessionId: string, result: SessionResult): boolean {
  const resolver = this.resolvers.get(sessionId);
  if (!resolver) return false;
  resolver(result);
  return true;
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd cli && bun --bun vitest run src/__tests__/it2-session.test.ts -t "external promise resolution"`
Expected: PASS

- [x] **Step 5: Run all existing tests to check for regressions**

Run: `cd cli && bun --bun vitest run src/__tests__/it2-session.test.ts`
Expected: All tests PASS

- [x] **Step 6: Commit**

```bash
cd cli && git add src/dispatch/it2.ts src/__tests__/it2-session.test.ts
git commit -m "feat(dead-man-switch): add external promise resolution to watchForMarker"
```

---

## Task 2: Implement checkLiveness method

**Wave:** 2
**Depends on:** Task 0, Task 1

**Files:**
- Modify: `cli/src/dispatch/it2.ts` (add `checkLiveness` method, add `paneSessionForDispatch` map)
- Test: `cli/src/__tests__/it2-session.test.ts`

- [x] **Step 1: Write the failing tests**

Add to `cli/src/__tests__/it2-session.test.ts`:

```typescript
import type { DispatchedSession, SessionResult } from "../dispatch/types";

function makeMockSpawn(stdout: string, exitCode: number = 0): SpawnFn {
  return (_cmd, _opts) => ({
    stdout: new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode(stdout));
        c.close();
      },
    }),
    stderr: new ReadableStream({ start(c) { c.close(); } }),
    exited: Promise.resolve(exitCode),
  });
}

function makeDispatchedSession(overrides?: Partial<DispatchedSession>): DispatchedSession {
  const ac = new AbortController();
  return {
    id: "test-session-id",
    epicSlug: "my-epic",
    phase: "plan",
    worktreeSlug: "my-epic",
    abortController: ac,
    promise: new Promise(() => {}), // never resolves
    startedAt: Date.now(),
    ...overrides,
  };
}

describe("checkLiveness", () => {
  test("alive session — beastmode process on TTY — no force resolution", async () => {
    const psOutput = "ARGS\n/opt/homebrew/bin/bun /path/to/beastmode plan my-epic\nfish -l\n";
    const ttyClient = createMockIt2Client();
    ttyClient.getSessionTty = async () => "/dev/ttys003";

    const factory = new ITermSessionFactory(ttyClient, {
      watchTimeoutMs: 10000,
      createWorktree: mockCreateWorktree,
      spawn: makeMockSpawn(psOutput),
    });

    const handle = await factory.create(makeOpts());
    const session = makeDispatchedSession({ id: handle.id });

    await factory.checkLiveness([session]);

    // Promise should NOT have been resolved — session is alive
    // Verify by checking that forceResolveSession still has a resolver
    const canResolve = factory.forceResolveSession(handle.id, {
      success: false, exitCode: 1, durationMs: 0,
    });
    expect(canResolve).toBe(true);
  });

  test("dead session — no beastmode process on TTY — force resolves as failed", async () => {
    const psOutput = "ARGS\nfish -l\nlogin -fp user\n";
    const ttyClient = createMockIt2Client();
    ttyClient.getSessionTty = async () => "/dev/ttys003";

    const factory = new ITermSessionFactory(ttyClient, {
      watchTimeoutMs: 10000,
      createWorktree: mockCreateWorktree,
      spawn: makeMockSpawn(psOutput),
    });

    const handle = await factory.create(makeOpts());
    const session = makeDispatchedSession({ id: handle.id });

    await factory.checkLiveness([session]);

    // Promise should have been force-resolved as failed
    const result = await handle.promise;
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  test("TTY lookup failure — session not force-resolved", async () => {
    // Factory with no TTY stored (getSessionTty returns null)
    const factory = new ITermSessionFactory(mockClient, {
      watchTimeoutMs: 10000,
      createWorktree: mockCreateWorktree,
      spawn: makeMockSpawn(""),
    });

    const handle = await factory.create(makeOpts());
    const session = makeDispatchedSession({ id: handle.id });

    await factory.checkLiveness([session]);

    // No TTY means no check — promise should still be pending
    const canResolve = factory.forceResolveSession(handle.id, {
      success: false, exitCode: 1, durationMs: 0,
    });
    expect(canResolve).toBe(true);
  });

  test("ps command failure — session not force-resolved", async () => {
    const ttyClient = createMockIt2Client();
    ttyClient.getSessionTty = async () => "/dev/ttys003";

    const factory = new ITermSessionFactory(ttyClient, {
      watchTimeoutMs: 10000,
      createWorktree: mockCreateWorktree,
      spawn: makeMockSpawn("", 1), // ps fails
    });

    const handle = await factory.create(makeOpts());
    const session = makeDispatchedSession({ id: handle.id });

    await factory.checkLiveness([session]);

    // ps failed — don't assume dead, session should still be pending
    const canResolve = factory.forceResolveSession(handle.id, {
      success: false, exitCode: 1, durationMs: 0,
    });
    expect(canResolve).toBe(true);
  });

  test("session without resolver is skipped gracefully", async () => {
    const factory = new ITermSessionFactory(mockClient, {
      watchTimeoutMs: 10000,
      createWorktree: mockCreateWorktree,
    });

    // Session that was never created through this factory
    const session = makeDispatchedSession({ id: "unknown-session" });

    // Should not throw
    await factory.checkLiveness([session]);
  });

  test("checkLiveness detects claude process as alive", async () => {
    const psOutput = "ARGS\nclaude --dangerously-skip-permissions -- /beastmode:plan my-epic\n";
    const ttyClient = createMockIt2Client();
    ttyClient.getSessionTty = async () => "/dev/ttys003";

    const factory = new ITermSessionFactory(ttyClient, {
      watchTimeoutMs: 10000,
      createWorktree: mockCreateWorktree,
      spawn: makeMockSpawn(psOutput),
    });

    const handle = await factory.create(makeOpts());
    const session = makeDispatchedSession({ id: handle.id });

    await factory.checkLiveness([session]);

    // beastmode in args — session is alive
    const canResolve = factory.forceResolveSession(handle.id, {
      success: false, exitCode: 1, durationMs: 0,
    });
    expect(canResolve).toBe(true);
  });
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd cli && bun --bun vitest run src/__tests__/it2-session.test.ts -t "checkLiveness"`
Expected: FAIL — `checkLiveness` does not exist on `ITermSessionFactory`

- [x] **Step 3: Write the implementation**

In `cli/src/dispatch/it2.ts`, add to `ITermSessionFactory`:

1. Add a Map to track dispatch session ID -> pane session ID:
```typescript
private dispatchToPaneId = new Map<string, string>(); // dispatch session ID -> pane session ID
```

2. In `create()`, after computing paneSessionId and before setting up the command, store the mapping:
```typescript
// Map dispatch ID to pane ID for liveness checks
this.dispatchToPaneId.set(id, paneSessionId);
```

3. Add the `checkLiveness` method:
```typescript
async checkLiveness(sessions: import("./types.js").DispatchedSession[]): Promise<void> {
  for (const session of sessions) {
    const paneId = this.dispatchToPaneId.get(session.id);
    if (!paneId) continue;

    const tty = this.ttyMap.get(paneId);
    if (!tty) continue;

    try {
      const proc = this.spawnFn(["ps", "-t", tty, "-o", "args="], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const stdout = proc.stdout
        ? await new Response(proc.stdout as ReadableStream).text()
        : "";
      const exitCode = await proc.exited;

      // ps failure (e.g., TTY gone) — don't assume dead
      if (exitCode !== 0) continue;

      // Check if any process has "beastmode" in its args
      const hasBeastmode = stdout
        .split("\n")
        .some((line) => line.includes("beastmode"));

      if (!hasBeastmode) {
        // Dead session — force-resolve as failed
        this.forceResolveSession(session.id, {
          success: false,
          exitCode: 1,
          durationMs: Date.now() - session.startedAt,
        });
      }
    } catch {
      // ps spawn failure — don't assume dead
      continue;
    }
  }
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/it2-session.test.ts -t "checkLiveness"`
Expected: All PASS

- [x] **Step 5: Run the full test suite**

Run: `cd cli && bun --bun vitest run src/__tests__/it2-session.test.ts`
Expected: All tests PASS

- [x] **Step 6: Commit**

```bash
cd cli && git add src/dispatch/it2.ts src/__tests__/it2-session.test.ts
git commit -m "feat(dead-man-switch): implement checkLiveness on ITermSessionFactory"
```

---

## Task 3: Clean up maps on session completion

**Wave:** 3
**Depends on:** Task 0, Task 1, Task 2

**Files:**
- Modify: `cli/src/dispatch/it2.ts` (cleanup TTY and dispatch-to-pane maps on promise resolution)
- Test: `cli/src/__tests__/it2-session.test.ts`

- [x] **Step 1: Write the failing test**

Add to `cli/src/__tests__/it2-session.test.ts`:

```typescript
test("TTY and dispatch maps are cleaned up after session completes", async () => {
  const ttyClient = createMockIt2Client();
  ttyClient.getSessionTty = async () => "/dev/ttys003";

  const factory = new ITermSessionFactory(ttyClient, {
    watchTimeoutMs: 2000,
    createWorktree: mockCreateWorktree,
  });

  const handle = await factory.create(makeOpts());
  await tick();
  writeOutputJson("my-epic", "plan", { status: "completed", artifacts: {} });
  await handle.promise;

  // After completion, force-resolve should return false (resolver cleaned up)
  const canResolve = factory.forceResolveSession(handle.id, {
    success: false, exitCode: 1, durationMs: 0,
  });
  expect(canResolve).toBe(false);
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/it2-session.test.ts -t "TTY and dispatch maps are cleaned up"`
Expected: FAIL — resolver not cleaned up by normal completion (or it may pass if cleanup already happens in the promise chain)

- [x] **Step 3: Write minimal implementation**

In `cli/src/dispatch/it2.ts`, in the `create()` method's `notifiedPromise` `.then()` callback, after `this.panes.delete(paneKey)`, add cleanup:

```typescript
// Clean up liveness tracking maps
this.ttyMap.delete(paneSessionId);
this.dispatchToPaneId.delete(id);
```

Also add the same cleanup in the `onAbort` handler:

```typescript
const onAbort = async () => {
  this.cleanupWatcher(id);
  this.ttyMap.delete(paneSessionId);
  this.dispatchToPaneId.delete(id);
  this.resolvers.delete(id);
  // ... rest of existing abort handler
};
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd cli && bun --bun vitest run src/__tests__/it2-session.test.ts -t "TTY and dispatch maps are cleaned up"`
Expected: PASS

- [x] **Step 5: Run the full test suite**

Run: `cd cli && bun --bun vitest run src/__tests__/it2-session.test.ts`
Expected: All tests PASS

- [x] **Step 6: Commit**

```bash
cd cli && git add src/dispatch/it2.ts src/__tests__/it2-session.test.ts
git commit -m "feat(dead-man-switch): clean up TTY and dispatch maps on session completion"
```
