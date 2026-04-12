# Fix Commit Issue Refs -- Implementation Tasks

## Goal

Add diagnostic logging to the commit-issue-ref amend pipeline. The `amendCommitsInRange` function has four silent exit points that all return `{ amended: 0, skipped: 0 }` with no logging, and the runner only logs when `amended > 0`. This creates a complete observability black hole. Fix by threading an optional `Logger` parameter through the amend function and its range-start resolver, and making the runner log unconditionally.

## Architecture

**Runtime:** Bun + TypeScript
**Test runner:** vitest (via `bun --bun vitest run`)
**Test location:** `cli/src/__tests__/`
**Source location:** `cli/src/`
**Logger import:** `import type { Logger } from "../logger.js";`
**Null logger for tests:** `import { createNullLogger } from "../logger.js";`

## Context

### Current behavior

`amendCommitsInRange` in `cli/src/git/commit-issue-ref.ts` has five conditional returns:

1. **Exit 1 (line 159):** No epic issue number in sync refs -- returns `{ amended: 0, skipped: 0 }`
2. **Exit 2 (line 172):** Range start resolution failed -- returns `{ amended: 0, skipped: 0 }`
3. **Exit 3 (line 182):** Git log failed or empty output -- returns `{ amended: 0, skipped: 0 }`
4. **Exit 4 (line 191):** No commits parsed from range -- returns `{ amended: 0, skipped: 0 }`
5. **Exit 5 (line 212):** All commits already have refs (amended=0, skipped>0) -- returns `{ amended: 0, skipped }`

`resolveRangeStart` in the same file resolves the range start SHA. It tries a previous-phase tag then falls back to merge-base, but logs nothing about which path it took.

The runner at step 8.5 (`cli/src/pipeline/runner.ts` lines 441-468) only logs when `rangeResult.amended > 0`, making it invisible when commits are skipped or no range was found.

### Logger type

```typescript
export interface Logger {
  info(msg: string, data?: Record<string, unknown>): void;
  debug(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
  child(ctx: Partial<LogContext>): Logger;
}
```

The runner uses the `logger.debug?.()` optional-call pattern throughout. All new debug calls must use the same pattern.

### Acceptance criteria

- `amendCommitsInRange` accepts optional `logger` parameter
- All 4 silent exit points produce debug log messages
- Exit 5 (healthy no-op) also produces a debug log message
- `resolveRangeStart` accepts optional `logger` and logs tag resolution attempts
- Runner step 8.5 logs amend result regardless of amended count
- Existing commit-issue-ref tests continue to pass
- New tests verify logging output at each exit path

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/git/commit-issue-ref.ts` | Modify | Add optional `logger` param to `resolveRangeStart` and `amendCommitsInRange`; add debug log at each exit point |
| `cli/src/pipeline/runner.ts` | Modify (line 460-463) | Pass `logger` to `amendCommitsInRange`; log result unconditionally |
| `cli/src/__tests__/commit-issue-ref.test.ts` | Modify | Add new test cases verifying logger output at each exit path |

## Wave Isolation

| Wave | Tasks | Files | Parallel-safe | Reason |
|------|-------|-------|---------------|--------|
| 1 | T1 | `cli/src/git/commit-issue-ref.ts`, `cli/src/__tests__/commit-issue-ref.test.ts` | n/a | single task |
| 2 | T2 | `cli/src/pipeline/runner.ts` | n/a | single task; depends on T1 (type-flow: `logger` property in opts type added by T1) |

---

### Task 1: Add logger parameter and diagnostic logging to commit-issue-ref functions

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/git/commit-issue-ref.ts:111-135` (resolveRangeStart)
- Modify: `cli/src/git/commit-issue-ref.ts:150-214` (amendCommitsInRange)
- Modify: `cli/src/__tests__/commit-issue-ref.test.ts` (add logging tests)

This task adds an optional `logger` parameter to `resolveRangeStart` and `amendCommitsInRange`, adds debug logging at every exit point, and adds tests verifying the log messages.

- [x] **Step 1: Write failing tests for resolveRangeStart logging**

Add the following test block at the end of the `resolveRangeStart` describe block in `cli/src/__tests__/commit-issue-ref.test.ts`. First, add the Logger type import after the existing imports (after line 16):

```typescript
import type { Logger } from "../logger.js";
```

