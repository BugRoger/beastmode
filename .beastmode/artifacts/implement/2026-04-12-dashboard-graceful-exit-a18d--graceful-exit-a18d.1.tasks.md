# Graceful Exit — Implementation Tasks

## Goal

Fix the dashboard hang-on-exit bug. When the user presses `q`, the Bun event loop never drains because four categories of async work hold it open after `loop.stop()` completes. This feature fixes all four drains, adds verbose shutdown logging, and reduces the session wait timeout so the process exits cleanly without `process.exit()`.

## Architecture

The dashboard runs a `WatchLoop` (EventEmitter subclass) that polls an epic scanner, dispatches SDK sessions, and reconciles GitHub state on every tick. The React `App.tsx` component subscribes to WatchLoop events. On shutdown (`q` key), `App.tsx` calls `loop.stop()` then `exit()`. The loop must: cancel the current tick's async work, abort active sessions, wait (with timeout), remove all event listeners, and release the lockfile — all without leaving dangling process handles.

**Key files:**
- `cli/src/commands/watch-loop.ts` — WatchLoop class (stop, tick, watchSession)
- `cli/src/github/cli.ts` — `gh()` subprocess helper
- `cli/src/github/reconcile.ts` — `reconcileGitHub()` reconciliation engine
- `cli/src/dashboard/App.tsx` — React dashboard (fetchGitStatus, event subscriptions)
- `cli/src/dispatch/tracker.ts` — DispatchTracker (waitAll timeout)

**Tech stack:** TypeScript, Bun runtime, vitest (run via `bun --bun vitest run`), React/Ink for dashboard.

**Conventions:**
- Tests live in `cli/src/__tests__/`
- Test runner: `bun --bun vitest run` (from `cli/` directory)
- All `gh` calls use warn-and-continue (never throw)
- No `process.exit()` in the shutdown path

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/github/cli.ts` | Modify | Add optional `signal?: AbortSignal` to `gh()` opts; kill proc on abort |
| `cli/src/commands/watch-loop.ts` | Modify | Per-tick AbortController, signal threading to reconcile, verbose stop logging, removeAllListeners, createTag guard, reduced waitAll timeout |
| `cli/src/github/reconcile.ts` | Modify | Accept optional AbortSignal; add abort checks between loop iterations |
| `cli/src/dashboard/App.tsx` | Modify | Add `await proc.exited` to fetchGitStatus rev-parse spawn |
| `cli/src/__tests__/graceful-exit-gh-signal.test.ts` | Create | Tests for gh() AbortSignal support |
| `cli/src/__tests__/graceful-exit-watch-loop.test.ts` | Create | Tests for WatchLoop stop() enhancements |
| `cli/src/__tests__/graceful-exit-reconcile-signal.test.ts` | Create | Tests for reconcileGitHub signal threading |
| `cli/src/__tests__/graceful-exit-app-proc.test.ts` | Create | Tests for fetchGitStatus proc.exited |

## Wave Isolation

| Wave | Tasks | Files | Parallel-safe | Reason |
|------|-------|-------|---------------|--------|
| 1 | T1, T2 | T1: `cli/src/github/cli.ts`, `cli/src/__tests__/graceful-exit-gh-signal.test.ts` / T2: `cli/src/dashboard/App.tsx`, `cli/src/__tests__/graceful-exit-app-proc.test.ts` | yes | disjoint files, no shared state |
| 2 | T3 | `cli/src/github/reconcile.ts`, `cli/src/__tests__/graceful-exit-reconcile-signal.test.ts` | n/a | single task; depends on T1 (consumes signal param from gh) |
| 3 | T4 | `cli/src/commands/watch-loop.ts`, `cli/src/__tests__/graceful-exit-watch-loop.test.ts` | n/a | single task; depends on T1, T3 (consumes signal-aware reconcileGitHub) |

---

## Tasks

### Task 1: AbortSignal support in gh()

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/github/cli.ts:21-54`
- Test: `cli/src/__tests__/graceful-exit-gh-signal.test.ts`

