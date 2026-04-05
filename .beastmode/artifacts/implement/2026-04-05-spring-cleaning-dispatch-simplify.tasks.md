# Implementation: dispatch-simplify

## Goal

Remove cmux dispatch, SDK dispatch logic, and associated infrastructure from the codebase. Simplify to iTerm2-only dispatch. Keep SessionFactory interface with one implementation for extensibility.

## Architecture

- **Delete entire files:** `dispatch/cmux.ts`, `pipeline/startup.ts`
- **Strip SDK types from `dispatch/factory.ts`:** SdkSessionFactory, RingBuffer, SessionEmitter, SessionStreamEvents, SdkContentBlock types. Preserve LogEntry, SessionFactory, SessionCreateOpts, SessionHandle (minus `events` field), runInteractive, InteractiveRunnerOptions.
- **Strip `events` field** from DispatchedSession in `dispatch/types.ts`
- **Remove DispatchStrategy type and dispatch-strategy config key** from `config.ts`
- **Narrow DispatchStrategy** in `pipeline/runner.ts` to `"interactive" | "iterm2"` (remove `"sdk"` and `"cmux"`)
- **Simplify dashboard hook:** `use-dashboard-tree-state.ts` — remove SessionEmitter usage, remove events subscription
- **Simplify dashboard.ts and watch.ts:** remove cmux/SDK factory branches, remove selectStrategy, hardcode iTerm2
- **Delete test files** for removed code

## Tech Stack

- TypeScript, Bun runtime, React/Ink for dashboard
- Test runner: `bun test` from `cli/` directory

## File Structure

### Files to Delete
- `cli/src/dispatch/cmux.ts` — entire cmux client and session factory
- `cli/src/pipeline/startup.ts` — cmux reconciliation code
- `cli/src/__tests__/cmux-client.test.ts` — cmux client tests
- `cli/src/__tests__/cmux-session.test.ts` — cmux session tests
- `cli/src/__tests__/sdk-dispatch-streaming.test.ts` — SDK streaming tests
- `cli/src/__tests__/sdk-streaming.test.ts` — RingBuffer/SessionEmitter tests
- `cli/src/__tests__/reconcile-startup.test.ts` — startup reconciliation tests
- `cli/src/__tests__/iterm2-strategy.test.ts` — strategy selection tests
- `cli/src/__tests__/status.test.ts` — status command tests
- `cli/src/__tests__/dashboard-strategy.test.ts` — dashboard strategy selection tests

### Files to Modify
- `cli/src/dispatch/factory.ts` — strip SDK types/classes, remove `events` from SessionHandle
- `cli/src/dispatch/types.ts` — remove `events` field and SessionEmitter import from DispatchedSession
- `cli/src/config.ts` — remove DispatchStrategy type, dispatch-strategy config key
- `cli/src/pipeline/runner.ts` — narrow DispatchStrategy to `"interactive" | "iterm2"`, update comments
- `cli/src/dashboard/hooks/use-dashboard-tree-state.ts` — remove SessionEmitter import and events subscription
- `cli/src/commands/dashboard.ts` — remove cmux/SDK imports, remove selectStrategy, hardcode iTerm2
- `cli/src/commands/watch.ts` — remove cmux/SDK imports, remove selectStrategy, simplify factory selection
- `cli/src/__tests__/config.test.ts` — remove dispatch-strategy tests
- `cli/src/__tests__/watch.test.ts` — remove SdkSessionFactory usage, update to use mock SessionFactory

---

### Task 0: Delete dead files (cmux, startup, dead tests)

**Wave:** 1
**Depends on:** -

**Files:**
- Delete: `cli/src/dispatch/cmux.ts`
- Delete: `cli/src/pipeline/startup.ts`
- Delete: `cli/src/__tests__/cmux-client.test.ts`
- Delete: `cli/src/__tests__/cmux-session.test.ts`
- Delete: `cli/src/__tests__/sdk-dispatch-streaming.test.ts`
- Delete: `cli/src/__tests__/sdk-streaming.test.ts`
- Delete: `cli/src/__tests__/reconcile-startup.test.ts`
- Delete: `cli/src/__tests__/iterm2-strategy.test.ts`
- Delete: `cli/src/__tests__/status.test.ts`
- Delete: `cli/src/__tests__/dashboard-strategy.test.ts`

