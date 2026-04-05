# Call Site Migration — Implementation Tasks

## Goal

Migrate all ~84 existing log call sites across the CLI codebase to the new 4-level Logger interface (info/debug/warn/error) with structured data support. Update all `createLogger` call sites to use the sink-based API. Migrate remaining `console.error` calls. Reclassify the watch-loop "State scan failed" call from error to warn.

## Architecture

- **Logger interface**: `{ info, debug, warn, error, child }` — defined in `cli/src/logger.ts`
- **createLogger(sink, context?)**: factory takes a `LogSink`, not verbosity
- **createStdioSink(verbosity)**: creates a sink that handles verbosity gating
- **createNullLogger()**: no-op logger for cases where no logger is available
- **Level mapping**: log→info, detail→debug, trace→debug, debug→debug, warn→warn, error→error
- **Structured data**: `data?: Record<string, unknown>` on all Logger methods

## Tech Stack

- TypeScript, Bun runtime
- Test runner: `bun:test`

## File Structure

**Modify: `cli/src/tree-view/tree-logger.ts`** — Update TreeLogger class to implement new 4-level Logger interface (remove log/detail/trace, add info, route all to sink via LogEntry)

**Modify: `cli/src/dashboard/dashboard-logger.ts`** — Update createDashboardLogger to return new 4-level Logger interface (remove log/detail/trace, add info)

**Modify: `cli/src/commands/watch-loop.ts`** — Replace this.logger.log→info, fix "State scan failed" error→warn

**Modify: `cli/src/commands/watch.ts`** — Replace logger.log→info, update createLogger calls to use sink API

**Modify: `cli/src/pipeline/runner.ts`** — Replace logger.log→info, logger.detail→debug, update createLogger fallback

**Modify: `cli/src/commands/phase.ts`** — Replace logger.log→info, update createLogger call

**Modify: `cli/src/commands/cancel-logic.ts`** — Replace logger.log→info, logger.detail→debug

**Modify: `cli/src/commands/cancel.ts`** — Replace logger.log→info, update createLogger call

**Modify: `cli/src/commands/compact.ts`** — Replace logger.log→info, console.error→createNullLogger().error, update createLogger call

**Modify: `cli/src/args.ts`** — Replace console.error calls with process.stderr.write (bootstrap path, no logger available)

**Modify: `cli/src/index.ts`** — Update createLogger call to use sink API

**Modify: `cli/src/lockfile.ts`** — Update createLogger fallback to use sink API

**Modify: `cli/src/github/cli.ts`** — Update createLogger fallbacks to use sink API

**Modify: `cli/src/github/discovery.ts`** — Update createLogger fallback to use sink API

**Modify: `cli/src/manifest/store.ts`** — Update inline createLogger call to use sink API

**Modify: `cli/src/pipeline/startup.ts`** — Replace logger.log→info, update createLogger fallback

**Modify: `cli/src/commands/dashboard.ts`** — No log→info needed (uses dashboardLogger), but verify compatibility

**Modify: `cli/src/__tests__/tree-logger.test.ts`** — Update tests for new 4-level interface

**Modify: `cli/src/__tests__/logger.test.ts`** — Fix unused import warning

**Modify: `cli/src/__tests__/cancel.test.ts`** — Update mock logger to new interface

**Modify: `cli/src/__tests__/keyboard-nav.test.ts`** — Update mock logger to new interface

**Modify: `cli/src/__tests__/reconciling-factory-cleanup.test.ts`** — Update createLogger call

**Modify: `cli/src/__tests__/tree-format.test.ts`** — Replace "detail"/"trace" LogLevel references

**Modify: `cli/src/__tests__/tree-view.test.ts`** — Replace "detail"/"trace" LogLevel references

**Modify: `cli/src/__tests__/verbosity.test.ts`** — Replace "detail"/"trace" level references

**Modify: `cli/src/__tests__/use-tree-state.test.ts`** — Replace logger.log→info

---

