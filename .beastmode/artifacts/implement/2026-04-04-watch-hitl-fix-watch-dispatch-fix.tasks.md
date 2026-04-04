# Watch Dispatch Fix — Implementation Tasks

## Goal

Add rebase and HITL settings write to `dispatchPhase()` in `watch.ts`, between worktree creation and SDK dispatch. Update the `skipPreDispatch` comment in `runner.ts` to accurately describe the post-fix contract.

## Architecture

- **Fix location**: `dispatchPhase()` in `cli/src/commands/watch.ts`
- **Rebase**: Call `rebase(phase, { cwd: wt.path })` after worktree creation, before SDK dispatch
- **HITL**: Call 4-function sequence (`cleanHitlSettings`, `getPhaseHitlProse`, `buildPreToolUseHook`, `writeHitlSettings`) after worktree creation, before SDK dispatch
- **Config loading**: Call `loadConfig(opts.projectRoot)` inside `dispatchPhase()` for HITL config access
- **Comment fix**: Update `runner.ts` line 116 comment to describe the actual contract

## Tech Stack

- Bun + TypeScript
- Test runner: `bun test`
- Existing test pattern: module-level `mock.module()` before imports

## File Structure

- **Modify**: `cli/src/commands/watch.ts` — add rebase + HITL calls to `dispatchPhase()`
- **Modify**: `cli/src/pipeline/runner.ts` — update `skipPreDispatch` comment
- **Modify**: `cli/src/__tests__/watch.test.ts` — add tests for dispatch path

---

### Task 1: Add rebase and HITL calls to dispatchPhase()

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/commands/watch.ts:8-27` (imports)
- Modify: `cli/src/commands/watch.ts:119-138` (dispatchPhase function body)

- [ ] **Step 1: Add missing imports to watch.ts**

Add imports for the rebase function and all four HITL functions. `loadConfig` is already imported (line 10). `resolve` is already imported (line 8). `worktree` namespace (which includes `rebase` via `worktree.ts`) is already imported as `* as worktree` but `rebase` is a named export, not on the namespace — import it directly.

In `cli/src/commands/watch.ts`, after line 22 (`import * as worktree from "../git/worktree.js";`), add:

```typescript
import { rebase } from "../git/worktree.js";
import {
  cleanHitlSettings,
  getPhaseHitlProse,
  buildPreToolUseHook,
  writeHitlSettings,
} from "../hooks/hitl-settings.js";
```

- [ ] **Step 2: Add rebase and HITL calls after worktree creation in dispatchPhase()**

In `cli/src/commands/watch.ts`, after line 131 (`const wt = await worktree.create(worktreeSlug, { cwd: opts.projectRoot });`) and before line 133 (`const id = ...`), insert:

```typescript
  // -- Rebase worktree onto main (matches runner.ts step 2) ----------------
  await rebase(opts.phase, { cwd: wt.path });

  // -- Write HITL settings (matches runner.ts step 3) ----------------------
  const config = loadConfig(opts.projectRoot);
  const claudeDir = resolve(wt.path, ".claude");
  cleanHitlSettings(claudeDir);
  const hitlProse = getPhaseHitlProse(config.hitl, opts.phase);
  const preToolUseHook = buildPreToolUseHook(hitlProse, config.hitl.model, config.hitl.timeout);
  writeHitlSettings({ claudeDir, preToolUseHook, phase: opts.phase });
```

- [ ] **Step 3: Run existing tests to verify no regression**

Run: `bun test src/__tests__/watch.test.ts`
Expected: All 26 tests PASS (existing tests don't exercise `dispatchPhase` directly)

- [ ] **Step 4: Commit**

```bash
git add cli/src/commands/watch.ts
git commit -m "feat(watch-dispatch-fix): add rebase and HITL to dispatchPhase"
```

---

### Task 2: Update skipPreDispatch comment in runner.ts

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/pipeline/runner.ts:115-118` (comment block)

- [ ] **Step 1: Update the comment**

In `cli/src/pipeline/runner.ts`, replace lines 115-118:

```typescript
  if (config.skipPreDispatch) {
    // Watch loop path: session factory already handled worktree/rebase/settings.
    // Only compute the worktree path for post-dispatch steps.
    worktreePath = resolve(config.projectRoot, ".claude", "worktrees", epicSlug);
```