- [ ] **Step 1: Delete all dead files**

```bash
cd cli/src
rm dispatch/cmux.ts
rm pipeline/startup.ts
rm __tests__/cmux-client.test.ts
rm __tests__/cmux-session.test.ts
rm __tests__/sdk-dispatch-streaming.test.ts
rm __tests__/sdk-streaming.test.ts
rm __tests__/reconcile-startup.test.ts
rm __tests__/iterm2-strategy.test.ts
rm __tests__/status.test.ts
rm __tests__/dashboard-strategy.test.ts
```

- [ ] **Step 2: Commit deletions**

```bash
git add -A
git commit -m "feat(dispatch-simplify): delete cmux, SDK streaming, and dead test files"
```

---

### Task 1: Strip SDK types from dispatch/factory.ts

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dispatch/factory.ts`

- [ ] **Step 1: Rewrite factory.ts to keep only LogEntry, SessionFactory, SessionCreateOpts, SessionHandle (no events), runInteractive, InteractiveRunnerOptions**

Replace the entire file with:

```typescript
/**
 * Session factory — abstract dispatch strategy for the watch loop.
 *
 * Single implementation: ITermSessionFactory (in it2.ts).
 * Also includes the interactive runner for manual phase commands.
 */

import type { Phase, PhaseResult } from "../types.js";
import type { SessionResult } from "./types.js";

/** Structured log entry for terminal rendering. */
export interface LogEntry {
  /** Monotonic sequence number within the session */
  seq: number;
  /** Timestamp when the entry was created */
  timestamp: number;
  /** Entry type for rendering dispatch */
  type: "text" | "tool-start" | "tool-result" | "heartbeat" | "result";
  /** Display text — ready to render */
  text: string;
}

/** Options for creating a new session. */
export interface SessionCreateOpts {
  epicSlug: string;
  phase: string;
  args: string[];
  featureSlug?: string;
  projectRoot: string;
  signal: AbortSignal;
}

/** Handle to a dispatched session. */
export interface SessionHandle {
  id: string;
  worktreeSlug: string;
  promise: Promise<SessionResult>;
  /** TTY device path for terminal-dispatched sessions. */
  tty?: string;
}

/**
 * Factory that creates dispatch sessions. The watch loop uses this
 * to dispatch phases without knowing the terminal backend.
 */
export interface SessionFactory {
  create(opts: SessionCreateOpts): Promise<SessionHandle>;

  /** Optional cleanup when an epic is released (e.g., close iTerm2 tab). */
  cleanup?(epicSlug: string): Promise<void>;

  /** Optional badge on the epic-level container (tab) for error signaling. */
  setBadgeOnContainer?(epicSlug: string, text: string): Promise<void>;

  /** Optional liveness check — detects dead sessions and force-resolves their promises. */
  checkLiveness?(sessions: import("./types.js").DispatchedSession[]): Promise<void>;
}

export interface InteractiveRunnerOptions {
  phase: Phase;
  args: string[];
  cwd: string;
}

export async function runInteractive(
  options: InteractiveRunnerOptions,
): Promise<PhaseResult> {
  const { phase, args, cwd } = options;
  const prompt = `/beastmode:${phase} ${args.join(" ")}`.trim();
  const startTime = Date.now();

  const proc = Bun.spawn(
    ["claude", "--dangerously-skip-permissions", "--", prompt],
    {
      cwd,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    },
  );

  let cancelled = false;
  const onSigint = () => {
    cancelled = true;
    proc.kill("SIGINT");
  };
  process.on("SIGINT", onSigint);

  try {
    const exitCode = await proc.exited;
    const durationMs = Date.now() - startTime;

    let exitStatus: PhaseResult["exit_status"];
    if (cancelled) {
      exitStatus = "cancelled";
    } else if (exitCode === 0) {
      exitStatus = "success";
    } else {
      exitStatus = "error";
    }

    return {
      exit_status: exitStatus,
      duration_ms: durationMs,
      session_id: null,
    };
  } finally {
    process.off("SIGINT", onSigint);
  }
}
```

- [ ] **Step 2: Verify no TypeScript errors in factory.ts**

Run: `cd cli && bunx tsc --noEmit src/dispatch/factory.ts 2>&1 | head -20`
Expected: No errors (or only errors from downstream consumers not yet updated)

- [ ] **Step 3: Commit**

```bash
git add cli/src/dispatch/factory.ts
git commit -m "feat(dispatch-simplify): strip SDK types from factory.ts"
```

---

### Task 2: Strip events from dispatch/types.ts

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dispatch/types.ts`