### Task 0: Update TreeLogger to new 4-level interface

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/tree-view/tree-logger.ts`

- [ ] **Step 1: Update TreeLogger class**

Replace the 6-method implementation with the 4-level interface. The TreeLogger implements Logger, so it needs `info`, `debug`, `warn`, `error`, `child`. Remove `log`, `detail`, `trace`. Since TreeLogger is a sink-like construct (routes to tree state), keep verbosity gating internal but map to new levels.

```typescript
import type { Logger, LogLevel, LogContext } from "../logger.js";
import type { TreeState } from "./types.js";
import { addEntry } from "./tree-state.js";

export class TreeLogger implements Logger {
  private state: TreeState;
  private verbosity: number;
  private context: LogContext;
  private notify: (() => void) | undefined;

  constructor(
    state: TreeState,
    verbosity: number,
    context?: LogContext,
    notify?: () => void,
  ) {
    this.state = state;
    this.verbosity = verbosity;
    this.context = context ?? {};
    this.notify = notify;
  }

  private emit(level: LogLevel, msg: string): void {
    addEntry(this.state, level, this.context, msg);
    this.notify?.();
  }

  info(msg: string): void {
    this.emit("info", msg);
  }

  debug(msg: string): void {
    if (this.verbosity >= 1) this.emit("debug", msg);
  }

  warn(msg: string): void {
    this.emit("warn", msg);
  }

  error(msg: string): void {
    this.emit("error", msg);
  }