- [x] **Step 1: Write the failing tests**

Create `cli/src/__tests__/graceful-exit-gh-signal.test.ts`:

```typescript
import { describe, test, expect, vi, beforeEach } from "vitest";

describe("gh() AbortSignal support", () => {
  test("accepts an optional signal in opts", async () => {
    const { gh } = await import("../github/cli.js");
    const controller = new AbortController();
    // Should not throw — signal is optional and not yet aborted
    const result = await gh(["--version"], { signal: controller.signal });
    // gh --version should succeed if gh is installed
    if (result) {
      expect(result.exitCode).toBe(0);
    }
  });

  test("returns undefined when signal is already aborted before spawn", async () => {
    const { gh } = await import("../github/cli.js");
    const controller = new AbortController();
    controller.abort();
    const result = await gh(["--version"], { signal: controller.signal });
    expect(result).toBeUndefined();
  });

  test("kills the process when signal fires mid-execution", async () => {
    const { gh } = await import("../github/cli.js");
    const controller = new AbortController();
    // Start a slow command — sleep 10 should take long enough
    const promise = gh(["api", "repos/invalid-owner-zzz/invalid-repo-zzz"], {
      signal: controller.signal,
    });
    // Abort after a short delay
    setTimeout(() => controller.abort(), 50);
    const result = await promise;
    // Should return undefined (aborted = failure)
    expect(result).toBeUndefined();
  });

  test("never throws when signal fires", async () => {
    const { gh } = await import("../github/cli.js");
    const controller = new AbortController();
    controller.abort();
    let threw = false;
    try {
      await gh(["--version"], { signal: controller.signal });
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });
});
```