Add a helper function after the imports (after the new Logger import):

```typescript
function createSpyLogger(): Logger & { messages: string[] } {
  const messages: string[] = [];
  const spy: Logger & { messages: string[] } = {
    messages,
    info(msg: string) { messages.push(`info: ${msg}`); },
    debug(msg: string) { messages.push(`debug: ${msg}`); },
    warn(msg: string) { messages.push(`warn: ${msg}`); },
    error(msg: string) { messages.push(`error: ${msg}`); },
    child() { return spy; },
  };
  return spy;
}
```

Then add these tests inside the existing `describe("resolveRangeStart", ...)` block, after the last existing test (after the "falls back to merge-base when previous phase tag is missing" test):

```typescript
  test("logs tag resolution attempt and success", async () => {
    const logger = createSpyLogger();
    await git(["checkout", "-b", "feature/log-tag-hit"], { cwd: repoDir });
    writeFileSync(join(repoDir, "lt1.txt"), "lt1\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "design checkpoint"], { cwd: repoDir });
    await git(["tag", "beastmode/log-tag-hit/design"], { cwd: repoDir });

    writeFileSync(join(repoDir, "lt2.txt"), "lt2\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "plan checkpoint"], { cwd: repoDir });

    await resolveRangeStart("log-tag-hit", "plan", { cwd: repoDir, logger });

    expect(logger.messages.some((m) => m.includes("beastmode/log-tag-hit/design"))).toBe(true);
    expect(logger.messages.some((m) => m.includes("resolved"))).toBe(true);

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "feature/log-tag-hit"], { cwd: repoDir });
    await git(["tag", "-d", "beastmode/log-tag-hit/design"], { cwd: repoDir });
  });

  test("logs merge-base fallback when tag missing", async () => {
    const logger = createSpyLogger();
    await git(["checkout", "-b", "feature/log-mb-fallback"], { cwd: repoDir });
    writeFileSync(join(repoDir, "lm1.txt"), "lm1\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "plan checkpoint"], { cwd: repoDir });

    await resolveRangeStart("log-mb-fallback", "plan", { cwd: repoDir, logger });

    expect(logger.messages.some((m) => m.includes("merge-base"))).toBe(true);

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "feature/log-mb-fallback"], { cwd: repoDir });
  });
```

- [x] **Step 2: Write failing tests for amendCommitsInRange logging**

Add the following tests inside the existing `describe("amendCommitsInRange", ...)` block, after the last existing test (after "returns zero when epic has no sync ref"):

```typescript
  test("logs debug when epic has no sync ref (exit 1)", async () => {
    const logger = createSpyLogger();
    const emptySyncRefs: SyncRefs = {};
    await amendCommitsInRange(emptySyncRefs, epicId, features, "test-epic-abc123", "plan", { cwd: repoDir, logger });
    expect(logger.messages.some((m) => m.includes("no epic issue"))).toBe(true);
  });

  test("logs debug when range start resolution fails (exit 2)", async () => {
    const logger = createSpyLogger();
    // Use a range override that doesn't exist to force resolution failure
    await amendCommitsInRange(syncRefs, epicId, features, "nonexistent-slug", "design", {
      cwd: repoDir,
      rangeStartOverride: "nonexistent-ref-abc123",
      logger,
    });
    expect(logger.messages.some((m) => m.includes("range start"))).toBe(true);
  });

  test("logs debug when all commits already have refs (exit 5)", async () => {
    const logger = createSpyLogger();
    await git(["checkout", "-b", "feature/test-epic-abc123-log5"], { cwd: repoDir });
    await git(["tag", "beastmode/test-epic-abc123/design-log5"], { cwd: repoDir });

    writeFileSync(join(repoDir, "l5.txt"), "l5\n");
    await git(["add", "."], { cwd: repoDir });
    await git(["commit", "-m", "plan(test-epic): done (#42)"], { cwd: repoDir });

    await amendCommitsInRange(syncRefs, epicId, features, "test-epic-abc123", "plan", {
      cwd: repoDir,
      rangeStartOverride: "beastmode/test-epic-abc123/design-log5",
      logger,
    });

    expect(logger.messages.some((m) => m.includes("already have refs"))).toBe(true);

    await git(["checkout", "main"], { cwd: repoDir });
    await git(["branch", "-D", "feature/test-epic-abc123-log5"], { cwd: repoDir });
    await git(["tag", "-d", "beastmode/test-epic-abc123/design-log5"], { cwd: repoDir });
  });
```