with:

```typescript
  if (config.skipPreDispatch) {
    // Watch loop path: dispatchPhase() in watch.ts handles worktree creation,
    // rebase onto main, and HITL settings write before SDK dispatch.
    // The runner only needs the worktree path for post-dispatch steps (5-9).
    worktreePath = resolve(config.projectRoot, ".claude", "worktrees", epicSlug);
```

- [ ] **Step 2: Run pipeline-runner tests**

Run: `bun test src/__tests__/pipeline-runner.test.ts`
Expected: All 25 tests PASS (comment-only change)

- [ ] **Step 3: Commit**

```bash
git add cli/src/pipeline/runner.ts
git commit -m "docs(watch-dispatch-fix): update skipPreDispatch comment to match fix"
```

---

### Task 3: Add tests for dispatchPhase rebase and HITL calls

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/__tests__/watch.test.ts` (add new test section)

- [ ] **Step 1: Add dispatchPhase tests to watch.test.ts**

At the end of `cli/src/__tests__/watch.test.ts`, before the final closing (or at the bottom of the file), add a new `describe` block. This requires:

1. Module-level mocks for `../git/worktree.js`, `../hooks/hitl-settings.js`, and `../config.js` — BUT watch.test.ts already imports from `../commands/watch-loop.js` and `../dispatch/factory.js` which have their own dependencies. We need to mock at module level before the existing imports.

Since watch.test.ts already has imports at the top that pull in the real modules, and `dispatchPhase` is in `watch.ts` (not `watch-loop.js`), we need a separate test file to avoid conflicting with existing mocks.

Create a new test file: `cli/src/__tests__/watch-dispatch.test.ts`

```typescript
import { describe, it, expect, beforeEach, mock } from "bun:test";
import { resolve } from "node:path";

// ---------- module-level mocks (must precede imports) ----------

const mockWorktreeCreate = mock(async (slug: string) => ({
  slug,
  path: `/tmp/test-project/.claude/worktrees/${slug}`,
  branch: `feature/${slug}`,
}));
const mockRebase = mock(async (_phase: string, _opts?: any) => ({
  outcome: "success" as const,
  message: "rebased onto main",
}));

mock.module("../git/worktree.js", () => ({
  create: mockWorktreeCreate,
  rebase: mockRebase,
}));

const mockCleanHitlSettings = mock((_dir: string) => {});
const mockWriteHitlSettings = mock((_opts: any) => {});
const mockBuildPreToolUseHook = mock(() => ({ matcher: "AskUserQuestion", hooks: [] }));
const mockGetPhaseHitlProse = mock(() => "test prose");

mock.module("../hooks/hitl-settings.js", () => ({
  cleanHitlSettings: mockCleanHitlSettings,
  writeHitlSettings: mockWriteHitlSettings,
  buildPreToolUseHook: mockBuildPreToolUseHook,
  getPhaseHitlProse: mockGetPhaseHitlProse,
}));

const mockLoadConfig = mock((_root: string) => ({
  hitl: {
    model: "haiku",
    timeout: 30,
    design: "defer design",
    plan: "defer plan",
    implement: "defer implement",
    validate: "defer validate",
    release: "defer release",
  },
  github: { enabled: false },
  cli: {},
}));

mock.module("../config.js", () => ({
  loadConfig: mockLoadConfig,
}));

// Mock the SDK import to throw — forces CLI fallback path
// We mock Bun.spawn via the global to avoid actual process spawning
const mockSpawn = mock(() => ({
  stdout: new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("{}"));
      controller.close();
    },
  }),
  stderr: new ReadableStream({
    start(controller) {
      controller.close();
    },
  }),
  exited: Promise.resolve(0),
}));

// We need to prevent the real SDK import and Bun.spawn
// Instead, mock at the module level so dispatchPhase uses our mocks
mock.module("@anthropic-ai/claude-agent-sdk", () => {
  throw new Error("SDK not available");
});

// ---------- import after mocks ----------

import { dispatchPhase } from "../commands/watch.js";

// ---------- helpers ----------