  child(ctx: Partial<LogContext>): Logger {
    return new TreeLogger(
      this.state,
      this.verbosity,
      { ...this.context, ...ctx },
      this.notify,
    );
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles for this file**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/logging-cleanup/cli && bunx tsc --noEmit src/tree-view/tree-logger.ts 2>&1 | head -10`
Expected: No errors for tree-logger.ts

- [ ] **Step 3: Commit**

```bash
git add cli/src/tree-view/tree-logger.ts
git commit -m "feat(call-site-migration): update TreeLogger to 4-level interface"
```

---

### Task 1: Update DashboardLogger to new 4-level interface

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dashboard/dashboard-logger.ts`

- [ ] **Step 1: Update createDashboardLogger**

Replace 6-method return object with 4-level interface. Remove `log`, `detail`, `trace`. Add `info`. The `route` function stays as-is since it takes a LogLevel.

```typescript
import type { Logger, LogContext, LogLevel } from "../logger.js";
import type { LogEntry } from "../dispatch/factory.js";
import type { FallbackEntryStore } from "./lifecycle-entries.js";

export interface SystemEntryRef {
  entries: { timestamp: number; level: LogLevel; message: string; seq: number }[];
  nextSeq: () => number;
}

export interface DashboardLoggerOptions {
  fallbackStore: FallbackEntryStore;
  systemRef: SystemEntryRef;
  verbosity: number;
  context?: LogContext;
}

export function createDashboardLogger(opts: DashboardLoggerOptions): Logger {
  const { fallbackStore, systemRef, verbosity, context = {} } = opts;

  function route(level: LogLevel, msg: string): void {
    const timestamp = Date.now();

    if (context.epic) {
      const entry: Omit<LogEntry, "seq"> = {
        type: level === "error" || level === "warn" ? "result" : "text",
        timestamp,
        text: msg,
      };
      fallbackStore.push(
        context.epic,
        context.phase ?? "unknown",
        context.feature,
        entry,
      );
    }

    const prefix = context.epic
      ? `[${context.epic}${context.phase ? `/${context.phase}` : ""}] `
      : "";
    systemRef.entries.push({
      timestamp,
      level,
      message: `${prefix}${msg}`,
      seq: systemRef.nextSeq(),
    });
  }

  return {
    info(msg: string) {
      route("info", msg);
    },
    debug(msg: string) {
      if (verbosity >= 1) route("debug", msg);
    },
    warn(msg: string) {
      route("warn", msg);
    },
    error(msg: string) {
      route("error", msg);
    },
    child(childCtx: Partial<LogContext>): Logger {
      return createDashboardLogger({
        fallbackStore,
        systemRef,
        verbosity,
        context: { ...context, ...childCtx },
      });
    },
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add cli/src/dashboard/dashboard-logger.ts
git commit -m "feat(call-site-migration): update DashboardLogger to 4-level interface"
```

---

### Task 2: Migrate createLogger call sites to sink-based API

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/index.ts`
- Modify: `cli/src/commands/phase.ts`
- Modify: `cli/src/commands/cancel.ts`
- Modify: `cli/src/commands/compact.ts`
- Modify: `cli/src/commands/watch.ts`
- Modify: `cli/src/pipeline/runner.ts`
- Modify: `cli/src/pipeline/startup.ts`
- Modify: `cli/src/lockfile.ts`
- Modify: `cli/src/github/cli.ts`
- Modify: `cli/src/github/discovery.ts`
- Modify: `cli/src/manifest/store.ts`

- [ ] **Step 1: Update all createLogger(number, context) → createLogger(createStdioSink(number), context)**

Every call site that does `createLogger(N, {...})` needs to become `createLogger(createStdioSink(N), {...})`.

Add `createStdioSink` to existing imports where `createLogger` is already imported.

Files and exact changes:

**cli/src/index.ts:93** — `createLogger(0, {})` → `createLogger(createStdioSink(0), {})`
Import: add `createStdioSink` to `import { createLogger } from "./logger"`

**cli/src/commands/phase.ts:49** — `createLogger(verbosity, { phase })` → `createLogger(createStdioSink(verbosity), { phase })`
Import: add `createStdioSink` to `import { createLogger } from "../logger"`

**cli/src/commands/cancel.ts:18** — `createLogger(verbosity, {})` → `createLogger(createStdioSink(verbosity), {})`
Import: add `createStdioSink` to `import { createLogger } from "../logger"`

**cli/src/commands/compact.ts:22** — `createLogger(0, { phase: "compact" })` → `createLogger(createStdioSink(0), { phase: "compact" })`
Import: add `createStdioSink` to `import { createLogger } from "../logger"`

**cli/src/commands/watch.ts:284** — default arg `createLogger(0, {})` → `createLogger(createStdioSink(0), {})`
**cli/src/commands/watch.ts:339** — `createLogger(verbosity, {})` → `createLogger(createStdioSink(verbosity), {})`
Import: add `createStdioSink` to `import { createLogger } from "../logger.js"`

**cli/src/pipeline/runner.ts:120** — `createLogger(0, { phase: config.phase, epic: config.epicSlug })` → `createLogger(createStdioSink(0), { phase: config.phase, epic: config.epicSlug })`
Import: add `createStdioSink` to `import { createLogger } from "../logger.js"`

**cli/src/pipeline/startup.ts:169** — `createLogger(0, {})` → `createLogger(createStdioSink(0), {})`
Import: add `createStdioSink` to `import { createLogger } from "../logger.js"`

**cli/src/lockfile.ts:49** — `createLogger(0, {})` → `createLogger(createStdioSink(0), {})`
Import: add `createStdioSink` to `import { createLogger } from "./logger.js"`

**cli/src/github/cli.ts:25** — `createLogger(0, {})` → `createLogger(createStdioSink(0), {})`
**cli/src/github/cli.ts:68** — `createLogger(0, {})` → `createLogger(createStdioSink(0), {})`
**cli/src/github/cli.ts:98** — `createLogger(0, {})` → `createLogger(createStdioSink(0), {})`
Import: add `createStdioSink` to `import { createLogger } from "../logger.js"`

**cli/src/github/discovery.ts:101** — `createLogger(0, {})` → `createLogger(createStdioSink(0), {})`
Import: add `createStdioSink` to `import { createLogger } from "../logger.js"`

**cli/src/manifest/store.ts:355** — `createLogger(0, { phase: "rename" })` → `createLogger(createStdioSink(0), { phase: "rename" })`
Import: add `createStdioSink` to the existing createLogger import in this file

- [ ] **Step 2: Verify TypeScript compiles for the modified files (non-test)**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/logging-cleanup/cli && bunx tsc --noEmit 2>&1 | grep -v __tests__ | head -20`
Expected: No type errors from source files (test errors are expected and handled in a later task)

- [ ] **Step 3: Commit**

```bash
git add cli/src/index.ts cli/src/commands/phase.ts cli/src/commands/cancel.ts cli/src/commands/compact.ts cli/src/commands/watch.ts cli/src/pipeline/runner.ts cli/src/pipeline/startup.ts cli/src/lockfile.ts cli/src/github/cli.ts cli/src/github/discovery.ts cli/src/manifest/store.ts
git commit -m "feat(call-site-migration): update createLogger calls to sink-based API"
```

---

### Task 3: Migrate logger.log() → logger.info() across all source files

**Wave:** 2
**Depends on:** Task 0, Task 1, Task 2

**Files:**
- Modify: `cli/src/pipeline/runner.ts`
- Modify: `cli/src/commands/phase.ts`
- Modify: `cli/src/commands/watch.ts`
- Modify: `cli/src/commands/watch-loop.ts`
- Modify: `cli/src/pipeline/startup.ts`
- Modify: `cli/src/commands/cancel-logic.ts`
- Modify: `cli/src/commands/cancel.ts`
- Modify: `cli/src/commands/compact.ts`

- [ ] **Step 1: Replace all logger.log( → logger.info( in source files**

Exact replacements (every occurrence):

**cli/src/pipeline/runner.ts** (lines 138, 166, 198, 207, 237, 266, 283, 320, 351, 353, 356, 363):
- `logger.log(` → `logger.info(` (12 occurrences)

**cli/src/commands/phase.ts** (lines 108, 147):
- `logger.log(` → `logger.info(` (2 occurrences)

**cli/src/commands/watch.ts** (lines 293, 300, 305, 308, 315, 359):
- `logger.log(` → `logger.info(` (6 occurrences)

**cli/src/commands/watch-loop.ts** (lines 109, 112, 435, 451, 455):
- `this.logger.log(` → `this.logger.info(` (3 occurrences in class)
- `logger.log(` → `logger.info(` (2 occurrences in attachLoggerSubscriber)

**cli/src/commands/watch-loop.ts** — attachLoggerSubscriber function (lines 460, 468, 480):
- `child.log(` → `child.info(` (3 occurrences)

**cli/src/pipeline/startup.ts** (line 273):
- `logger.log(` → `logger.info(` (1 occurrence)

**cli/src/commands/cancel-logic.ts** (lines 50, 91):
- `logger.log(` → `logger.info(` (2 occurrences)

**cli/src/commands/cancel.ts** (lines 25, 35):
- `logger.log(` → `logger.info(` (2 occurrences)

**cli/src/commands/compact.ts** (lines 23, 53):
- `logger.log(` → `logger.info(` (2 occurrences)

- [ ] **Step 2: Verify no logger.log( remains in source files**

Run: `grep -rn 'logger\.log(' cli/src/ --include='*.ts' | grep -v __tests__ | grep -v '.d.ts'`
Expected: No output (zero remaining logger.log calls)

- [ ] **Step 3: Commit**

```bash
git add cli/src/pipeline/runner.ts cli/src/commands/phase.ts cli/src/commands/watch.ts cli/src/commands/watch-loop.ts cli/src/pipeline/startup.ts cli/src/commands/cancel-logic.ts cli/src/commands/cancel.ts cli/src/commands/compact.ts
git commit -m "feat(call-site-migration): replace logger.log() with logger.info()"
```

---

### Task 4: Migrate logger.detail() → logger.debug() across all source files

**Wave:** 2
**Depends on:** Task 0, Task 1, Task 2

**Files:**
- Modify: `cli/src/pipeline/runner.ts`
- Modify: `cli/src/commands/cancel-logic.ts`

- [ ] **Step 1: Replace all logger.detail calls**

**cli/src/pipeline/runner.ts** (lines 142, 323, 340):
- `logger.detail?.(` → `logger.debug(` (3 occurrences — remove optional chaining since the new Logger always has debug())

**cli/src/commands/cancel-logic.ts** (lines 99, 113, 124, 146, 151, 169, 182, 184):
- `logger.detail(` → `logger.debug(` (8 occurrences)

- [ ] **Step 2: Verify no logger.detail( remains in source files**

Run: `grep -rn 'logger\.detail' cli/src/ --include='*.ts' | grep -v __tests__ | grep -v '.d.ts'`
Expected: No output (zero remaining logger.detail calls)

- [ ] **Step 3: Commit**

```bash
git add cli/src/pipeline/runner.ts cli/src/commands/cancel-logic.ts
git commit -m "feat(call-site-migration): replace logger.detail() with logger.debug()"
```

---

### Task 5: Fix watch-loop "State scan failed" error→warn and migrate console calls

**Wave:** 2
**Depends on:** Task 2

**Files:**
- Modify: `cli/src/commands/watch-loop.ts`
- Modify: `cli/src/args.ts`
- Modify: `cli/src/commands/compact.ts`

- [ ] **Step 1: Reclassify "State scan failed" from error to warn**

In `cli/src/commands/watch-loop.ts:159`:
- `this.logger.error(\`State scan failed: ${err}\`)` → `this.logger.warn(\`State scan failed: ${err}\`)`

The scan failure is non-fatal (the catch returns, loop continues), so warn is the correct level.

- [ ] **Step 2: Migrate args.ts console.error calls**

In `cli/src/args.ts:65-69`, the console.error calls happen before any logger exists (argument parsing failure). Per the design doc, these need special handling. Use `process.stderr.write` for this bootstrap path since it's argument validation output, not structured logging:

```typescript
  if (!ALL_COMMANDS.has(command)) {
    process.stderr.write(`Unknown command: ${command}\n`);
    process.stderr.write(`Phases: ${VALID_PHASES.join(", ")}\n`);
    process.stderr.write(`Other: watch, status, cancel, compact, dashboard, help\n`);
    process.exit(1);
  }
```

- [ ] **Step 3: Migrate compact.ts console.error call**

In `cli/src/commands/compact.ts:18`:
- `console.error("Not a beastmode project...")` fires before the logger is created (line 22).
- Use `process.stderr.write` for this bootstrap-path check:

```typescript
  if (!existsSync(beastmodeDir)) {
    process.stderr.write("Not a beastmode project (missing .beastmode/ directory)\n");
    process.exit(1);
  }
```

- [ ] **Step 4: Verify no console.log/console.error in cli/src/ (excluding scripts/ and tests)**

Run: `grep -rn 'console\.\(log\|error\)(' cli/src/ --include='*.ts' | grep -v __tests__ | grep -v scripts/ | grep -v '.d.ts'`
Expected: No output (zero remaining console calls in CLI runtime)

- [ ] **Step 5: Commit**

```bash
git add cli/src/commands/watch-loop.ts cli/src/args.ts cli/src/commands/compact.ts
git commit -m "feat(call-site-migration): fix State scan failed level, migrate console calls"
```

---

### Task 6: Add structured data to key call sites

**Wave:** 3
**Depends on:** Task 3, Task 4, Task 5

**Files:**
- Modify: `cli/src/pipeline/runner.ts`
- Modify: `cli/src/commands/watch-loop.ts`
- Modify: `cli/src/commands/watch.ts`
- Modify: `cli/src/commands/cancel-logic.ts`
- Modify: `cli/src/pipeline/startup.ts`
- Modify: `cli/src/commands/phase.ts`
- Modify: `cli/src/commands/compact.ts`

- [ ] **Step 1: Extract interpolated values into structured data**

Only add structured data where interpolated values have diagnostic value. Key candidates:

**cli/src/pipeline/runner.ts:**
- `logger.info(\`worktree: ${worktreePath}\`)` → `logger.info("worktree ready", { path: worktreePath })`
- `logger.info(\`impl branch: ${implBranch}\`)` → `logger.info("impl branch created", { branch: implBranch })`
- `logger.debug(\`rebase: ${rebaseResult.outcome}\`)` → `logger.debug("rebase complete", { outcome: rebaseResult.outcome })`
- `logger.info(\`reconciled -> ${reconcileResult.phase}\`)` → `logger.info("reconciled", { phase: reconcileResult.phase })`
- `logger.info(\`renamed -> ${renameResult.finalSlug}\`)` → `logger.info("renamed", { slug: renameResult.finalSlug })`
- `logger.info(\`archived as ${tagName}\`)` → `logger.info("archived", { tag: tagName })`
- `logger.error(\`release teardown failed: ${message}\`)` → `logger.error("release teardown failed", { error: message })`
- `logger.debug(\`commit ref: (#${amendResult.issueNumber})\`)` → `logger.debug("commit ref added", { issue: amendResult.issueNumber })`

**cli/src/commands/watch-loop.ts:**
- `this.logger.warn(\`State scan failed: ${err}\`)` → `this.logger.warn("State scan failed", { error: String(err) })`
- `this.logger.warn(\`Liveness check failed: ${err}\`)` → `this.logger.warn("Liveness check failed", { error: String(err) })`
- `this.logger.warn(\`impl branch creation failed for ${featureSlug}: ${branchErr}\`)` → `this.logger.warn("impl branch creation failed", { feature: featureSlug, error: String(branchErr) })`
- `this.logger.debug(\`${epic.slug}: skipping feature ${featureSlug}...\`)` → keep as-is (debug messages with context, structured data overkill)

**cli/src/commands/watch.ts:**
- `logger.info(\`Using iTerm2 dispatch strategy (session: ${result.sessionId})\`)` → `logger.info("Using iTerm2 dispatch strategy", { session: result.sessionId })`
- `logger.info(\`GitHub discovery: ${resolved.repo} (project #${resolved.projectNumber ?? "none"})\`)` → `logger.info("GitHub discovery complete", { repo: resolved.repo, project: resolved.projectNumber ?? null })`

**cli/src/pipeline/startup.ts:**
- The long `logger.info(\`Startup: adopted ${result.adopted}...\`)` → `logger.info("Startup reconciliation complete", { adopted: result.adopted, closedSurfaces: result.closedSurfaces, closedWorkspaces: result.closedWorkspaces, skipped: result.skipped })`

**cli/src/commands/phase.ts:**
- `logger.info(\`${phase} ${result.exit_status} in ${formatDuration(result.duration_ms)}\`)` → `logger.info("phase complete", { phase, status: result.exit_status, duration: formatDuration(result.duration_ms) })`

**cli/src/commands/cancel-logic.ts:**
- `logger.debug(\`Removed worktree and branch for ${slug}\`)` → `logger.debug("Removed worktree and branch", { slug })`
- `logger.debug(\`Deleted archive tag archive/${slug}\`)` → `logger.debug("Deleted archive tag", { tag: \`archive/${slug}\` })`
- `logger.debug(\`Closed GitHub issue #${githubEpicNumber}\`)` → `logger.debug("Closed GitHub issue", { issue: githubEpicNumber })`
- Other detail→debug calls with simple interpolation: add data parameter similarly

**cli/src/commands/compact.ts:**
- `logger.error(\`Compaction failed (exit code ${exitCode}).\`)` → `logger.error("Compaction failed", { exitCode })`

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/logging-cleanup/cli && bunx tsc --noEmit 2>&1 | grep -v __tests__ | head -10`
Expected: No type errors from source files

- [ ] **Step 3: Commit**

```bash
git add cli/src/pipeline/runner.ts cli/src/commands/watch-loop.ts cli/src/commands/watch.ts cli/src/commands/cancel-logic.ts cli/src/pipeline/startup.ts cli/src/commands/phase.ts cli/src/commands/compact.ts
git commit -m "feat(call-site-migration): add structured data to log call sites"
```

---

### Task 7: Update test files for new Logger interface

**Wave:** 3
**Depends on:** Task 0, Task 1, Task 2, Task 3, Task 4

**Files:**
- Modify: `cli/src/__tests__/tree-logger.test.ts`
- Modify: `cli/src/__tests__/logger.test.ts`
- Modify: `cli/src/__tests__/cancel.test.ts`
- Modify: `cli/src/__tests__/keyboard-nav.test.ts`
- Modify: `cli/src/__tests__/reconciling-factory-cleanup.test.ts`
- Modify: `cli/src/__tests__/tree-format.test.ts`
- Modify: `cli/src/__tests__/tree-view.test.ts`
- Modify: `cli/src/__tests__/verbosity.test.ts`
- Modify: `cli/src/__tests__/use-tree-state.test.ts`

- [ ] **Step 1: Update tree-logger.test.ts**

Replace all `logger.log(` → `logger.info(`, `logger.detail(` → `logger.debug(`, remove `logger.trace(` calls. Update test descriptions if they reference old level names. The TreeLogger constructor stays the same but now only has info/debug/warn/error.

- [ ] **Step 2: Update cancel.test.ts mock logger**

Replace mock logger objects that have `log` property with `info`:
```typescript
// Old: { log: fn, detail: fn, debug: fn, trace: fn, warn: fn, error: fn, child: fn }
// New: { info: fn, debug: fn, warn: fn, error: fn, child: fn }
```

- [ ] **Step 3: Update keyboard-nav.test.ts mock logger**

Same pattern as cancel.test.ts — replace `log` with `info` in mock logger.

- [ ] **Step 4: Update reconciling-factory-cleanup.test.ts**

Line 160: `createLogger(0, {})` → `createLogger(createStdioSink(0), {})` — add import for createStdioSink.

- [ ] **Step 5: Update tree-format.test.ts**

Replace `"detail"` and `"trace"` LogLevel values with `"debug"`:
- Any test using `level: "detail"` → `level: "debug"`
- Any test using `level: "trace"` → `level: "debug"`

- [ ] **Step 6: Update tree-view.test.ts**

Same as tree-format.test.ts — replace `"detail"` and `"trace"` with `"debug"` in LogLevel positions.

- [ ] **Step 7: Update verbosity.test.ts**

Replace `"detail"` and `"trace"` level arguments with `"debug"`. Update test descriptions/assertions accordingly.

- [ ] **Step 8: Update use-tree-state.test.ts**

Replace `logger.log(` → `logger.info(`.

- [ ] **Step 9: Fix logger.test.ts unused import**

Remove unused `Logger` type import (line 3).

- [ ] **Step 10: Run full test suite**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/logging-cleanup/cli && bun test 2>&1 | tail -30`
Expected: All tests pass

- [ ] **Step 11: Commit**

```bash
git add cli/src/__tests__/
git commit -m "feat(call-site-migration): update test files for 4-level Logger interface"
```

---

### Task 8: Final verification

**Wave:** 4
**Depends on:** Task 3, Task 4, Task 5, Task 6, Task 7

**Files:**
- (verification only, no file modifications)

- [ ] **Step 1: Verify TypeScript compiles with no errors**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/logging-cleanup/cli && bunx tsc --noEmit 2>&1`
Expected: Clean compilation, zero errors

- [ ] **Step 2: Verify zero console.log/console.error in cli/src/ (excluding scripts/ and tests)**

Run: `grep -rn 'console\.\(log\|error\)(' cli/src/ --include='*.ts' | grep -v __tests__ | grep -v scripts/ | grep -v '.d.ts'`
Expected: No output

- [ ] **Step 3: Verify zero logger.log/logger.detail/logger.trace in source files**

Run: `grep -rn 'logger\.\(log\|detail\|trace\)(' cli/src/ --include='*.ts' | grep -v __tests__ | grep -v '.d.ts'`
Expected: No output

- [ ] **Step 4: Verify zero old createLogger(number) calls in source files**

Run: `grep -rn 'createLogger([0-9]' cli/src/ --include='*.ts' | grep -v __tests__ | grep -v '.d.ts'`
Expected: No output

- [ ] **Step 5: Run full test suite**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/logging-cleanup/cli && bun test 2>&1 | tail -30`
Expected: All tests pass

- [ ] **Step 6: Verify process.stdout.write calls for non-log output are unchanged**

Run: `grep -rn 'process\.stdout\.write' cli/src/ --include='*.ts' | grep -v __tests__ | grep -v '.d.ts'`
Expected: ANSI escapes, JSON output, help text calls present and unchanged