- [ ] **Step 1: Remove SessionEmitter import and events field from DispatchedSession**

Remove line 9 (`import type { SessionEmitter } from "./factory.js";`) entirely.

In the `DispatchedSession` interface, remove these two lines:
```
  /** EventEmitter for live SDK message streaming (undefined for non-SDK sessions). */
  events?: SessionEmitter;
```

- [ ] **Step 2: Commit**

```bash
git add cli/src/dispatch/types.ts
git commit -m "feat(dispatch-simplify): remove events field from DispatchedSession"
```

---

### Task 3: Remove DispatchStrategy from config.ts

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/config.ts`
- Modify: `cli/src/__tests__/config.test.ts`

- [ ] **Step 1: Remove DispatchStrategy type and dispatch-strategy from CliConfig and defaults**

In `config.ts`:
- Delete line 9: `export type DispatchStrategy = "sdk" | "cmux" | "iterm2" | "auto";`
- In `CliConfig` interface, remove: `"dispatch-strategy"?: DispatchStrategy;`
- In `DEFAULT_CONFIG`, change `cli` to: `cli: { interval: 60 },`
- In `loadConfig()`, remove the dispatch-strategy parsing lines (lines 122-123). The `cli` object construction should become:

```typescript
  const cli = {
    interval:
      ((raw.cli as Record<string, unknown>)?.interval as number) ??
      DEFAULT_CONFIG.cli.interval,
  } satisfies CliConfig;
```

- [ ] **Step 2: Remove dispatch-strategy tests from config.test.ts**

Remove the three test blocks:
- "defaults dispatch-strategy to sdk when absent"
- "parses dispatch-strategy from config.yaml"
- "parses dispatch-strategy auto"

- [ ] **Step 3: Run config tests**

Run: `cd cli && bun test src/__tests__/config.test.ts`
Expected: All remaining tests pass

- [ ] **Step 4: Commit**

```bash
git add cli/src/config.ts cli/src/__tests__/config.test.ts
git commit -m "feat(dispatch-simplify): remove DispatchStrategy from config"
```

---

### Task 4: Narrow DispatchStrategy in pipeline/runner.ts

**Wave:** 2
**Depends on:** Task 3

**Files:**
- Modify: `cli/src/pipeline/runner.ts`

- [ ] **Step 1: Narrow DispatchStrategy type and update comments**

Change line 59 from:
```typescript
export type DispatchStrategy = "interactive" | "sdk" | "cmux" | "iterm2";
```
to:
```typescript
export type DispatchStrategy = "interactive" | "iterm2";
```

Update the file-level comment (lines 4, 10) to remove references to "SDK or cmux":
- Line 4: change `dispatch strategy` to just say `run()`
- Line 10: change `dispatch.run             -- Run session (interactive or SDK or cmux or it2)` to `dispatch.run             -- Run session (interactive or iterm2)`

Update the `strategy: "sdk"` on line 91 (inside ReconcilingFactory) to `strategy: "iterm2"`. Wait — that's in watch.ts, not runner.ts. Let me check again.

Actually, looking at the ReconcilingFactory in watch.ts line 91, the `strategy: "sdk"` is passed to `runPipeline()`. This needs to become `"iterm2"` since we're removing "sdk" from the type.

This will be handled in Task 6 (watch.ts changes).

- [ ] **Step 2: Commit**

```bash
git add cli/src/pipeline/runner.ts
git commit -m "feat(dispatch-simplify): narrow DispatchStrategy to interactive | iterm2"
```

---

### Task 5: Simplify dashboard hook (use-dashboard-tree-state.ts)

**Wave:** 2
**Depends on:** Task 1, Task 2

**Files:**
- Modify: `cli/src/dashboard/hooks/use-dashboard-tree-state.ts`

- [ ] **Step 1: Remove SessionEmitter import and SDK events subscription**

In `use-dashboard-tree-state.ts`:

1. Remove `SessionEmitter` from the import on line 3. Keep `LogEntry`:
```typescript
import type { LogEntry } from "../../dispatch/factory.js";
```

2. Remove the entire first `useEffect` block (lines 128-145) that subscribes to `session.events`:
```typescript
  // Subscribe to 'entry' events on each session's emitter for live updates
  useEffect(() => {
    const emitters: SessionEmitter[] = [];
    ...
  }, [filteredSessions.map((s) => s.id).join(",")]);
