# Knowledge and Tests — Implementation Tasks

## Goal

Remove dead test files, fix surviving test imports, clean up BDD support files, and update context tree entries to reflect the simplified iTerm2-only architecture. All references to cmux, SDK dispatch, `beastmode watch` command, and `beastmode status` command must be removed from active context files.

## Architecture Constraints

- **Dashboard stays** as the sole pipeline UI — embeds its own watch loop
- **Watch loop (watch-loop.ts) stays** — dashboard depends on it
- **SessionFactory interface stays** with iTerm2 as sole implementation
- **LogEntry stays** in factory.ts — dashboard code still uses it
- **Historical design artifacts are preserved** — never delete `.beastmode/artifacts/design/`
- **Context tree updates only** — no source code changes in `cli/src/`

## Tech Stack

- TypeScript, Vitest, Cucumber.js
- Context files: Markdown under `.beastmode/context/`

## File Structure

### Files to Delete
- `.beastmode/context/design/cmux-integration/lifecycle.md`
- `.beastmode/context/design/cmux-integration/notifications.md`
- `.beastmode/context/design/cmux-integration/communication-protocol.md`
- `.beastmode/context/design/cmux-integration/optionality.md`
- `.beastmode/context/design/cmux-integration/completion-detection.md`
- `.beastmode/context/design/cmux-integration/surface-model.md`
- `.beastmode/context/implement/cmux-integration.md`
- `.beastmode/context/implement/cmux-integration/best-effort-visual-cleanup.md`

### Files to Modify
- `cli/features/support/watch-world.ts` — remove `SdkSessionFactory` import, use inline factory
- `.beastmode/context/DESIGN.md` — remove cmux, SDK dispatch, beastmode watch/status references
- `.beastmode/context/IMPLEMENT.md` — remove cmux integration section
- `.beastmode/context/design/orchestration.md` — remove cmux/SDK dispatch references
- `.beastmode/context/design/cli/sdk-integration.md` — rewrite for iTerm2-only
- `.beastmode/context/design/cli/configuration.md` — remove dispatch-strategy config
- `.beastmode/context/design/dashboard/sdk-dispatch-override.md` — rewrite for iTerm2-only
- `.beastmode/context/design/dashboard/event-log-fallback.md` — simplify (no longer a fallback)
- `.beastmode/context/implement/state-scanning/status-display.md` — remove status command refs

---

### Task 0: Delete cmux context tree (design + implement)

**Wave:** 1
**Depends on:** -

**Files:**
- Delete: `.beastmode/context/design/cmux-integration/lifecycle.md`
- Delete: `.beastmode/context/design/cmux-integration/notifications.md`
- Delete: `.beastmode/context/design/cmux-integration/communication-protocol.md`
- Delete: `.beastmode/context/design/cmux-integration/optionality.md`
- Delete: `.beastmode/context/design/cmux-integration/completion-detection.md`
- Delete: `.beastmode/context/design/cmux-integration/surface-model.md`
- Delete: `.beastmode/context/implement/cmux-integration.md`
- Delete: `.beastmode/context/implement/cmux-integration/best-effort-visual-cleanup.md`

- [x] **Step 1: Delete all cmux context files**

```bash
rm -rf .beastmode/context/design/cmux-integration/
rm -f .beastmode/context/implement/cmux-integration.md
rm -rf .beastmode/context/implement/cmux-integration/
```

- [x] **Step 2: Verify deletion**

Run: `ls .beastmode/context/design/cmux-integration/ 2>&1 && ls .beastmode/context/implement/cmux-integration* 2>&1`
Expected: "No such file or directory" for all paths

- [x] **Step 3: Commit**

```bash
git add -A .beastmode/context/design/cmux-integration/ .beastmode/context/implement/cmux-integration.md .beastmode/context/implement/cmux-integration/
git commit -m "feat(knowledge-and-tests): delete cmux context tree"
```

---

