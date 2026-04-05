# Command Cleanup — Implementation Tasks

## Goal

Delete the watch and status CLI commands, extract `ReconcilingFactory` from `watch.ts` to `dispatch/reconciling.ts`, rewire `dashboard.ts` and `index.ts`, and clean up broken test imports.

## Architecture

- **ReconcilingFactory** wraps any `SessionFactory` with post-dispatch pipeline handling via `runPipeline()`
- Dashboard is the sole pipeline UI — watch and status commands are removed
- iTerm2 is the sole dispatch mechanism — no strategy selection

## Tech Stack

- Bun runtime (TypeScript executed directly, no build step)
- Vitest for unit tests
- Cucumber.js for integration tests

## File Structure

**Create:**
- `cli/src/dispatch/reconciling.ts` — ReconcilingFactory class extracted from watch.ts

**Modify:**
- `cli/src/commands/dashboard.ts` — import ReconcilingFactory from new location
- `cli/src/index.ts` — remove watch/status command routing and help text
- `cli/src/__tests__/reconciling-factory-cleanup.test.ts` — update import to new location
- `cli/features/support/dashboard-dispatch-world.ts` — remove watch.ts imports, inline StrategySelection type or remove
- `cli/features/support/spring-cleaning-world.ts` — no changes needed (uses safeRead)

**Delete:**
- `cli/src/commands/watch.ts` — watch command (ReconcilingFactory extracted first)
- `cli/src/commands/status.ts` — status command
- `cli/src/commands/WatchTreeApp.tsx` — Ink tree app for watch TUI
- `cli/src/commands/watch-tree-subscriber.ts` — event subscriber for watch tree
- `cli/src/__tests__/watch-integration.test.ts` — tests parseWatchArgs from watch.ts
- `cli/src/__tests__/watch-tree-app.test.ts` — tests WatchTreeApp.tsx
- `cli/src/__tests__/watch-tree-subscriber.test.ts` — tests watch-tree-subscriber.ts
- `cli/src/__tests__/change-detect.test.ts` — tests toSnapshots/detectEpicChanges from status.ts
- `cli/features/support/dashboard-dispatch-hooks.ts` — hooks for strategy selection tests
- `cli/features/step_definitions/dashboard-dispatch-fix.steps.ts` — steps for strategy selection tests
- `cli/features/dashboard-dispatch-strategy.feature` — strategy selection feature
- `cli/features/dashboard-cli-fallback-removal.feature` — CLI fallback feature (tests removed dispatchPhase)

---

### Task 0: Extract ReconcilingFactory to dispatch/reconciling.ts

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/src/dispatch/reconciling.ts`

- [x] **Step 1: Create `dispatch/reconciling.ts` with ReconcilingFactory class**

```typescript
/**
 * Reconciling factory — wraps the iTerm2 SessionFactory with the unified pipeline
 * runner for post-dispatch processing. This ensures consistent behavior
 * (reconciliation, GitHub sync, release teardown) without duplicating logic
 * that lives in pipeline/runner.ts.
 */

import { loadConfig } from "../config.js";
import type { Logger } from "../logger.js";
import type { SessionFactory, SessionCreateOpts, SessionHandle } from "./factory.js";
import type { Phase } from "../types.js";
import { run as runPipeline } from "../pipeline/runner.js";
import type { ResolvedGitHub } from "../github/discovery.js";

export class ReconcilingFactory implements SessionFactory {
  private inner: SessionFactory;
  private projectRoot: string;
  private logger: Logger;
  /** Pre-discovered GitHub metadata — set once per scan cycle. */
  resolved?: ResolvedGitHub;

  constructor(inner: SessionFactory, projectRoot: string, logger: Logger) {
    this.inner = inner;
    this.projectRoot = projectRoot;
    this.logger = logger;
  }