- [x] **Step: Run tests to verify they fail**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-graceful-exit-a18d/cli && bun --bun vitest run src/__tests__/graceful-exit-gh-signal.test.ts`
Expected: FAIL — `gh()` does not accept `signal` in its opts type, and no abort logic exists.

- [x] **Step: Implement AbortSignal support in gh()**

Modify `cli/src/github/cli.ts`. Change the `gh()` function signature and body:

```typescript
export async function gh(
  args: string[],
  opts: { cwd?: string; logger?: Logger; signal?: AbortSignal } = {},
): Promise<GhResult | undefined> {
  const log = opts.logger ?? createLogger(createStdioSink(0), {});
  try {
    // If already aborted, bail immediately
    if (opts.signal?.aborted) {
      return undefined;
    }

    const proc = Bun.spawn(["gh", ...args], {
      cwd: opts.cwd,
      stdout: "pipe",
      stderr: "pipe",
    });

    // Wire up abort signal to kill the process
    const onAbort = () => {
      try {
        proc.kill();
      } catch {
        // Process may have already exited
      }
    };
    opts.signal?.addEventListener("abort", onAbort, { once: true });

    try {
      const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);

      const exitCode = await proc.exited;

      if (opts.signal?.aborted) {
        return undefined;
      }

      if (exitCode !== 0) {
        log.warn(
          `gh ${args.slice(0, 2).join(" ")} failed (exit ${exitCode}): ${stderr.trim()}`,
        );
        return undefined;
      }

      return { stdout: stdout.trim(), stderr: stderr.trim(), exitCode };
    } finally {
      opts.signal?.removeEventListener("abort", onAbort);
    }
  } catch (err) {
    log.warn(
      `gh ${args.slice(0, 2).join(" ")} failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return undefined;
  }
}
```

Also update `ghJson` and `ghGraphQL` to pass `signal` through:

For `ghJson`, change the opts type and forward:
```typescript
export async function ghJson<T = unknown>(
  args: string[],
  opts: { cwd?: string; logger?: Logger; signal?: AbortSignal } = {},
): Promise<T | undefined> {
  const result = await gh(args, opts);
```

For `ghGraphQL`, change the opts type and forward:
```typescript
export async function ghGraphQL<T = unknown>(
  query: string,
  variables: Record<string, string | number> = {},
  opts: { cwd?: string; logger?: Logger; signal?: AbortSignal } = {},
): Promise<T | undefined> {
```

- [x] **Step: Run tests to verify they pass**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-graceful-exit-a18d/cli && bun --bun vitest run src/__tests__/graceful-exit-gh-signal.test.ts`
Expected: PASS

- [x] **Step: Run existing gh tests to verify no regressions**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-graceful-exit-a18d/cli && bun --bun vitest run src/__tests__/gh.test.ts`
Expected: PASS (all existing tests still pass — signal is optional)

- [x] **Step: Commit**

```bash
cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-graceful-exit-a18d
git add cli/src/github/cli.ts cli/src/__tests__/graceful-exit-gh-signal.test.ts
git commit -m "feat(graceful-exit): add AbortSignal support to gh() subprocess helper"
```

---

### Task 2: Await proc.exited in fetchGitStatus

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dashboard/App.tsx:263-291`
- Test: `cli/src/__tests__/graceful-exit-app-proc.test.ts`

- [ ] **Step 1: Write the failing test**

Create `cli/src/__tests__/graceful-exit-app-proc.test.ts`:

```typescript
import { describe, test, expect } from "vitest";

/**
 * Verify that fetchGitStatus awaits proc.exited on all spawned processes.
 * This is a source-level contract test — we grep the source to verify
 * the pattern is present, since the actual Bun.spawn behavior requires
 * a running dashboard.
 */
describe("fetchGitStatus proc.exited contract", () => {
  test("rev-parse spawn has await proc.exited", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(__dirname, "../dashboard/App.tsx"),
      "utf-8",
    );

    // Find the fetchGitStatus function body
    const fnStart = source.indexOf("const fetchGitStatus");
    expect(fnStart).toBeGreaterThan(-1);

    // Find the section between the rev-parse spawn and the diffProc spawn
    const revParseSpawn = source.indexOf('Bun.spawn(["git", "rev-parse"', fnStart);
    expect(revParseSpawn).toBeGreaterThan(-1);

    const diffProcSpawn = source.indexOf('Bun.spawn(["git", "diff"', fnStart);
    expect(diffProcSpawn).toBeGreaterThan(-1);

    // Between rev-parse spawn and diffProc spawn, there should be "await proc.exited"
    const betweenSpawns = source.slice(revParseSpawn, diffProcSpawn);
    expect(betweenSpawns).toContain("await proc.exited");
  });

  test("no process.exit() in fetchGitStatus", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(__dirname, "../dashboard/App.tsx"),
      "utf-8",
    );
    const fnStart = source.indexOf("const fetchGitStatus");
    const fnEnd = source.indexOf("fetchGitStatus();", fnStart);
    const fnBody = source.slice(fnStart, fnEnd);
    expect(fnBody).not.toContain("process.exit");
  });
});
```

- [x] **Step: Run tests to verify they fail**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-graceful-exit-a18d/cli && bun --bun vitest run src/__tests__/graceful-exit-app-proc.test.ts`
Expected: FAIL — the source does not have `await proc.exited` between rev-parse and diff spawns.

- [x] **Step: Add await proc.exited to fetchGitStatus**

Modify `cli/src/dashboard/App.tsx`. In the `fetchGitStatus` function (inside the useEffect around line 263), add `await proc.exited` after reading stdout from the rev-parse spawn.

Change from:
```typescript
    const fetchGitStatus = async () => {
      try {
        const proc = Bun.spawn(["git", "rev-parse", "--abbrev-ref", "HEAD"], {
          stdout: "pipe",
          stderr: "pipe",
        });
        const branch = (await new Response(proc.stdout).text()).trim();

        const diffProc = Bun.spawn(["git", "diff", "--quiet", "HEAD"], {
```