```

3. In the `getEntries` callback (lines 161-170), remove the `ds?.events?.getBuffer() ?? []` path. Since all entries now come from fallback store, replace with direct fallback lookup:

```typescript
    (session) => {
      if (fallbackEntries) {
        return fallbackEntries.get(session.epicSlug, session.phase, session.featureSlug);
      }
      return [];
    },
```

- [ ] **Step 2: Commit**

```bash
git add cli/src/dashboard/hooks/use-dashboard-tree-state.ts
git commit -m "feat(dispatch-simplify): remove SDK events subscription from dashboard hook"
```

---

### Task 6: Simplify watch.ts and dashboard.ts (remove cmux/SDK, hardcode iTerm2)

**Wave:** 3
**Depends on:** Task 0, Task 1, Task 3, Task 4

**Files:**
- Modify: `cli/src/commands/watch.ts`
- Modify: `cli/src/commands/dashboard.ts`

- [ ] **Step 1: Simplify watch.ts**

In `watch.ts`:

1. Remove imports of SdkSessionFactory, SessionEmitter from factory.js (line 17):
```typescript
// Before:
import { SdkSessionFactory, SessionEmitter } from "../dispatch/factory.js";
// After: remove entirely
```
Keep the import of `SessionFactory, SessionCreateOpts, SessionHandle` as type imports:
```typescript
import type { SessionFactory, SessionCreateOpts, SessionHandle } from "../dispatch/factory.js";
```

2. Remove cmux imports (line 18):
```typescript
// Delete:
import { CmuxSessionFactory, CmuxClient, cmuxAvailable } from "../dispatch/cmux.js";
```

3. Remove `iterm2Available` and `IT2_SETUP_INSTRUCTIONS` from the it2 import if selectStrategy is removed (line 21):
```typescript
// Keep only what's needed:
import { ITermSessionFactory, It2Client } from "../dispatch/it2.js";
```
Wait — `iterm2Available` and `IT2_SETUP_INSTRUCTIONS` are used by `selectStrategy` which is being simplified/removed. Since dashboard.ts also imports `selectStrategy` from watch.ts, we need to either keep it or simplify it.

The plan says to simplify — iTerm2 is the only strategy. So `selectStrategy` should be deleted. The watch command and dashboard command should directly create `ITermSessionFactory`.

Changes to watch.ts:
- Remove `selectStrategy` function entirely (lines 278-323)
- Remove `StrategySelection` type if it exists
- Remove `dispatchPhase` function entirely (lines 132-270) — this is SDK dispatch logic
- Remove `SessionEmitter` usage from dispatchPhase (it creates `new SessionEmitter()`)
- In `watchCommand` (line 333+), replace the strategy selection + factory branching with:

```typescript
  const innerFactory: SessionFactory = new ITermSessionFactory(new It2Client());
  const sessionFactory = new ReconcilingFactory(innerFactory, projectRoot, logger);