function resetMocks() {
  mockWorktreeCreate.mockClear();
  mockRebase.mockClear();
  mockCleanHitlSettings.mockClear();
  mockWriteHitlSettings.mockClear();
  mockBuildPreToolUseHook.mockClear();
  mockGetPhaseHitlProse.mockClear();
  mockLoadConfig.mockClear();
}

// ---------- tests ----------

describe("dispatchPhase — rebase and HITL", () => {
  beforeEach(resetMocks);

  it("calls rebase with phase and worktree path after worktree creation", async () => {
    const ac = new AbortController();
    const handle = await dispatchPhase({
      epicSlug: "my-epic",
      phase: "plan",
      args: ["my-epic"],
      projectRoot: "/tmp/test-project",
      signal: ac.signal,
    });

    // rebase should have been called before the promise resolves
    expect(mockRebase).toHaveBeenCalledTimes(1);
    expect(mockRebase).toHaveBeenCalledWith("plan", {
      cwd: "/tmp/test-project/.claude/worktrees/my-epic",
    });

    // Clean up: abort and await to prevent unhandled rejections
    ac.abort();
    try { await handle.promise; } catch {}
  });

  it("calls the full HITL sequence with correct arguments", async () => {
    const ac = new AbortController();
    const handle = await dispatchPhase({
      epicSlug: "my-epic",
      phase: "implement",
      args: ["my-epic", "feat-a"],
      projectRoot: "/tmp/test-project",
      signal: ac.signal,
    });

    // loadConfig called to get HITL config
    expect(mockLoadConfig).toHaveBeenCalledTimes(1);
    expect(mockLoadConfig).toHaveBeenCalledWith("/tmp/test-project");

    // cleanHitlSettings called with worktree .claude dir
    expect(mockCleanHitlSettings).toHaveBeenCalledTimes(1);
    expect(mockCleanHitlSettings).toHaveBeenCalledWith(
      "/tmp/test-project/.claude/worktrees/my-epic/.claude",
    );

    // getPhaseHitlProse called with hitl config and phase
    expect(mockGetPhaseHitlProse).toHaveBeenCalledTimes(1);
    const hitlArg = mockGetPhaseHitlProse.mock.calls[0][0];
    expect(hitlArg.model).toBe("haiku");

    // buildPreToolUseHook called with prose, model, timeout
    expect(mockBuildPreToolUseHook).toHaveBeenCalledTimes(1);
    expect(mockBuildPreToolUseHook).toHaveBeenCalledWith("test prose", "haiku", 30);

    // writeHitlSettings called with claudeDir, hook, and phase
    expect(mockWriteHitlSettings).toHaveBeenCalledTimes(1);
    const writeArgs = mockWriteHitlSettings.mock.calls[0][0];
    expect(writeArgs.claudeDir).toBe(
      "/tmp/test-project/.claude/worktrees/my-epic/.claude",
    );
    expect(writeArgs.phase).toBe("implement");

    ac.abort();
    try { await handle.promise; } catch {}
  });

  it("calls rebase before HITL settings (ordering)", async () => {
    const callOrder: string[] = [];
    mockRebase.mockImplementation(async () => {
      callOrder.push("rebase");
      return { outcome: "success" as const, message: "ok" };
    });
    mockCleanHitlSettings.mockImplementation(() => {
      callOrder.push("cleanHitl");
    });

    const ac = new AbortController();
    const handle = await dispatchPhase({
      epicSlug: "my-epic",
      phase: "plan",
      args: ["my-epic"],
      projectRoot: "/tmp/test-project",
      signal: ac.signal,
    });

    expect(callOrder).toEqual(["rebase", "cleanHitl"]);

    ac.abort();
    try { await handle.promise; } catch {}
  });
});
```

- [ ] **Step 2: Run the new test file**

Run: `bun test src/__tests__/watch-dispatch.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 3: Run the full test suite to verify no regressions**

Run: `bun test src/__tests__/pipeline-runner.test.ts src/__tests__/watch.test.ts src/__tests__/watch-dispatch.test.ts`
Expected: All tests PASS across all 3 files

- [ ] **Step 4: Commit**

```bash
git add cli/src/__tests__/watch-dispatch.test.ts
git commit -m "test(watch-dispatch-fix): verify rebase and HITL in dispatchPhase"
```
