# Liveness Engine — Implementation Tasks

## Goal

Add process liveness detection to `ITermSessionFactory`. Three components: TTY acquisition on `It2Client`, external promise resolution on the factory, and a batch `checkLiveness` method that checks whether dispatched processes are still alive by inspecting TTY process trees.

## Architecture

- **Detection method:** Run `ps -t <tty> -o args=` and look for `beastmode` in process args
- **TTY acquisition:** `It2Client.getSessionTty()` calls `it2 session list --json`, finds session by ID, returns `tty` field. Called once at dispatch time.
- **External promise resolution:** Store `watchForMarker` promise's `resolve` callback in a Map keyed by session ID. `checkLiveness` force-resolves dead sessions.
- **Interface:** `checkLiveness?(sessions: DispatchedSession[]): Promise<void>` as optional method on `SessionFactory`
- **Batch-oriented:** Checks all active sessions in a single call
- **No grace period:** If `beastmode` absent from TTY at check time, session is dead

## Tech Stack

- TypeScript, Bun runtime, vitest for tests
- `SpawnFn` injection for testability (same pattern as existing `It2Client`)
- Tests in `cli/src/__tests__/`

## File Structure

- **Modify:** `cli/src/dispatch/it2.ts` — Add `getSessionTty()` to `It2Client` and `IIt2Client`, add TTY storage + external promise resolution + `checkLiveness()` to `ITermSessionFactory`
- **Modify:** `cli/src/dispatch/factory.ts` — Add optional `checkLiveness` method to `SessionFactory` interface
- **Modify:** `cli/src/dispatch/types.ts` — Add `SessionDeadEvent` type to `WatchLoopEventMap`
- **Create:** `cli/src/__tests__/it2-liveness.test.ts` — All liveness engine tests (TTY acquisition, external promise resolution, checkLiveness alive/dead/error)
- **Modify:** `cli/src/__tests__/it2-client.test.ts` — Add `getSessionTty` tests
- **Modify:** `cli/src/__tests__/it2-session.test.ts` — Update mock client to include `getSessionTty`

---

### Task 0: Add `getSessionTty` to `It2Client`

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dispatch/it2.ts:65-76` (IIt2Client interface)
- Modify: `cli/src/dispatch/it2.ts:112-315` (It2Client class)
- Modify: `cli/src/__tests__/it2-client.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `cli/src/__tests__/it2-client.test.ts` a new describe block for `getSessionTty`:

```typescript
describe("getSessionTty", () => {
  test("returns tty for matching session ID", async () => {
    const json = JSON.stringify([
      { id: "sess-1", name: "Tab 1", tab_id: "w0t0", tty: "/dev/ttys003" },
      { id: "sess-2", name: "Tab 2", tab_id: "w0t1", tty: "/dev/ttys004" },
    ]);
    const { client } = clientOk(json);

    const result = await client.getSessionTty("sess-1");
    expect(result).toBe("/dev/ttys003");
  });

  test("returns null when session ID not found", async () => {
    const json = JSON.stringify([
      { id: "sess-1", name: "Tab 1", tab_id: "w0t0", tty: "/dev/ttys003" },
    ]);
    const { client } = clientOk(json);

    const result = await client.getSessionTty("nonexistent");
    expect(result).toBeNull();
  });

  test("returns null when tty field is missing", async () => {
    const json = JSON.stringify([
      { id: "sess-1", name: "Tab 1", tab_id: "w0t0" },
    ]);
    const { client } = clientOk(json);

    const result = await client.getSessionTty("sess-1");
    expect(result).toBeNull();
  });

  test("returns null on connection failure", async () => {
    const { client } = clientFail("connection refused");

    const result = await client.getSessionTty("sess-1");
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd cli && bunx vitest run src/__tests__/it2-client.test.ts --reporter verbose 2>&1`
Expected: FAIL — `getSessionTty` is not a function

- [ ] **Step 3: Add `getSessionTty` to `IIt2Client` interface and implement on `It2Client`**

In `cli/src/dispatch/it2.ts`, add to the `IIt2Client` interface:

```typescript
getSessionTty(sessionId: string): Promise<string | null>;
```