```

- In `ReconcilingFactory.create()`, change `strategy: "sdk"` to `strategy: "iterm2"` on line 91.

- Remove unused imports after cleanup: `loadConfig` (if only used in dispatchPhase), `getCategoryProse`, HITL settings imports (if only used in dispatchPhase), `worktree`, `rebase`. Actually `loadConfig` is used in ReconcilingFactory too (line 76). Keep it.

Let me re-examine what watch.ts exports that are used elsewhere:
- `ReconcilingFactory` — used by dashboard.ts
- `dispatchPhase` — used by dashboard.ts
- `selectStrategy` — used by dashboard.ts

After this task: `dispatchPhase` and `selectStrategy` are deleted. Dashboard.ts must also be updated to not use them.

4. Clean up imports in watch.ts — remove everything no longer needed after deleting dispatchPhase and selectStrategy.

- [ ] **Step 2: Simplify dashboard.ts**

In `dashboard.ts`:

1. Remove imports of dispatchPhase, selectStrategy from watch.js:
```typescript
// Before:
import {
  dispatchPhase,
  ReconcilingFactory,
  selectStrategy,
} from "./watch.js";
// After:
import { ReconcilingFactory } from "./watch.js";
```

2. Remove SdkSessionFactory import (line 12):
```typescript
// Delete:
import { SdkSessionFactory } from "../dispatch/factory.js";
```
Keep the type import if needed:
```typescript
import type { SessionFactory } from "../dispatch/factory.js";
```

3. Remove CmuxSessionFactory, CmuxClient import (line 14):
```typescript
// Delete:
import { CmuxSessionFactory, CmuxClient } from "../dispatch/cmux.js";
```

4. Replace the strategy selection block (lines 52-62) with:
```typescript
  const innerFactory: SessionFactory = new ITermSessionFactory(new It2Client());
```

- [ ] **Step 3: Verify build**

Run: `cd cli && bunx tsc --noEmit 2>&1 | head -30`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add cli/src/commands/watch.ts cli/src/commands/dashboard.ts
git commit -m "feat(dispatch-simplify): remove cmux/SDK from watch and dashboard, hardcode iTerm2"
```

---

### Task 7: Update watch.test.ts (remove SdkSessionFactory usage)

**Wave:** 3
**Depends on:** Task 1, Task 6

**Files:**
- Modify: `cli/src/__tests__/watch.test.ts`

- [ ] **Step 1: Replace SdkSessionFactory with inline mock factory**

The watch.test.ts file uses `SdkSessionFactory` extensively to create mock session factories for testing `WatchLoop`. Since `SdkSessionFactory` is deleted, replace all instances with an inline mock that implements `SessionFactory`.

Pattern — replace:
```typescript
sessionFactory: new SdkSessionFactory(async (opts) => ({
  id: "...",
  worktreeSlug: "...",
  promise: Promise.resolve({ ... }),
}))
```

with:
```typescript
sessionFactory: {
  create: async (opts) => ({
    id: "...",
    worktreeSlug: "...",
    promise: Promise.resolve({ ... }),
  }),
}
```

Remove the import: `import { SdkSessionFactory } from "../dispatch/factory.js";`

- [ ] **Step 2: Run watch tests**

Run: `cd cli && bun test src/__tests__/watch.test.ts`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add cli/src/__tests__/watch.test.ts
git commit -m "feat(dispatch-simplify): replace SdkSessionFactory with mock in watch tests"
```

---

### Task 8: Update wave-dispatch.test.ts

**Wave:** 3
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/__tests__/wave-dispatch.test.ts`

- [ ] **Step 1: Replace SdkSessionFactory with inline mock factory**

Same pattern as Task 7. Remove the import and replace `new SdkSessionFactory(async (opts) => ...)` with `{ create: async (opts) => ... }`.

- [ ] **Step 2: Run wave-dispatch tests**

Run: `cd cli && bun test src/__tests__/wave-dispatch.test.ts`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add cli/src/__tests__/wave-dispatch.test.ts
git commit -m "feat(dispatch-simplify): replace SdkSessionFactory with mock in wave-dispatch tests"
```

---

### Task 9: Full build and test verification

**Wave:** 4
**Depends on:** Task 4, Task 5, Task 6, Task 7, Task 8

**Files:**
- All modified files (read-only verification)

- [ ] **Step 1: TypeScript build check**

Run: `cd cli && bunx tsc --noEmit 2>&1`
Expected: No errors

- [ ] **Step 2: Run full test suite**

Run: `cd cli && bun test 2>&1`
Expected: All tests pass

- [ ] **Step 3: Verify no phantom imports of deleted modules**

```bash
cd cli/src && grep -r "dispatch/cmux" --include="*.ts" .
cd cli/src && grep -r "pipeline/startup" --include="*.ts" .
cd cli/src && grep -r "SdkSessionFactory\|SessionEmitter\|RingBuffer" --include="*.ts" .
```
Expected: No matches (except possibly in comment/docs which are acceptable)