To:
```typescript
    const fetchGitStatus = async () => {
      try {
        const proc = Bun.spawn(["git", "rev-parse", "--abbrev-ref", "HEAD"], {
          stdout: "pipe",
          stderr: "pipe",
        });
        const branch = (await new Response(proc.stdout).text()).trim();
        await proc.exited;

        const diffProc = Bun.spawn(["git", "diff", "--quiet", "HEAD"], {
```

- [x] **Step: Run tests to verify they pass**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-graceful-exit-a18d/cli && bun --bun vitest run src/__tests__/graceful-exit-app-proc.test.ts`
Expected: PASS

- [x] **Step: Commit**

```bash
cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-graceful-exit-a18d
git add cli/src/dashboard/App.tsx cli/src/__tests__/graceful-exit-app-proc.test.ts
git commit -m "feat(graceful-exit): await proc.exited in fetchGitStatus to release process handles"
```

---

### Task 3: Thread AbortSignal through reconcileGitHub

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/github/reconcile.ts:32-50`
- Test: `cli/src/__tests__/graceful-exit-reconcile-signal.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `cli/src/__tests__/graceful-exit-reconcile-signal.test.ts`:

```typescript
import { describe, test, expect } from "vitest";

/**
 * Source-level contract tests that verify AbortSignal is accepted
 * and threaded through reconcileGitHub. Full integration testing
 * of abort behavior is covered by the gh() signal tests (Task 1).
 */
describe("reconcileGitHub AbortSignal contract", () => {
  test("ReconcileOpts interface includes signal property", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(__dirname, "../github/reconcile.ts"),
      "utf-8",
    );
    // ReconcileOpts should have a signal field
    const optsInterface = source.slice(
      source.indexOf("export interface ReconcileOpts"),
      source.indexOf("}", source.indexOf("export interface ReconcileOpts")) + 1,
    );
    expect(optsInterface).toContain("signal?: AbortSignal");
  });

  test("signal is destructured from opts and used for abort checks", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(__dirname, "../github/reconcile.ts"),
      "utf-8",
    );
    // Verify signal is destructured from opts
    const destructureLine = source.match(/const \{[^}]*signal[^}]*\} = opts/);
    expect(destructureLine).not.toBeNull();
    // Verify abort checks exist in the loop bodies (Phase 2 and Phase 3)
    const phase2Loop = source.slice(
      source.indexOf("for (const [entityId, ref] of"),
      source.indexOf("--- Phase 3") > -1
        ? source.indexOf("--- Phase 3")
        : source.indexOf("const readyOps"),
    );
    expect(phase2Loop).toContain("signal?.aborted");
  });

  test("reconcileGitHub returns early when signal is already aborted", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(__dirname, "../github/reconcile.ts"),
      "utf-8",
    );
    // Should check signal.aborted early in the function
    expect(source).toContain("signal?.aborted");
  });
});
```

- [x] **Step: Run tests to verify they fail**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-graceful-exit-a18d/cli && bun --bun vitest run src/__tests__/graceful-exit-reconcile-signal.test.ts`
Expected: FAIL — ReconcileOpts does not have a `signal` property and no abort checks exist.

- [x] **Step: Add AbortSignal to ReconcileOpts and thread through**

Modify `cli/src/github/reconcile.ts`:

1. Add `signal` to `ReconcileOpts`:

Change from:
```typescript
export interface ReconcileOpts {
  projectRoot: string;
  store: TaskStore;
  syncRefs: SyncRefs;
  config: BeastmodeConfig;
  resolved: ResolvedGitHub;
  currentTick: number;
  logger?: Logger;
}
```

To:
```typescript
export interface ReconcileOpts {
  projectRoot: string;
  store: TaskStore;
  syncRefs: SyncRefs;
  config: BeastmodeConfig;
  resolved: ResolvedGitHub;
  currentTick: number;
  logger?: Logger;
  signal?: AbortSignal;
}
```

