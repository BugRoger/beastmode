# Lockfile Path Fix -- Write Tasks

## Goal

Move the watch loop lockfile from `cli/.beastmode-watch.lock` to `.beastmode/.beastmode-watch.lock` so that the lockfile resolves correctly regardless of working directory. The `.beastmode/` directory is project-rooted and always exists, eliminating ENOENT errors when the dashboard runs from worktree directories.

## Architecture

Single-constant path change in `cli/src/lockfile.ts`. All lockfile consumers (acquire, release, read, stale detection) call the same `lockfilePath()` function, so changing the constant propagates everywhere. No behavioral changes -- only the resolved filesystem path differs.

## Tech Stack

- Runtime: Bun
- Language: TypeScript
- Test runner: vitest (run via `bun --bun vitest run`)
- Test location: `cli/src/__tests__/watch.test.ts`

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/lockfile.ts` | Modify | Change path resolution from `cli/` to `.beastmode/`; update module doc comment |
| `cli/src/__tests__/watch.test.ts` | Modify | Update hardcoded stale-lockfile path in test from `cli/` to `.beastmode/` |
| `.gitignore` | Modify | Replace bare `.beastmode-watch.lock` with specific `.beastmode/.beastmode-watch.lock` |
| `.beastmode/context/design/orchestration.md` | Modify | Update path reference in Recovery section |
| `.beastmode/context/design/cli.md` | Modify | Update path reference in Recovery Model section |

## Wave Isolation

| Wave | Tasks | Files | Parallel-safe | Reason |
|------|-------|-------|---------------|--------|
| 1 | T1, T2, T3 | T1: `cli/src/lockfile.ts`, `cli/src/__tests__/watch.test.ts` / T2: `.gitignore` / T3: `.beastmode/context/design/orchestration.md`, `.beastmode/context/design/cli.md` | no | T2 and T3 are independent but T1 must precede test verification; sequential is safer for 3 trivial tasks |

## Tasks

### Task 1: Update lockfile path and test

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/lockfile.ts:4,17`
- Modify: `cli/src/__tests__/watch.test.ts:57`
- Test: `cli/src/__tests__/watch.test.ts`

- [x] **Step 1: Update the module doc comment in lockfile.ts**

In `cli/src/lockfile.ts`, replace the doc comment on line 4 that says `cli/.beastmode-watch.lock` with `.beastmode/.beastmode-watch.lock`:

```typescript
/**
 * Lockfile manager — prevents duplicate watch instances.
 *
 * Creates .beastmode/.beastmode-watch.lock on start, removes on clean shutdown.
 * Detects stale lockfiles by checking if the PID is still running.
 */
```

The old comment reads:

```typescript
/**
 * Lockfile manager — prevents duplicate watch instances.
 *
 * Creates cli/.beastmode-watch.lock on start, removes on clean shutdown.
 * Detects stale lockfiles by checking if the PID is still running.
 */
```

- [x] **Step 2: Change the path constant in lockfilePath()**

In `cli/src/lockfile.ts`, line 17, change `"cli"` to `".beastmode"` in the `lockfilePath` function:

```typescript
function lockfilePath(projectRoot: string): string {
  return resolve(projectRoot, ".beastmode", LOCKFILE_NAME);
}
```

The old code reads:

```typescript
function lockfilePath(projectRoot: string): string {
  return resolve(projectRoot, "cli", LOCKFILE_NAME);
}
```

- [x] **Step 3: Update the stale-lockfile test path**

In `cli/src/__tests__/watch.test.ts`, line 57, change the hardcoded lockfile path in the "detects stale lockfile (dead PID)" test from `"cli"` to `".beastmode"`:

```typescript
    const lockPath = resolve(TEST_ROOT, ".beastmode", ".beastmode-watch.lock");
```

The old code reads:

```typescript
    const lockPath = resolve(TEST_ROOT, "cli", ".beastmode-watch.lock");
```

- [x] **Step 4: Run all lockfile tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/watch.test.ts -t "lockfile" --reporter=verbose`

Expected: All 4 lockfile tests PASS:
- acquires lock when no lockfile exists
- prevents duplicate lock acquisition
- releases lock cleanly
- detects stale lockfile (dead PID)

Note: The test setup already creates both `cli/` and `.beastmode/` directories under `TEST_ROOT` (see `setupTestRoot()` at line 13-17 of watch.test.ts), so no test fixture changes are needed beyond the path string.

- [x] **Step 5: Run the full watch test suite to verify nothing else broke**

Run: `cd cli && bun --bun vitest run src/__tests__/watch.test.ts --reporter=verbose`

Expected: All tests in the file PASS (lockfile, DispatchTracker, and WatchLoop tests).

- [x] **Step 6: Commit**

```bash
git add cli/src/lockfile.ts cli/src/__tests__/watch.test.ts
git commit -m "fix(lockfile): resolve lockfile path to .beastmode/ instead of cli/"
```

### Task 2: Update .gitignore entry

**Wave:** 1
**Depends on:** Task 1

**Files:**
- Modify: `.gitignore:10`

- [x] **Step 1: Replace the gitignore entry**

In `.gitignore`, line 10, replace the bare pattern `.beastmode-watch.lock` with the specific path `.beastmode/.beastmode-watch.lock`:

```
.beastmode/.beastmode-watch.lock
```

The old entry reads:

```
.beastmode-watch.lock
```

The full `.gitignore` after this change should read:

```
# Beastmode session state and worktrees
.beastmode/state/
.beastmode/sessions/
.beastmode/worktrees/
.beastmode/pipeline/
.beastmode/config.yaml
.claude/worktrees/
.claude/settings.local.json
.beastmode/artifacts/**/*.output.json
.beastmode/.beastmode-watch.lock
.DS_Store
```

- [x] **Step 2: Verify the gitignore entry works**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/lockfile-path-fix-dcd0 && git check-ignore .beastmode/.beastmode-watch.lock`

Expected: Output `.beastmode/.beastmode-watch.lock` (the path is ignored).

- [x] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "fix(gitignore): update lockfile entry to match new .beastmode/ path"
```

### Task 3: Update context documentation

**Wave:** 1
**Depends on:** Task 1

**Files:**
- Modify: `.beastmode/context/design/orchestration.md:31`
- Modify: `.beastmode/context/design/cli.md:34`

- [x] **Step 1: Update orchestration.md**

In `.beastmode/context/design/orchestration.md`, line 31, replace the old path with the new one:

```markdown
- Lockfile (`.beastmode/.beastmode-watch.lock`) prevents duplicate watch instances — single orchestrator guarantee
```

The old line reads:

```markdown
- Lockfile (`cli/.beastmode-watch.lock`) prevents duplicate watch instances — single orchestrator guarantee
```

- [x] **Step 2: Update cli.md**

In `.beastmode/context/design/cli.md`, line 34, replace the old path with the new one:

```markdown
- Lockfile (`.beastmode/.beastmode-watch.lock`) prevents duplicate watch instances
```

The old line reads:

```markdown
- Lockfile (`cli/.beastmode-watch.lock`) prevents duplicate watch instances
```

- [x] **Step 3: Commit**

```bash
git add .beastmode/context/design/orchestration.md .beastmode/context/design/cli.md
git commit -m "docs: update lockfile path references in context docs"
```