Add implementation to `It2Client`:

```typescript
async getSessionTty(sessionId: string): Promise<string | null> {
  try {
    const stdout = await this.exec(["session", "list", "--json"]);
    const parsed = JSON.parse(stdout);
    if (!Array.isArray(parsed)) return null;
    const session = parsed.find(
      (s: Record<string, unknown>) => String(s.id ?? "") === sessionId,
    );
    if (!session) return null;
    const tty = session.tty;
    return typeof tty === "string" && tty.length > 0 ? tty : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd cli && bunx vitest run src/__tests__/it2-client.test.ts --reporter verbose 2>&1`
Expected: PASS — all `getSessionTty` tests green

- [ ] **Step 5: Update mock client in session tests**

In `cli/src/__tests__/it2-session.test.ts`, add `getSessionTty` to `createMockIt2Client`:

```typescript
async getSessionTty(sessionId: string) {
  calls.push({ method: "getSessionTty", args: [sessionId] });
  return null;
},
```

- [ ] **Step 6: Run full it2 test suite**

Run: `cd cli && bunx vitest run src/__tests__/it2-client.test.ts src/__tests__/it2-session.test.ts --reporter verbose 2>&1`
Expected: PASS — all tests green

- [ ] **Step 7: Commit**

```bash
git add cli/src/dispatch/it2.ts cli/src/__tests__/it2-client.test.ts cli/src/__tests__/it2-session.test.ts
git commit -m "feat(liveness): add getSessionTty to It2Client"
```

---

### Task 1: Add optional `checkLiveness` to `SessionFactory` interface and `SessionDeadEvent` type

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dispatch/factory.ts:176-184`
- Modify: `cli/src/dispatch/types.ts:107-120`

- [ ] **Step 1: Add `checkLiveness` to `SessionFactory` interface**

In `cli/src/dispatch/factory.ts`, add to the `SessionFactory` interface after `setBadgeOnContainer`:

```typescript
/** Optional liveness check — detects dead sessions and force-resolves their promises. */
checkLiveness?(sessions: import("./types.js").DispatchedSession[]): Promise<void>;
```

- [ ] **Step 2: Add `SessionDeadEvent` type and update `WatchLoopEventMap`**

In `cli/src/dispatch/types.ts`, add before `WatchLoopEventMap`:

```typescript
/** Payload for 'session-dead' event — emitted when a session's process is no longer alive. */
export interface SessionDeadEvent {
  epicSlug: string;
  phase: string;
  featureSlug?: string;
  sessionId: string;
  tty: string;
}
```

Add to `WatchLoopEventMap`:

```typescript
'session-dead': [SessionDeadEvent];
```

- [ ] **Step 3: Verify build compiles**

Run: `cd cli && bunx tsc --noEmit 2>&1`
Expected: No errors (new types are additive, no consumers yet)

- [ ] **Step 4: Commit**

```bash
git add cli/src/dispatch/factory.ts cli/src/dispatch/types.ts
git commit -m "feat(liveness): add checkLiveness to SessionFactory interface and SessionDeadEvent type"
```

---

### Task 2: Add TTY storage and external promise resolution to `ITermSessionFactory`

**Wave:** 2
**Depends on:** Task 0, Task 1

**Files:**
- Modify: `cli/src/dispatch/it2.ts:425-840` (ITermSessionFactory)
- Create: `cli/src/__tests__/it2-liveness.test.ts`

- [ ] **Step 1: Write the failing tests for TTY capture and external promise resolution**

Create `cli/src/__tests__/it2-liveness.test.ts`:

```typescript
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import { ITermSessionFactory } from "../dispatch/it2";
import type { IIt2Client, It2Session } from "../dispatch/it2";
import type { SessionCreateOpts } from "../dispatch/factory";

const TEST_ROOT = resolve(import.meta.dirname, "../../.test-it2-liveness");

const mockCreateWorktree = async (slug: string, opts: { cwd: string }) => ({
  path: resolve(opts.cwd, ".claude", "worktrees", slug),
});

let sessionIdCounter = 0;