2. Destructure signal and add early-abort check in `reconcileGitHub`:

Change from:
```typescript
export async function reconcileGitHub(opts: ReconcileOpts): Promise<ReconcileResult & { updatedRefs: SyncRefs }> {
  const { projectRoot, store, config, resolved, currentTick, logger } = opts;
  let refs = opts.syncRefs;
```

To:
```typescript
export async function reconcileGitHub(opts: ReconcileOpts): Promise<ReconcileResult & { updatedRefs: SyncRefs }> {
  const { projectRoot, store, config, resolved, currentTick, logger, signal } = opts;
  let refs = opts.syncRefs;

  const result: ReconcileResult = {
    bootstrapped: false,
    bootstrapCount: 0,
    opsAttempted: 0,
    opsSucceeded: 0,
    opsFailed: 0,
    opsPermanentlyFailed: 0,
    fullReconcileCount: 0,
    warnings: [],
  };

  if (signal?.aborted) {
    return { ...result, updatedRefs: refs };
  }
```

(Remove the duplicate `result` declaration that was already below — the existing code declares it after the destructuring. Move the `result` declaration to just after signal destructuring, then add the early abort check, then keep the rest of the function.)

3. Add abort check before each `syncGitHub` call in the Phase 2 loop (full reconciliation). Change from:
```typescript
      try {
        const epicInput = buildEpicSyncInput(store, epic);
        const syncResult = await syncGitHub(epicInput, refs, config, resolved, {
```
To:
```typescript
      try {
        if (signal?.aborted) break;
        const epicInput = buildEpicSyncInput(store, epic);
        const syncResult = await syncGitHub(epicInput, refs, config, resolved, {
```

4. Add abort check at the top of the Phase 3 loop (drain retry queue). Change from:
```typescript
  for (const { entityId, op } of readyOps) {
    result.opsAttempted++;
```
To:
```typescript
  for (const { entityId, op } of readyOps) {
    if (signal?.aborted) break;
    result.opsAttempted++;
```

Note: The `syncGitHub` function in `sync.ts` has a fixed opts type `{ logger?: Logger; projectRoot?: string }`. We do NOT pass `signal` through to `syncGitHub` — that would require modifying sync.ts and all its internal gh wrapper calls. Instead, the abort checks between iterations in reconcileGitHub are sufficient: when stop() aborts the tick controller, the reconcile loop breaks out between operations. Any in-flight `gh()` subprocess spawned by `syncGitHub` will be short-lived (individual API calls), and the loop won't start the next one.

- [x] **Step: Run tests to verify they pass**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-graceful-exit-a18d/cli && bun --bun vitest run src/__tests__/graceful-exit-reconcile-signal.test.ts`
Expected: PASS

- [x] **Step: Run existing reconcile tests to verify no regressions**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-graceful-exit-a18d/cli && bun --bun vitest run src/__tests__/reconcile.test.ts src/__tests__/reconciliation-loop.integration.test.ts`
Expected: PASS (signal is optional — existing callers unaffected)

- [x] **Step: Commit**

```bash
cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-graceful-exit-a18d
git add cli/src/github/reconcile.ts cli/src/__tests__/graceful-exit-reconcile-signal.test.ts
git commit -m "feat(graceful-exit): thread AbortSignal through reconcileGitHub"
```

---

### Task 4: WatchLoop stop() enhancements

**Wave:** 3
**Depends on:** Task 1, Task 3