  async create(opts: SessionCreateOpts): Promise<SessionHandle> {
    const handle = await this.inner.create(opts);
    const { projectRoot, logger } = this;

    const wrappedPromise = handle.promise.then(async (sessionResult) => {
      const config = loadConfig(projectRoot);
      const scopedLogger = logger.child({
        phase: opts.phase,
        epic: opts.epicSlug,
        ...(opts.featureSlug ? { feature: opts.featureSlug } : {}),
      });

      // Delegate all post-dispatch work (steps 5-9) to the pipeline runner.
      // skipPreDispatch: true  -> skip worktree/rebase/settings (already done)
      // dispatch returns the pre-computed session result immediately.
      const pipelineResult = await runPipeline({
        phase: opts.phase as Phase,
        epicSlug: opts.epicSlug,
        args: opts.args,
        projectRoot,
        strategy: "iterm2",
        featureSlug: opts.featureSlug,
        config,
        logger: scopedLogger,
        resolved: this.resolved,
        skipPreDispatch: true,
        dispatch: async () => ({ success: sessionResult.success }),
      });

      // Release cleanup: close iTerm2 surfaces on success, badge on failure
      if (opts.phase === "release") {
        if (pipelineResult.success) {
          try {
            await this.inner.cleanup?.(opts.epicSlug);
          } catch {
            // Best-effort — surface cleanup should not block the result
          }
        } else {
          try {
            await this.inner.setBadgeOnContainer?.(opts.epicSlug, "ERROR: release failed");
          } catch {
            // Best-effort — badge failure is non-blocking
          }
        }
      }

      return {
        ...sessionResult,
        progress: pipelineResult.reconcileResult?.progress,
      };
    });

    return { ...handle, promise: wrappedPromise };
  }

  async cleanup(epicSlug: string): Promise<void> {
    return this.inner.cleanup?.(epicSlug);
  }
}
```

- [x] **Step 2: Verify file compiles**

Run: `bun build --no-bundle cli/src/dispatch/reconciling.ts --outdir /tmp/bm-check 2>&1 | head -20`
Expected: PASS (no type errors)

- [x] **Step 3: Commit**

```bash
git add cli/src/dispatch/reconciling.ts
git commit -m "feat(command-cleanup): extract ReconcilingFactory to dispatch/reconciling.ts"
```

---

### Task 1: Rewire dashboard.ts to import from new location

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `cli/src/commands/dashboard.ts`

- [x] **Step 1: Update dashboard.ts import**

Replace line 7:
```typescript
import { ReconcilingFactory } from "./watch.js";
```
With:
```typescript
import { ReconcilingFactory } from "../dispatch/reconciling.js";
```

- [x] **Step 2: Verify file compiles**

Run: `bun build --no-bundle cli/src/commands/dashboard.ts --outdir /tmp/bm-check 2>&1 | head -20`
Expected: PASS

- [x] **Step 3: Commit**

```bash
git add cli/src/commands/dashboard.ts
git commit -m "feat(command-cleanup): rewire dashboard to import ReconcilingFactory from dispatch/"
```

---

### Task 2: Update reconciling-factory-cleanup.test.ts import

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `cli/src/__tests__/reconciling-factory-cleanup.test.ts`

- [x] **Step 1: Update the dynamic import path**

Replace line 121:
```typescript
const { ReconcilingFactory } = await import("../commands/watch.js");
```
With:
```typescript
const { ReconcilingFactory } = await import("../dispatch/reconciling.js");
```

- [x] **Step 2: Verify test runs**

Run: `cd cli && bun --bun vitest run src/__tests__/reconciling-factory-cleanup.test.ts 2>&1 | tail -20`
Expected: All tests pass

- [x] **Step 3: Commit**

```bash
git add cli/src/__tests__/reconciling-factory-cleanup.test.ts
git commit -m "feat(command-cleanup): update reconciling test import to dispatch/reconciling"
```

---

### Task 3: Update index.ts — remove watch and status commands

**Wave:** 2
**Depends on:** -

**Files:**
- Modify: `cli/src/index.ts`

- [x] **Step 1: Remove watch and status imports**

Remove lines 7-8:
```typescript
import { watchCommand } from "./commands/watch";
import { statusCommand } from "./commands/status";
```

- [x] **Step 2: Remove watch and status from switch statement**

Remove from the switch block:
```typescript
    case "watch":
      await watchCommand(args, verbosity);
      break;
    case "status":
      await statusCommand(config, args, verbosity);
      break;
```

- [x] **Step 3: Update help text**

Remove these two lines from the help string:
```
  beastmode watch                      Autonomous pipeline orchestration
  beastmode status [--all] [--watch|-w] Show pipeline status