function createMockIt2Client(opts?: {
  sessions?: It2Session[];
  ttyMap?: Map<string, string>;
}): IIt2Client & {
  calls: Array<{ method: string; args: unknown[] }>;
} {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const existingSessions = opts?.sessions ?? [];
  const ttyMap = opts?.ttyMap ?? new Map<string, string>();

  return {
    calls,
    async ping() {
      calls.push({ method: "ping", args: [] });
      return true;
    },
    async listSessions() {
      calls.push({ method: "listSessions", args: [] });
      return existingSessions;
    },
    async listTabs() {
      calls.push({ method: "listTabs", args: [] });
      return [];
    },
    async createTab() {
      const id = `tab-${++sessionIdCounter}`;
      calls.push({ method: "createTab", args: [] });
      return id;
    },
    async splitPane(sessionId: string) {
      const id = `pane-${++sessionIdCounter}`;
      calls.push({ method: "splitPane", args: [sessionId] });
      return id;
    },
    async closeSession(sessionId: string) {
      calls.push({ method: "closeSession", args: [sessionId] });
    },
    async sendText(sessionId: string, text: string) {
      calls.push({ method: "sendText", args: [sessionId, text] });
    },
    async setBadge(sessionId: string, text: string) {
      calls.push({ method: "setBadge", args: [sessionId, text] });
    },
    async setTabTitle(sessionId: string, title: string) {
      calls.push({ method: "setTabTitle", args: [sessionId, title] });
    },
    async getSessionProperty(sessionId: string, property: string) {
      calls.push({ method: "getSessionProperty", args: [sessionId, property] });
      return "";
    },
    async getSessionTty(sessionId: string) {
      calls.push({ method: "getSessionTty", args: [sessionId] });
      return ttyMap.get(sessionId) ?? null;
    },
  };
}

function makeOpts(overrides?: Partial<SessionCreateOpts>): SessionCreateOpts {
  return {
    epicSlug: "my-epic",
    phase: "implement",
    args: ["my-epic"],
    projectRoot: TEST_ROOT,
    signal: new AbortController().signal,
    ...overrides,
  };
}

function writeOutputJson(
  worktreeSlug: string,
  phase: string,
  output: { status: string; artifacts: Record<string, unknown> },
  outputSlug?: string,
): void {
  const dir = resolve(
    TEST_ROOT,
    ".claude",
    "worktrees",
    worktreeSlug,
    ".beastmode",
    "artifacts",
    phase,
  );
  mkdirSync(dir, { recursive: true });
  const slug = outputSlug ?? worktreeSlug;
  const filename = `2026-04-04-${slug}.output.json`;
  writeFileSync(resolve(dir, filename), JSON.stringify(output));
}

const tick = () => new Promise<void>((r) => setTimeout(r, 5));