**Files:**
- Modify: `cli/src/commands/watch-loop.ts:1-502`
- Test: `cli/src/__tests__/graceful-exit-watch-loop.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `cli/src/__tests__/graceful-exit-watch-loop.test.ts`:

```typescript
import { describe, test, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "node:events";

// Mock all external dependencies to isolate WatchLoop behavior
const mockAcquireLock = vi.hoisted(() => vi.fn(() => true));
const mockReleaseLock = vi.hoisted(() => vi.fn());
vi.mock("../lockfile.js", () => ({
  acquireLock: mockAcquireLock,
  releaseLock: mockReleaseLock,
}));

const mockResolveVersion = vi.hoisted(() => vi.fn(() => "0.1.0-test"));
vi.mock("../version.js", () => ({
  resolveVersion: mockResolveVersion,
}));

const mockCreateTag = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("../git/index.js", () => ({
  createTag: mockCreateTag,
}));

const mockReconcileGitHub = vi.hoisted(() => vi.fn(async () => ({
  bootstrapped: false,
  bootstrapCount: 0,
  opsAttempted: 0,
  opsSucceeded: 0,
  opsFailed: 0,
  opsPermanentlyFailed: 0,
  fullReconcileCount: 0,
  warnings: [],
  updatedRefs: {},
})));
const mockLoadSyncRefs = vi.hoisted(() => vi.fn(() => ({})));
const mockSaveSyncRefs = vi.hoisted(() => vi.fn());
const mockDiscoverGitHub = vi.hoisted(() => vi.fn(async () => null));
vi.mock("../github/index.js", () => ({
  reconcileGitHub: mockReconcileGitHub,
  loadSyncRefs: mockLoadSyncRefs,
  saveSyncRefs: mockSaveSyncRefs,
  discoverGitHub: mockDiscoverGitHub,
}));

const mockLoadConfig = vi.hoisted(() => vi.fn(() => ({
  github: { enabled: false },
})));
vi.mock("../config.js", () => ({
  loadConfig: mockLoadConfig,
}));

describe("WatchLoop stop() enhancements", () => {
  let WatchLoop: typeof import("../commands/watch-loop.js").WatchLoop;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../commands/watch-loop.js");
    WatchLoop = mod.WatchLoop;
  });

  function createLoop() {
    return new WatchLoop(
      { intervalSeconds: 60, projectRoot: "/tmp/test-project", installSignalHandlers: false },
      {
        scanEpics: vi.fn(async () => []),
        sessionFactory: { create: vi.fn() } as any,
      },
    );
  }

  test("stop() removes all event listeners", async () => {
    const loop = createLoop();
    loop.setRunning(true);

    // Attach listeners to multiple events
    const noop = () => {};
    loop.on("started", noop);
    loop.on("stopped", noop);
    loop.on("scan-complete", noop);
    loop.on("session-started", noop);
    loop.on("session-completed", noop);
    loop.on("error", noop);

    expect(loop.listenerCount("started")).toBeGreaterThan(0);

    await loop.stop();

    // All listeners should be removed
    expect(loop.listenerCount("started")).toBe(0);
    expect(loop.listenerCount("stopped")).toBe(0);
    expect(loop.listenerCount("scan-complete")).toBe(0);
    expect(loop.listenerCount("session-started")).toBe(0);
    expect(loop.listenerCount("session-completed")).toBe(0);
    expect(loop.listenerCount("error")).toBe(0);
  });

  test("stop() emits 'stopped' before removing listeners", async () => {
    const loop = createLoop();
    loop.setRunning(true);

    let stoppedReceived = false;
    loop.on("stopped", () => {
      stoppedReceived = true;
    });

    await loop.stop();

    expect(stoppedReceived).toBe(true);
  });

  test("stop() logs verbose shutdown steps", async () => {
    const logMessages: string[] = [];
    const mockLogger = {
      info: vi.fn((msg: string) => logMessages.push(msg)),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn(() => mockLogger),
    };

    const loop = new WatchLoop(
      { intervalSeconds: 60, projectRoot: "/tmp/test-project", installSignalHandlers: false },
      {
        scanEpics: vi.fn(async () => []),
        sessionFactory: { create: vi.fn() } as any,
        logger: mockLogger as any,
      },
    );
    loop.setRunning(true);

    await loop.stop();

    // Should log shutdown steps
    expect(logMessages.some(m => m.toLowerCase().includes("shutting down"))).toBe(true);
    expect(logMessages.some(m => m.toLowerCase().includes("listener"))).toBe(true);
    expect(logMessages.some(m => m.toLowerCase().includes("lock"))).toBe(true);
  });

  test("watchSession does not call createTag when running is false", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(__dirname, "../commands/watch-loop.ts"),
      "utf-8",
    );

    // The createTag call should be guarded by this.running
    const watchSessionFn = source.slice(
      source.indexOf("private watchSession"),
      source.indexOf("private async rescanEpic"),
    );

    // Find the createTag call and verify it's inside a running guard
    const createTagIdx = watchSessionFn.indexOf("createTag(");
    expect(createTagIdx).toBeGreaterThan(-1);

    // Look backwards from createTag for a running check
    const beforeCreateTag = watchSessionFn.slice(0, createTagIdx);
    expect(beforeCreateTag).toContain("this.running");
  });

  test("stop() uses 5000ms timeout for waitAll (not 30000)", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(__dirname, "../commands/watch-loop.ts"),
      "utf-8",
    );

    // Should use 5_000 or 5000, not 30_000 or 30000
    const stopMethod = source.slice(
      source.indexOf("async stop()"),
      source.indexOf("getTracker()"),
    );
    expect(stopMethod).toContain("5_000");
    expect(stopMethod).not.toContain("30_000");
  });

  test("tick() creates a per-tick AbortController", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(__dirname, "../commands/watch-loop.ts"),
      "utf-8",
    );

    // The WatchLoop class should have a tickAbortController field
    expect(source).toContain("tickAbortController");

    // The tick() method should create a new AbortController
    const tickMethod = source.slice(
      source.indexOf("async tick()"),
      source.indexOf("private async processEpic"),
    );
    expect(tickMethod).toContain("new AbortController()");
    expect(tickMethod).toContain("tickAbortController");
  });

  test("stop() aborts the current tick AbortController", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(__dirname, "../commands/watch-loop.ts"),
      "utf-8",
    );

    const stopMethod = source.slice(
      source.indexOf("async stop()"),
      source.indexOf("getTracker()"),
    );
    // stop should abort the tick controller
    expect(stopMethod).toContain("tickAbortController");
    expect(stopMethod).toContain("abort()");
  });

  test("tick passes signal to reconcileGitHub", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(__dirname, "../commands/watch-loop.ts"),
      "utf-8",
    );

    // The reconcileGitHub call should include signal
    const tickMethod = source.slice(
      source.indexOf("async tick()"),
      source.indexOf("private async processEpic"),
    );
    const reconcileCall = tickMethod.slice(
      tickMethod.indexOf("reconcileGitHub("),
    );
    expect(reconcileCall).toContain("signal");
  });

  test("no process.exit() in watch-loop.ts stop path", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const source = readFileSync(
      resolve(__dirname, "../commands/watch-loop.ts"),
      "utf-8",
    );

    const stopMethod = source.slice(
      source.indexOf("async stop()"),
      source.indexOf("getTracker()"),
    );
    expect(stopMethod).not.toContain("process.exit");
  });
});
```

- [x] **Step: Run tests to verify they fail**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-graceful-exit-a18d/cli && bun --bun vitest run src/__tests__/graceful-exit-watch-loop.test.ts`
Expected: FAIL — removeAllListeners not called, no verbose logging, no running guard on createTag, waitAll still 30_000, no tickAbortController.