- [x] **Step 3: Run tests to verify they fail**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/github-sync-bug-fixes-c861/cli && bun --bun vitest run src/__tests__/commit-issue-ref.test.ts`
Expected: FAIL -- `resolveRangeStart` does not accept `logger` in opts, and `amendCommitsInRange` does not accept `logger` in opts. TypeScript compilation errors.

- [x] **Step 4: Add logger import to commit-issue-ref.ts**

In `cli/src/git/commit-issue-ref.ts`, add the following import after line 12 (`import { getSyncRef } from "../github/index.js";`):

```typescript
import type { Logger } from "../logger.js";
```

- [x] **Step 5: Update resolveRangeStart to accept logger and add logging**

In `cli/src/git/commit-issue-ref.ts`, replace the `resolveRangeStart` function (lines 111-135) with:

```typescript
export async function resolveRangeStart(
  slug: string,
  currentPhase: string,
  opts: { cwd?: string; logger?: Logger } = {},
): Promise<string | undefined> {
  const phaseIdx = PHASE_ORDER.indexOf(currentPhase as (typeof PHASE_ORDER)[number]);

  // Try previous phase tag
  if (phaseIdx > 0) {
    const prevPhase = PHASE_ORDER[phaseIdx - 1];
    const prevTag = tagName(slug, prevPhase);
    opts.logger?.debug(`range-start: trying tag ${prevTag}`);
    const result = await git(["rev-parse", prevTag], { cwd: opts.cwd, allowFailure: true });
    if (result.exitCode === 0 && result.stdout) {
      opts.logger?.debug(`range-start: tag ${prevTag} resolved to ${result.stdout.slice(0, 8)}`);
      return result.stdout;
    }
    opts.logger?.debug(`range-start: tag ${prevTag} not found, falling back to merge-base`);
  }

  // Fallback: merge-base with main
  const mbResult = await git(["merge-base", "main", "HEAD"], { cwd: opts.cwd, allowFailure: true });
  if (mbResult.exitCode === 0 && mbResult.stdout) {
    opts.logger?.debug(`range-start: merge-base resolved to ${mbResult.stdout.slice(0, 8)}`);
    return mbResult.stdout;
  }

  opts.logger?.debug("range-start: merge-base failed, no range start found");
  return undefined;
}
```

- [x] **Step 6: Update amendCommitsInRange to accept logger and add logging**

In `cli/src/git/commit-issue-ref.ts`, replace lines 150-157 (the function signature of `amendCommitsInRange`) with:

```typescript
export async function amendCommitsInRange(
  syncRefs: SyncRefs,
  epicId: string,
  features: IssueRefFeature[],
  slug: string,
  currentPhase: string,
  opts: { cwd?: string; rangeStartOverride?: string; logger?: Logger } = {},
): Promise<AmendRangeResult> {
```

Then add logging at each exit point. After line 158 (`const epicIssue = getSyncRef(syncRefs, epicId)?.issue;`), before the `if (!epicIssue)` check, the block should read:

Replace the Exit 1 block (the `epicIssue` check and return):
```typescript
  const epicIssue = getSyncRef(syncRefs, epicId)?.issue;
  if (!epicIssue) {
    return { amended: 0, skipped: 0 };
  }
```

with:
```typescript
  const epicIssue = getSyncRef(syncRefs, epicId)?.issue;
  if (!epicIssue) {
    opts.logger?.debug("commit-refs: no epic issue number in sync refs -- skipping");
    return { amended: 0, skipped: 0 };
  }
```

Replace the range start resolution call to pass logger. Change:
```typescript
    rangeStart = await resolveRangeStart(slug, currentPhase, opts);
```
to:
```typescript
    rangeStart = await resolveRangeStart(slug, currentPhase, { cwd: opts.cwd, logger: opts.logger });
```

Replace the Exit 2 block:
```typescript
  if (!rangeStart) {
    return { amended: 0, skipped: 0 };
  }
```

with:
```typescript
  if (!rangeStart) {
    opts.logger?.debug("commit-refs: range start resolution failed -- skipping");
    return { amended: 0, skipped: 0 };
  }
```

Replace the Exit 3 block:
```typescript
  if (logResult.exitCode !== 0 || !logResult.stdout) {
    return { amended: 0, skipped: 0 };
  }
```

with:
```typescript
  if (logResult.exitCode !== 0 || !logResult.stdout) {
    opts.logger?.debug("commit-refs: git log failed or empty output -- skipping");
    return { amended: 0, skipped: 0 };
  }
```

Replace the Exit 4 block:
```typescript
  if (commits.length === 0) {
    return { amended: 0, skipped: 0 };
  }
```

with:
```typescript
  if (commits.length === 0) {
    opts.logger?.debug("commit-refs: no commits found in range -- skipping");
    return { amended: 0, skipped: 0 };
  }
```

Replace the Exit 5 block:
```typescript
  if (amendments.size === 0) {
    return { amended: 0, skipped };
  }
```

with:
```typescript
  if (amendments.size === 0) {
    opts.logger?.debug(`commit-refs: all ${skipped} commits already have refs -- nothing to amend`);
    return { amended: 0, skipped };
  }
```

- [x] **Step 7: Run tests to verify they pass**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/github-sync-bug-fixes-c861/cli && bun --bun vitest run src/__tests__/commit-issue-ref.test.ts`
Expected: ALL PASS -- existing tests still pass (logger is optional), new logging tests pass.

- [x] **Step 8: Commit**

```bash
cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/github-sync-bug-fixes-c861
git add cli/src/git/commit-issue-ref.ts cli/src/__tests__/commit-issue-ref.test.ts
git commit -m "feat(fix-commit-issue-refs-c861.2): add diagnostic logging to amend pipeline"
```

---

### Task 2: Make runner step 8.5 log unconditionally and pass logger

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/pipeline/runner.ts:458-463`

This task changes the runner's step 8.5 to pass the `logger` to `amendCommitsInRange` and log the result unconditionally (not just when `amended > 0`).

- [x] **Step 1: Understand the current code**

In `cli/src/pipeline/runner.ts` lines 458-463, the current code is:

```typescript
    if (epicEntity) {
      const features = taskStore.listFeatures(epicEntity.id).map((f) => ({ id: f.id, slug: f.slug }));
      const rangeResult = await amendCommitsInRange(syncRefs, epicEntity.id, features, epicSlug, config.phase, { cwd: worktreePath });
      if (rangeResult.amended > 0) {
        logger.debug?.(`commit refs: ${rangeResult.amended} amended, ${rangeResult.skipped} skipped`);
      }
    }
```

- [x] **Step 2: Update step 8.5 to pass logger and log unconditionally**

In `cli/src/pipeline/runner.ts`, replace lines 458-464 (the `if (epicEntity)` block inside the step 8.5 try):

Old code:
```typescript
    if (epicEntity) {
      const features = taskStore.listFeatures(epicEntity.id).map((f) => ({ id: f.id, slug: f.slug }));
      const rangeResult = await amendCommitsInRange(syncRefs, epicEntity.id, features, epicSlug, config.phase, { cwd: worktreePath });
      if (rangeResult.amended > 0) {
        logger.debug?.(`commit refs: ${rangeResult.amended} amended, ${rangeResult.skipped} skipped`);
      }
    }
```

New code:
```typescript
    if (epicEntity) {
      const features = taskStore.listFeatures(epicEntity.id).map((f) => ({ id: f.id, slug: f.slug }));
      const rangeResult = await amendCommitsInRange(syncRefs, epicEntity.id, features, epicSlug, config.phase, { cwd: worktreePath, logger });
      logger.debug?.(`commit refs: ${rangeResult.amended} amended, ${rangeResult.skipped} skipped`);
    }
```

The changes are:
1. Added `logger` to the opts object passed to `amendCommitsInRange`
2. Removed the `if (rangeResult.amended > 0)` guard -- now logs unconditionally so operators see "0 amended, 3 skipped" instead of silence

- [x] **Step 3: Verify the full test suite passes**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/github-sync-bug-fixes-c861/cli && bun --bun vitest run`
Expected: ALL PASS -- the runner change is purely a logging change with no behavioral effect on existing tests.

- [x] **Step 4: Commit**

```bash
cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/github-sync-bug-fixes-c861
git add cli/src/pipeline/runner.ts
git commit -m "feat(fix-commit-issue-refs-c861.2): log commit-ref amend result unconditionally in runner"
```