```

- [x] **Step 4: Commit**

```bash
git add cli/src/index.ts
git commit -m "feat(command-cleanup): remove watch and status from CLI router and help"
```

---

### Task 4: Delete watch command files and dead test files

**Wave:** 3
**Depends on:** Task 1, Task 2, Task 3

**Files:**
- Delete: `cli/src/commands/watch.ts`
- Delete: `cli/src/commands/status.ts`
- Delete: `cli/src/commands/WatchTreeApp.tsx`
- Delete: `cli/src/commands/watch-tree-subscriber.ts`
- Delete: `cli/src/__tests__/watch-integration.test.ts`
- Delete: `cli/src/__tests__/watch-tree-app.test.ts`
- Delete: `cli/src/__tests__/watch-tree-subscriber.test.ts`
- Delete: `cli/src/__tests__/change-detect.test.ts`

- [x] **Step 1: Delete the command files**

```bash
git rm cli/src/commands/watch.ts
git rm cli/src/commands/status.ts
git rm cli/src/commands/WatchTreeApp.tsx
git rm cli/src/commands/watch-tree-subscriber.ts
```

- [x] **Step 2: Delete the dead test files**

```bash
git rm cli/src/__tests__/watch-integration.test.ts
git rm cli/src/__tests__/watch-tree-app.test.ts
git rm cli/src/__tests__/watch-tree-subscriber.test.ts
git rm cli/src/__tests__/change-detect.test.ts
```

- [x] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(command-cleanup): delete watch, status, WatchTreeApp, tree-subscriber, and dead tests"
```

---

### Task 5: Clean up cucumber feature files referencing deleted code

**Wave:** 3
**Depends on:** Task 3

**Files:**
- Delete: `cli/features/support/dashboard-dispatch-hooks.ts`
- Delete: `cli/features/step_definitions/dashboard-dispatch-fix.steps.ts`
- Delete: `cli/features/dashboard-dispatch-strategy.feature`
- Delete: `cli/features/dashboard-cli-fallback-removal.feature`
- Modify: `cli/features/support/dashboard-dispatch-world.ts` — remove watch.ts imports and selectStrategy methods

- [x] **Step 1: Delete cucumber files that test removed functionality**

```bash
git rm cli/features/support/dashboard-dispatch-hooks.ts
git rm cli/features/step_definitions/dashboard-dispatch-fix.steps.ts
git rm cli/features/dashboard-dispatch-strategy.feature
git rm cli/features/dashboard-cli-fallback-removal.feature
```

- [x] **Step 2: Clean up dashboard-dispatch-world.ts**

Remove the import of `StrategySelection` from watch.ts (line 11).
Remove the `StrategySelection` type references and `selectStrategy`-related properties and methods.
Remove `watchStrategyResult`, `watchStrategyError`, `cmuxAvailable`, `watchSource`, `dispatchPhaseSource` properties.
Remove `getSelectStrategy()`, `resolveStrategy()`, `dashboardUsesSelectStrategy()`, `hasCliFallback()` methods.
Remove the `setup()` lines that read `watch.ts` and set `dispatchPhaseSource`.

The surviving methods (`hasVerbosityCycling`, `keyboardHandlesVKey`, `keyHintsShowVerbosity`, `verbosityName`, `setVerbosityByName`, `cycleVerbosity`) test dashboard UI features that still exist.

Resulting file should import only from surviving modules (no watch.js reference).

- [x] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(command-cleanup): delete strategy selection cucumber files, clean dispatch world"
```

---

### Task 6: Run full test suite and verify

**Wave:** 4
**Depends on:** Task 4, Task 5

**Files:**
- (verification only — no file changes expected)

- [x] **Step 1: Run vitest**

Run: `cd cli && bun --bun vitest run 2>&1 | tail -30`
Expected: All tests pass, no import errors

- [x] **Step 2: Run cucumber (if applicable)**

Run: `cd cli && bun --bun node_modules/.bin/cucumber-js 2>&1 | tail -30`
Expected: No failures from deleted imports

- [x] **Step 3: Check for any remaining broken imports**

Run: `grep -r "from.*commands/watch" cli/src/ --include="*.ts" --include="*.tsx" | grep -v node_modules`
Run: `grep -r "from.*commands/status" cli/src/ --include="*.ts" --include="*.tsx" | grep -v node_modules`
Expected: No matches

- [x] **Step 4: Commit any fixes if needed**

If tests reveal additional broken imports, fix them and commit.