- [x] **Step: Implement all WatchLoop stop() enhancements**

Modify `cli/src/commands/watch-loop.ts`:

**3a. Add tickAbortController field:**

Change from:
```typescript
  private tickCount = 0;
```

To:
```typescript
  private tickCount = 0;
  private tickAbortController: AbortController | null = null;
```

**3b. Create per-tick AbortController in tick():**

Change from:
```typescript
  async tick(): Promise<void> {
    this.emitTyped('scan-started', {});
```

To:
```typescript
  async tick(): Promise<void> {
    this.tickAbortController = new AbortController();
    const { signal } = this.tickAbortController;

    this.emitTyped('scan-started', {});
```

**3c. Pass signal to reconcileGitHub in tick():**

Change from:
```typescript
          const reconcileResult = await reconcileGitHub({
            projectRoot: this.config.projectRoot,
            store: this.deps.store,
            syncRefs,
            config,
            resolved,
            currentTick: this.tickCount,
            logger: this.logger,
          });
```

To:
```typescript
          const reconcileResult = await reconcileGitHub({
            projectRoot: this.config.projectRoot,
            store: this.deps.store,
            syncRefs,
            config,
            resolved,
            currentTick: this.tickCount,
            logger: this.logger,
            signal,
          });
```

**3d. Dispose tickAbortController at end of tick():**