describe("ITermSessionFactory — liveness engine", () => {
  let mockClient: ReturnType<typeof createMockIt2Client>;

  beforeEach(() => {
    sessionIdCounter = 0;
    if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true });
    mkdirSync(TEST_ROOT, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true });
  });

  describe("TTY capture at dispatch time", () => {
    test("calls getSessionTty after creating pane and stores TTY", async () => {
      const ttyMap = new Map([["tab-1", "/dev/ttys003"]]);
      mockClient = createMockIt2Client({ ttyMap });

      const factory = new ITermSessionFactory(mockClient, {
        watchTimeoutMs: 2000,
        createWorktree: mockCreateWorktree,
      });

      const handle = await factory.create(makeOpts());
      await tick();
      writeOutputJson("my-epic", "implement", { status: "completed", artifacts: {} });
      await handle.promise;

      const ttyCalls = mockClient.calls.filter((c) => c.method === "getSessionTty");
      expect(ttyCalls).toHaveLength(1);
      expect(ttyCalls[0].args[0]).toBe("tab-1"); // first pane uses tab session ID
    });

    test("stores TTY for split pane session", async () => {
      const ttyMap = new Map([
        ["tab-1", "/dev/ttys003"],
        ["pane-2", "/dev/ttys004"],
      ]);
      mockClient = createMockIt2Client({ ttyMap });

      const factory = new ITermSessionFactory(mockClient, {
        watchTimeoutMs: 2000,
        createWorktree: mockCreateWorktree,
      });

      // First create uses tab directly
      const h1 = await factory.create(makeOpts({ phase: "plan" }));
      await tick();
      writeOutputJson("my-epic", "plan", { status: "completed", artifacts: {} });
      await h1.promise;

      // Second create splits pane
      const h2 = await factory.create(makeOpts({ phase: "implement" }));
      await tick();
      writeOutputJson("my-epic", "implement", { status: "completed", artifacts: {} });
      await h2.promise;

      const ttyCalls = mockClient.calls.filter((c) => c.method === "getSessionTty");
      expect(ttyCalls).toHaveLength(2);
      expect(ttyCalls[1].args[0]).toBe("pane-2"); // split pane
    });

    test("continues normally when TTY lookup returns null", async () => {
      mockClient = createMockIt2Client(); // no ttyMap — returns null

      const factory = new ITermSessionFactory(mockClient, {
        watchTimeoutMs: 2000,
        createWorktree: mockCreateWorktree,
      });

      const handle = await factory.create(makeOpts());
      await tick();
      writeOutputJson("my-epic", "implement", { status: "completed", artifacts: {} });
      const result = await handle.promise;

      expect(result.success).toBe(true);
    });
  });

  describe("external promise resolution", () => {
    test("forceResolve completes the watchForMarker promise as failed", async () => {
      mockClient = createMockIt2Client();

      const factory = new ITermSessionFactory(mockClient, {
        watchTimeoutMs: 60_000, // long timeout — force-resolve should beat it
        createWorktree: mockCreateWorktree,
      });

      const handle = await factory.create(makeOpts());

      // Force-resolve the session as dead
      const resolved = factory.forceResolve(handle.id, {
        success: false,
        exitCode: 1,
        durationMs: 5000,
      });
      expect(resolved).toBe(true);

      const result = await handle.promise;
      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    test("forceResolve returns false for unknown session ID", async () => {
      mockClient = createMockIt2Client();

      const factory = new ITermSessionFactory(mockClient, {
        watchTimeoutMs: 2000,
        createWorktree: mockCreateWorktree,
      });

      const resolved = factory.forceResolve("nonexistent", {
        success: false,
        exitCode: 1,
        durationMs: 0,
      });
      expect(resolved).toBe(false);
    });

    test("forceResolve is idempotent — second call returns false", async () => {
      mockClient = createMockIt2Client();

      const factory = new ITermSessionFactory(mockClient, {
        watchTimeoutMs: 60_000,
        createWorktree: mockCreateWorktree,
      });

      const handle = await factory.create(makeOpts());

      expect(factory.forceResolve(handle.id, { success: false, exitCode: 1, durationMs: 0 })).toBe(true);
      expect(factory.forceResolve(handle.id, { success: false, exitCode: 1, durationMs: 0 })).toBe(false);

      await handle.promise;
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd cli && bunx vitest run src/__tests__/it2-liveness.test.ts --reporter verbose 2>&1`
Expected: FAIL — `getSessionTty` calls not happening, `forceResolve` not a function

- [ ] **Step 3: Add TTY storage to `ITermSessionFactory`**

In `cli/src/dispatch/it2.ts`, add new private fields to `ITermSessionFactory`:

```typescript
private sessionTtys = new Map<string, string>(); // session id -> TTY device path
private resolvers = new Map<string, (result: SessionResult) => void>(); // session id -> promise resolver
```

In the `create` method, after storing the pane ID (`this.panes.set(paneKey, paneSessionId)`), add TTY lookup:

```typescript
// Capture TTY device path for liveness checks
const tty = await this.client.getSessionTty(paneSessionId);
if (tty) {
  this.sessionTtys.set(id, tty);
}
```

- [ ] **Step 4: Add external promise resolution mechanism**

Modify `watchForMarker` to store the resolve callback. In the `Promise` constructor, right after `resolvePromise` is captured, add storage logic.

Change the `watchForMarker` method to accept an additional parameter for the session ID and store the resolver:

Inside `watchForMarker`, at the start of the `new Promise` callback (after the existing check):

```typescript
// Store resolver for external force-resolution (liveness checks)
this.resolvers.set(sessionId, (result: SessionResult) => {
  cleanup();
  resolvePromise(result);
});
```

And update the existing cleanup paths to also remove the resolver:

In every place where `resolvePromise` is called (existing output found, watcher event, poll found, timeout), also call `this.resolvers.delete(sessionId)`.

Add the public `forceResolve` method:

```typescript
/**
 * Force-resolve a session's watchForMarker promise from outside.
 * Used by checkLiveness to complete promises for dead sessions.
 * Returns true if the session was found and resolved, false otherwise.
 */
forceResolve(sessionId: string, result: SessionResult): boolean {
  const resolver = this.resolvers.get(sessionId);
  if (!resolver) return false;
  this.resolvers.delete(sessionId);
  resolver(result);
  return true;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd cli && bunx vitest run src/__tests__/it2-liveness.test.ts --reporter verbose 2>&1`
Expected: PASS — TTY capture and external promise resolution tests green

- [ ] **Step 6: Run full test suite to check no regressions**

Run: `cd cli && bunx vitest run src/__tests__/it2-session.test.ts src/__tests__/it2-client.test.ts src/__tests__/it2-liveness.test.ts --reporter verbose 2>&1`
Expected: PASS — all tests green

- [ ] **Step 7: Commit**

```bash
git add cli/src/dispatch/it2.ts cli/src/__tests__/it2-liveness.test.ts
git commit -m "feat(liveness): add TTY storage and external promise resolution to ITermSessionFactory"
```

---

### Task 3: Implement `checkLiveness` on `ITermSessionFactory`

**Wave:** 3
**Depends on:** Task 2

**Files:**
- Modify: `cli/src/dispatch/it2.ts` (ITermSessionFactory — add checkLiveness, add SpawnFn field)
- Modify: `cli/src/__tests__/it2-liveness.test.ts` (add checkLiveness tests)

- [ ] **Step 1: Write the failing tests for checkLiveness**

Add to `cli/src/__tests__/it2-liveness.test.ts` a new describe block inside the main describe:

```typescript
describe("checkLiveness", () => {
  test("identifies alive session — beastmode process on TTY", async () => {
    const ttyMap = new Map([["tab-1", "/dev/ttys003"]]);
    const psOutput = "ARGS\n/usr/local/bin/bun /path/to/beastmode implement my-epic\n-fish\n";
    mockClient = createMockIt2Client({ ttyMap });

    const mockSpawn: SpawnFn = () => mockProc(psOutput, "", 0);

    const factory = new ITermSessionFactory(mockClient, {
      watchTimeoutMs: 60_000,
      createWorktree: mockCreateWorktree,
      spawn: mockSpawn,
    });

    const handle = await factory.create(makeOpts());

    // Build a mock DispatchedSession
    const session: DispatchedSession = {
      id: handle.id,
      epicSlug: "my-epic",
      phase: "implement",
      worktreeSlug: "my-epic",
      abortController: new AbortController(),
      promise: handle.promise,
      startedAt: Date.now(),
    };

    await factory.checkLiveness([session]);

    // Session should still be alive — forceResolve should NOT have been called
    // Verify by checking the resolver is still in the map (session not yet resolved)
    const stillResolvable = factory.forceResolve(handle.id, { success: true, exitCode: 0, durationMs: 0 });
    expect(stillResolvable).toBe(true);

    // Clean up — resolve the promise so it doesn't hang
    await handle.promise;
  });

  test("identifies dead session — no beastmode process on TTY", async () => {
    const ttyMap = new Map([["tab-1", "/dev/ttys003"]]);
    const psOutput = "ARGS\n-fish\nlogin -pf user\n";
    mockClient = createMockIt2Client({ ttyMap });

    const mockSpawn: SpawnFn = () => mockProc(psOutput, "", 0);

    const factory = new ITermSessionFactory(mockClient, {
      watchTimeoutMs: 60_000,
      createWorktree: mockCreateWorktree,
      spawn: mockSpawn,
    });

    const handle = await factory.create(makeOpts());

    const session: DispatchedSession = {
      id: handle.id,
      epicSlug: "my-epic",
      phase: "implement",
      worktreeSlug: "my-epic",
      abortController: new AbortController(),
      promise: handle.promise,
      startedAt: Date.now(),
    };

    await factory.checkLiveness([session]);

    // Session should be dead — promise resolved as failed
    const result = await handle.promise;
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  test("skips sessions without stored TTY", async () => {
    mockClient = createMockIt2Client(); // no ttyMap — no TTYs stored

    const mockSpawn: SpawnFn = () => {
      throw new Error("ps should not be called for sessions without TTY");
    };

    const factory = new ITermSessionFactory(mockClient, {
      watchTimeoutMs: 60_000,
      createWorktree: mockCreateWorktree,
      spawn: mockSpawn,
    });

    const handle = await factory.create(makeOpts());

    const session: DispatchedSession = {
      id: handle.id,
      epicSlug: "my-epic",
      phase: "implement",
      worktreeSlug: "my-epic",
      abortController: new AbortController(),
      promise: handle.promise,
      startedAt: Date.now(),
    };

    // Should not throw — just skips
    await factory.checkLiveness([session]);

    // Should still be resolvable (not force-resolved)
    const stillResolvable = factory.forceResolve(handle.id, { success: true, exitCode: 0, durationMs: 0 });
    expect(stillResolvable).toBe(true);
    await handle.promise;
  });

  test("handles ps command failure gracefully — session not marked dead", async () => {
    const ttyMap = new Map([["tab-1", "/dev/ttys003"]]);
    mockClient = createMockIt2Client({ ttyMap });

    const mockSpawn: SpawnFn = () => mockProc("", "ps: Device not configured", 1);

    const factory = new ITermSessionFactory(mockClient, {
      watchTimeoutMs: 60_000,
      createWorktree: mockCreateWorktree,
      spawn: mockSpawn,
    });

    const handle = await factory.create(makeOpts());

    const session: DispatchedSession = {
      id: handle.id,
      epicSlug: "my-epic",
      phase: "implement",
      worktreeSlug: "my-epic",
      abortController: new AbortController(),
      promise: handle.promise,
      startedAt: Date.now(),
    };

    await factory.checkLiveness([session]);

    // Session should NOT be killed — ps failure is not evidence of death
    const stillResolvable = factory.forceResolve(handle.id, { success: true, exitCode: 0, durationMs: 0 });
    expect(stillResolvable).toBe(true);
    await handle.promise;
  });

  test("handles multiple sessions in batch", async () => {
    const ttyMap = new Map([
      ["tab-1", "/dev/ttys003"],
      ["pane-2", "/dev/ttys004"],
    ]);
    mockClient = createMockIt2Client({ ttyMap });

    let callCount = 0;
    const mockSpawn: SpawnFn = () => {
      callCount++;
      if (callCount === 1) {
        // First session alive
        return mockProc("ARGS\nbun beastmode implement\n", "", 0);
      }
      // Second session dead
      return mockProc("ARGS\n-fish\n", "", 0);
    };

    const factory = new ITermSessionFactory(mockClient, {
      watchTimeoutMs: 60_000,
      createWorktree: mockCreateWorktree,
      spawn: mockSpawn,
    });

    // Create two sessions
    const h1 = await factory.create(makeOpts({ phase: "plan" }));
    const h2 = await factory.create(makeOpts({ phase: "implement" }));

    const sessions: DispatchedSession[] = [
      {
        id: h1.id,
        epicSlug: "my-epic",
        phase: "plan",
        worktreeSlug: "my-epic",
        abortController: new AbortController(),
        promise: h1.promise,
        startedAt: Date.now(),
      },
      {
        id: h2.id,
        epicSlug: "my-epic",
        phase: "implement",
        worktreeSlug: "my-epic",
        abortController: new AbortController(),
        promise: h2.promise,
        startedAt: Date.now(),
      },
    ];

    await factory.checkLiveness(sessions);

    // First session should still be alive
    const h1Resolvable = factory.forceResolve(h1.id, { success: true, exitCode: 0, durationMs: 0 });
    expect(h1Resolvable).toBe(true);
    await h1.promise;

    // Second session should be dead
    const result = await h2.promise;
    expect(result.success).toBe(false);
  });

  test("matches both bun and claude processes with beastmode in args", async () => {
    const ttyMap = new Map([["tab-1", "/dev/ttys003"]]);
    mockClient = createMockIt2Client({ ttyMap });

    const psOutput = "ARGS\nclaude --dangerously-skip-permissions -- /beastmode:implement my-epic\n";
    const mockSpawn: SpawnFn = () => mockProc(psOutput, "", 0);

    const factory = new ITermSessionFactory(mockClient, {
      watchTimeoutMs: 60_000,
      createWorktree: mockCreateWorktree,
      spawn: mockSpawn,
    });

    const handle = await factory.create(makeOpts());

    const session: DispatchedSession = {
      id: handle.id,
      epicSlug: "my-epic",
      phase: "implement",
      worktreeSlug: "my-epic",
      abortController: new AbortController(),
      promise: handle.promise,
      startedAt: Date.now(),
    };

    await factory.checkLiveness([session]);

    // Should be alive — claude process has beastmode in args
    const stillResolvable = factory.forceResolve(handle.id, { success: true, exitCode: 0, durationMs: 0 });
    expect(stillResolvable).toBe(true);
    await handle.promise;
  });
});
```

Also add these imports at the top of the file:

```typescript
import type { SpawnFn } from "../dispatch/it2";
import type { DispatchedSession } from "../dispatch/types";
```

And add this helper (same pattern as it2-client.test.ts):

```typescript
function mockProc(
  stdout: string,
  stderr: string,
  exitCode: number,
): ReturnType<SpawnFn> {
  return {
    stdout: new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode(stdout));
        c.close();
      },
    }),
    stderr: new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode(stderr));
        c.close();
      },
    }),
    exited: Promise.resolve(exitCode),
  };
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd cli && bunx vitest run src/__tests__/it2-liveness.test.ts --reporter verbose 2>&1`
Expected: FAIL — `checkLiveness` is not a function, constructor doesn't accept `spawn`

- [ ] **Step 3: Implement `checkLiveness` on `ITermSessionFactory`**

Add `SpawnFn` to the constructor options and store it:

```typescript
private spawn: SpawnFn;
```

In constructor, add:
```typescript
this.spawn = opts?.spawn ?? ((cmd, spawnOpts) => Bun.spawn(cmd, spawnOpts));
```

Update the constructor opts type to include `spawn?: SpawnFn`.

Add the `checkLiveness` method:

```typescript
async checkLiveness(sessions: import("./types.js").DispatchedSession[]): Promise<void> {
  for (const session of sessions) {
    const tty = this.sessionTtys.get(session.id);
    if (!tty) continue; // no TTY stored — can't check

    // Check if resolver still exists (session not already resolved)
    if (!this.resolvers.has(session.id)) continue;

    try {
      const proc = this.spawn(["ps", "-t", tty, "-o", "args="], {
        stdout: "pipe",
        stderr: "pipe",
      });

      const stdout = proc.stdout
        ? await new Response(proc.stdout as ReadableStream).text()
        : "";
      const exitCode = await proc.exited;

      // ps failure (e.g., TTY gone) is NOT evidence of death — skip
      if (exitCode !== 0) continue;

      // Check if any process has "beastmode" in its args
      const hasBeastmode = stdout
        .split("\n")
        .some((line) => line.includes("beastmode"));

      if (!hasBeastmode) {
        // Dead session — force-resolve as failed
        this.forceResolve(session.id, {
          success: false,
          exitCode: 1,
          durationMs: Date.now() - session.startedAt,
        });
      }
    } catch {
      // spawn failure — skip, don't kill
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd cli && bunx vitest run src/__tests__/it2-liveness.test.ts --reporter verbose 2>&1`
Expected: PASS — all checkLiveness tests green

- [ ] **Step 5: Run full test suite**

Run: `cd cli && bunx vitest run --reporter verbose 2>&1`
Expected: PASS — all tests green, no regressions

- [ ] **Step 6: Commit**

```bash
git add cli/src/dispatch/it2.ts cli/src/__tests__/it2-liveness.test.ts
git commit -m "feat(liveness): implement checkLiveness on ITermSessionFactory"
```