### Task 1: Fix watch-world.ts — remove SdkSessionFactory import

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/features/support/watch-world.ts`

- [x] **Step 1: Replace SdkSessionFactory with inline factory**

In `watch-world.ts`, the import line:
```typescript
import { SdkSessionFactory } from "../../src/dispatch/factory.js";
```
Replace with nothing — `SdkSessionFactory` is no longer exported.

The usage at line 86:
```typescript
sessionFactory: new SdkSessionFactory(async (opts: SessionCreateOpts) => {
```
Replace with a plain object implementing SessionFactory:
```typescript
sessionFactory: {
  async create(opts: SessionCreateOpts) {
```

And adjust the closing (from `})` to just `}` for the object literal end).

- [x] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit --project cli/tsconfig.json 2>&1 | grep watch-world || echo "No errors"`
Expected: "No errors" (features/ is excluded from tsconfig, but we verify it manually)

Actually, verify by checking the import resolves:
Run: `grep -n "SdkSessionFactory" cli/features/support/watch-world.ts`
Expected: No output (import is gone)

- [x] **Step 3: Commit**

```bash
git add cli/features/support/watch-world.ts
git commit -m "feat(knowledge-and-tests): remove SdkSessionFactory from watch-world"
```

---

### Task 2: Update context/DESIGN.md — remove cmux/SDK/watch/status references

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `.beastmode/context/DESIGN.md`

- [x] **Step 1: Edit DESIGN.md**

Remove or rewrite sections containing:
- `cmux` references (cmux integration paragraph, reconcile cmux state, CmuxSession, CmuxStrategy)
- `SdkSession`, `SdkStrategy`, SDK dispatch references
- `beastmode watch` command references (keep watch-loop since dashboard uses it)
- `beastmode status` command references
- `dispatch-strategy` config references
- The entire "cmux Integration" section (section 12 at the bottom)

Keep references to: WatchLoop, dashboard, SessionFactory (iTerm2-only), DispatchTracker.

- [x] **Step 2: Verify no forbidden references remain**

Run: `grep -i "cmux\|SdkSessionFactory\|SdkSession\|SdkStrategy\|dispatchPhase\|beastmode watch\"\|beastmode status\"\|dispatch-strategy" .beastmode/context/DESIGN.md`
Expected: No output

- [x] **Step 3: Commit**

```bash
git add .beastmode/context/DESIGN.md
git commit -m "feat(knowledge-and-tests): update DESIGN.md for iTerm2-only"
```

---

### Task 3: Update context/IMPLEMENT.md — remove cmux integration section

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `.beastmode/context/IMPLEMENT.md`

- [x] **Step 1: Edit IMPLEMENT.md**

Remove the "Cmux Integration" section (lines 38-42):
```
## Cmux Integration
- CmuxClient is a class wrapping the cmux binary via Bun.spawn with injectable SpawnFn for testability
- All operations shell out to cmux CLI with --json flag for structured responses; no direct socket programming
- Error hierarchy: CmuxError base, CmuxConnectionError, CmuxProtocolError, CmuxTimeoutError
- Close operations are idempotent — "not found" errors are swallowed, connection errors always rethrow
- No retry logic or caching in the client — callers handle retry policy
```

- [x] **Step 2: Verify no cmux references remain**

Run: `grep -i "cmux" .beastmode/context/IMPLEMENT.md`
Expected: No output

- [x] **Step 3: Commit**

```bash
git add .beastmode/context/IMPLEMENT.md
git commit -m "feat(knowledge-and-tests): remove cmux section from IMPLEMENT.md"
```

---

### Task 4: Update context/design/orchestration.md — remove cmux/SDK references

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `.beastmode/context/design/orchestration.md`

- [x] **Step 1: Read and edit orchestration.md**

Remove references to:
- `beastmode watch` as entry point (keep WatchLoop — dashboard embeds it)
- `CmuxStrategy`, `SdkStrategy`
- `cmux state reconciliation`
- `beastmode status`
- `dispatchPhase`
- Multiple dispatch strategy references — simplify to iTerm2-only via SessionFactory

Rewrite dispatch description to reflect iTerm2 as the sole implementation.

- [x] **Step 2: Verify no forbidden references**

Run: `grep -i "cmux\|SdkStrategy\|SdkSession\|beastmode watch\|beastmode status\|dispatchPhase" .beastmode/context/design/orchestration.md`
Expected: No output

- [x] **Step 3: Commit**

```bash
git add .beastmode/context/design/orchestration.md
git commit -m "feat(knowledge-and-tests): update orchestration.md for iTerm2-only"
```

---

### Task 5: Update remaining context files (sdk-integration, configuration, dashboard contexts, status-display)

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `.beastmode/context/design/cli/sdk-integration.md`
- Modify: `.beastmode/context/design/cli/configuration.md`
- Modify: `.beastmode/context/design/dashboard/sdk-dispatch-override.md`
- Modify: `.beastmode/context/design/dashboard/event-log-fallback.md`
- Modify: `.beastmode/context/implement/state-scanning/status-display.md`

- [x] **Step 1: Rewrite sdk-integration.md**

Rewrite to reflect iTerm2-only dispatch. Remove SDK session, cmux session, strategy pattern references. Focus on SessionFactory with ITermSessionFactory as sole implementation.

- [x] **Step 2: Update configuration.md**

Remove `dispatch-strategy` config (`sdk | cmux | auto`), cmux config section references.

- [x] **Step 3: Rewrite sdk-dispatch-override.md**

This file documented SDK dispatch override for the dashboard. Rewrite to document iTerm2-only dispatch (no override needed — iTerm2 is the default and only option).

- [x] **Step 4: Simplify event-log-fallback.md**

Remove the "fallback" framing — there's no SDK path to fall back from. Lifecycle entries are the standard log path for non-streaming sessions.

- [x] **Step 5: Update status-display.md**

Remove `beastmode status` command references. The status-data module survives (shared by dashboard) but the status command is gone.

- [x] **Step 6: Verify no forbidden references in any updated file**

Run: `grep -ri "cmux\|SdkSessionFactory\|dispatchPhase\|beastmode watch\|beastmode status\|dispatch-strategy" .beastmode/context/design/cli/sdk-integration.md .beastmode/context/design/cli/configuration.md .beastmode/context/design/dashboard/sdk-dispatch-override.md .beastmode/context/design/dashboard/event-log-fallback.md .beastmode/context/implement/state-scanning/status-display.md`
Expected: No output

- [x] **Step 7: Commit**

```bash
git add .beastmode/context/design/cli/sdk-integration.md .beastmode/context/design/cli/configuration.md .beastmode/context/design/dashboard/sdk-dispatch-override.md .beastmode/context/design/dashboard/event-log-fallback.md .beastmode/context/implement/state-scanning/status-display.md
git commit -m "feat(knowledge-and-tests): update remaining context files for iTerm2-only"
```

---

### Task 6: Final verification — grep sweep

**Wave:** 3
**Depends on:** Task 2, Task 3, Task 4, Task 5

**Files:**
- Verify: `.beastmode/context/` (entire tree)

- [x] **Step 1: Run acceptance criterion grep**

Run: `grep -r "cmux\|SdkSessionFactory\|dispatchPhase\|beastmode watch\|beastmode status" .beastmode/context/`
Expected: No hits in active context files

- [x] **Step 2: Run test suite**

Run: `npx vitest run cli/src/__tests__/watch.test.ts cli/src/__tests__/watch-dispatch-race.test.ts cli/src/__tests__/watch-events.test.ts cli/src/__tests__/wave-dispatch.test.ts cli/src/__tests__/use-dashboard-tree-state.test.ts cli/src/__tests__/phase-dispatch.test.ts cli/src/__tests__/reconciling-factory-cleanup.test.ts cli/src/__tests__/it2-client.test.ts cli/src/__tests__/it2-session.test.ts cli/src/__tests__/iterm2-detect.test.ts cli/src/__tests__/interactive-runner.test.ts --reporter=verbose`
Expected: All pass

- [x] **Step 3: Verify historical design artifacts preserved**

Run: `ls .beastmode/artifacts/design/ | head -20`
Expected: Design artifacts still present (not deleted)

- [x] **Step 4: Commit verification (no-op if nothing to add)**

No code changes expected — this is verification only.