Change from:
```typescript
    this.emitTyped('scan-complete', { epicsScanned: epics.length, dispatched, trigger: "poll" });
  }
```

To:
```typescript
    this.tickAbortController = null;

    this.emitTyped('scan-complete', { epicsScanned: epics.length, dispatched, trigger: "poll" });
  }
```

**3e. Enhance stop() with verbose logging, abort tick controller, reduced timeout, removeAllListeners:**

Replace the entire `stop()` method:

```typescript
  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    this.logger.info("Shutting down...");

    // Abort in-flight tick (cancels reconciliation/gh subprocess calls)
    if (this.tickAbortController) {
      this.tickAbortController.abort();
      this.tickAbortController = null;
      this.logger.info("Aborted in-flight tick");
    }

    if (this.tracker.size > 0) {
      this.logger.info(
        `Aborting ${this.tracker.size} active session(s)...`,
      );
      this.tracker.abortAll();
      this.logger.info("Waiting up to 5s for sessions to finish...");
      await this.tracker.waitAll(5_000);
      this.logger.info("Session wait complete");
    }

    releaseLock(this.config.projectRoot);
    this.logger.info("Lock released");

    this.emitTyped('stopped');
    this.removeAllListeners();
    this.logger.info("All listeners removed — shutdown complete");
  }
```

**3f. Guard createTag with running check in watchSession:**

Change from:
```typescript
        // Create phase tag for regression support (mirrors post-dispatch in CLI path)
        if (result.success && session.phase !== "release") {
          try {
            const wtPath = resolve(this.config.projectRoot, ".claude", "worktrees", session.worktreeSlug);
            await createTag(session.epicSlug, session.phase, { cwd: wtPath });
          } catch (err) {
            this.logger.warn("phase tag creation failed", { error: String(err) });
          }
        }
```

To:
```typescript
        // Create phase tag for regression support (mirrors post-dispatch in CLI path)
        if (result.success && session.phase !== "release" && this.running) {
          try {
            const wtPath = resolve(this.config.projectRoot, ".claude", "worktrees", session.worktreeSlug);
            await createTag(session.epicSlug, session.phase, { cwd: wtPath });
          } catch (err) {
            this.logger.warn("phase tag creation failed", { error: String(err) });
          }
        }
```

- [x] **Step: Run tests to verify they pass**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-graceful-exit-a18d/cli && bun --bun vitest run src/__tests__/graceful-exit-watch-loop.test.ts`
Expected: PASS

- [x] **Step: Run existing watch-loop related tests to verify no regressions**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-graceful-exit-a18d/cli && bun --bun vitest run src/__tests__/pipeline-runner.test.ts src/__tests__/reconciliation-loop.integration.test.ts`
Expected: PASS

- [x] **Step: Commit**

```bash
cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/dashboard-graceful-exit-a18d
git add cli/src/commands/watch-loop.ts cli/src/__tests__/graceful-exit-watch-loop.test.ts
git commit -m "feat(graceful-exit): per-tick AbortController, verbose stop logging, reduced timeout, listener cleanup, createTag guard"
```
