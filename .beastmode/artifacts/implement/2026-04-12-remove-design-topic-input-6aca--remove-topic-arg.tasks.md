# Remove Topic Arg -- Implementation Tasks

## Goal

Remove the topic argument from `beastmode design`. The design command should accept zero positional arguments and error clearly when arguments are passed.

## Architecture

**Runtime:** Bun + TypeScript
**Test runner:** vitest (via `bun --bun vitest run`)
**Test location:** `cli/src/__tests__/`
**Source location:** `cli/src/`

## Context

The design phase currently accepts an optional topic argument (`beastmode design [topic]`). The topic flows through `phase.ts` as `worktreeSlug = args[0] ?? ""` and into the interactive runner where it becomes part of the prompt `/beastmode:design <topic>`. This is redundant -- the Claude skill immediately asks the user to describe their problem, so the topic was being stated twice.

### Key files and current behavior

- `cli/src/commands/phase.ts` -- lines 62-65: `if (phase === "design") { worktreeSlug = args[0] ?? "" }`. This reads `args[0]` as a worktree slug for design. Must be replaced with an empty-string assignment and an early guard rejecting any positional args.
- `cli/src/dispatch/factory.ts` -- line 72: `const prompt = \`/beastmode:${phase} ${args.join(" ")}\`.trim()`. No changes needed. When args is empty, `args.join(" ")` produces `""` and `.trim()` cleans the trailing space, yielding `/beastmode:design`.
- `cli/src/index.ts` -- line 19: help text shows `beastmode design [topic]`. Must change to `beastmode design`.
- `cli/src/__tests__/interactive-runner.test.ts` -- design test passes `args: ["my-topic"]` and asserts prompt includes topic. Must change to empty args and assert `/beastmode:design`. Several other tests pass `args: ["topic"]` for design phase in spawn-options and exit-status tests.
- `cli/src/__tests__/watch-events.test.ts` -- `makeEpic()` helper defaults to `nextAction: { phase: "design", args: ["test-epic"] }`. These are watch-loop event-emission tests where the `args` field is part of `NextAction` (the watch loop's dispatch metadata), not the CLI positional args. The watch loop never dispatches design (dispatch type is `"skip"` in scan.ts). These test fixtures use `"design"` as a convenient phase label. They do NOT flow through `phase.ts` or the interactive runner, so changing them is not required by the feature spec. Leaving them unchanged avoids churning unrelated tests.

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/commands/phase.ts` | Modify (lines 1-13 JSDoc, lines 62-65 design branch) | Remove design-specific `args[0]` read, add args rejection guard |
| `cli/src/index.ts` | Modify (line 19 help text) | Update usage line from `design [topic]` to `design` |
| `cli/src/__tests__/interactive-runner.test.ts` | Modify (multiple test cases) | Update design-phase fixtures to empty args, add rejection guard test |
| `cli/src/__tests__/phase-command.test.ts` | Create | Test the args rejection guard in phase.ts (process.exit on design with args) |

## Wave Isolation

| Wave | Tasks | Files | Parallel-safe | Reason |
|------|-------|-------|---------------|--------|
| 1 | T1, T2 | T1: `cli/src/commands/phase.ts` / T2: `cli/src/index.ts` | yes | disjoint files, no shared state |
| 2 | T3, T4 | T3: `cli/src/__tests__/interactive-runner.test.ts` / T4: `cli/src/__tests__/phase-command.test.ts` | yes | disjoint files, no shared state; T3 and T4 test different modules |

---

### Task 1: Remove design args branch and add rejection guard in phase.ts

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/commands/phase.ts:1-13` (JSDoc)
- Modify: `cli/src/commands/phase.ts:60-66` (design branch)

This task modifies the phase command to: (a) always assign empty string for design's worktreeSlug, (b) add an early guard rejecting positional args for design with a clear error and exit code 1, (c) update JSDoc.

- [x] **Step 1: Update the JSDoc comment**

In `cli/src/commands/phase.ts`, replace the JSDoc block at the top of the file (lines 1-13):

```typescript
/**
 * `beastmode <phase> <args...>`
 *
 * Thin CLI wrapper: parses context, selects dispatch strategy, delegates to
 * pipeline/runner.run() for the full 9-step pipeline.
 *
 * Two invocation contexts:
 *   1. Manual -- user runs `beastmode design` from the project root.
 *      Delegates to the pipeline runner for worktree + dispatch + post-dispatch.
 *   2. Cmux -- the watch loop already created the worktree and CDed into it.
 *      Runs interactive dispatch only; post-dispatch is handled by the watch
 *      loop's ReconcilingFactory.
 */
```

The change is on line 8: `beastmode design <topic>` becomes `beastmode design`.

- [x] **Step 2: Replace the design branch with an args guard and empty slug**

In `cli/src/commands/phase.ts`, replace lines 60-66 (the `let worktreeSlug` declaration through the design `if` body):

Old code:
```typescript
  let worktreeSlug: string;

  if (phase === "design") {
    // If an existing slug was passed (re-dispatch), reuse it.
    // Otherwise pass empty — the runner creates the placeholder epic at Step 0.
    worktreeSlug = args[0] ?? "";
  } else {
```

New code:
```typescript
  let worktreeSlug: string;

  if (phase === "design") {
    if (args.length > 0) {
      logger.error(
        "The topic argument was removed. Run `beastmode design` with no arguments — the design session will ask for your problem description.",
      );
      process.exit(1);
    }
    worktreeSlug = "";
  } else {
```

- [x] **Step 3: Run existing tests to verify no regressions in non-design phases**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/remove-design-topic-input-6aca/cli && bun --bun vitest run src/__tests__/pipeline-runner.test.ts -v`
Expected: PASS (these tests use `phase: "plan"` fixtures, unaffected by design changes)

- [x] **Step 4: Commit**

```bash
cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/remove-design-topic-input-6aca
git add cli/src/commands/phase.ts
git commit -m "feat(remove-topic-arg): remove design args branch, add rejection guard"
```

---

### Task 2: Update help text in index.ts

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/index.ts:19`

- [x] **Step 1: Update the design usage line**

In `cli/src/index.ts`, change line 19 from:

```typescript
  beastmode design [topic]             Start a new design
```

to:

```typescript
  beastmode design                     Start a new design
```

Preserve the alignment: the description text "Start a new design" should align with the other description columns. The original line has spaces between `[topic]` and `Start` to maintain column alignment. Removing `[topic]` (7 chars) means adding 7 spaces to maintain alignment.

- [x] **Step 2: Verify help output visually**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/remove-design-topic-input-6aca/cli && bun run src/index.ts help`
Expected: Output shows `beastmode design                     Start a new design` with no `[topic]` placeholder. Column alignment matches other subcommands.

- [x] **Step 3: Commit**

```bash
cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/remove-design-topic-input-6aca
git add cli/src/index.ts
git commit -m "feat(remove-topic-arg): update help text to remove [topic] placeholder"
```

---

### Task 3: Update interactive-runner test fixtures for design phase

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/__tests__/interactive-runner.test.ts`

This task updates all design-phase test fixtures to use empty args arrays and adjusts the prompt-construction assertion.

- [x] **Step 1: Update the prompt-construction test for design phase**

In `cli/src/__tests__/interactive-runner.test.ts`, find the test at line 42:

```typescript
    test("design phase constructs /beastmode:design <topic>", async () => {
      const { runInteractive } = await import(
        "../dispatch/factory"
      );
      const promise = runInteractive({
        phase: "design",
        args: ["my-topic"],
        cwd: "/test",
      });
      resolveExited(0);
      await promise;

      expect(spawnSpy).toHaveBeenCalledTimes(1);
      const [cmd] = spawnSpy.mock.calls[0];
      expect(cmd).toEqual([
        "claude",
        "--dangerously-skip-permissions",
        "--",
        "/beastmode:design my-topic",
      ]);
    });
```

Replace with:

```typescript
    test("design phase constructs /beastmode:design with no args", async () => {
      const { runInteractive } = await import(
        "../dispatch/factory"
      );
      const promise = runInteractive({
        phase: "design",
        args: [],
        cwd: "/test",
      });
      resolveExited(0);
      await promise;

      expect(spawnSpy).toHaveBeenCalledTimes(1);
      const [cmd] = spawnSpy.mock.calls[0];
      expect(cmd).toEqual([
        "claude",
        "--dangerously-skip-permissions",
        "--",
        "/beastmode:design",
      ]);
    });
```

- [x] **Step 2: Update the spawn-options test**

In `cli/src/__tests__/interactive-runner.test.ts`, find the test "passes cwd and inherited stdio" at line 151. Change:

```typescript
      const promise = runInteractive({
        phase: "design",
        args: ["topic"],
        cwd: "/my/project",
      });
```

to:

```typescript
      const promise = runInteractive({
        phase: "design",
        args: [],
        cwd: "/my/project",
      });
```

- [x] **Step 3: Update exit-status tests**

In `cli/src/__tests__/interactive-runner.test.ts`, update the following tests that use `phase: "design"` with `args: ["topic"]`:

Test "exit code 0 returns success" (line 173):
```typescript
      const promise = runInteractive({
        phase: "design",
        args: ["topic"],
        cwd: "/test",
      });
```
Change `args: ["topic"]` to `args: []`.

Test "returns duration_ms" (line 201):
```typescript
      const promise = runInteractive({
        phase: "design",
        args: ["topic"],
        cwd: "/test",
      });
```
Change `args: ["topic"]` to `args: []`.

Test "session_id is null" (line 215):
```typescript
      const promise = runInteractive({
        phase: "design",
        args: ["topic"],
        cwd: "/test",
      });
```
Change `args: ["topic"]` to `args: []`.

- [x] **Step 4: Update SIGINT handling tests**

In `cli/src/__tests__/interactive-runner.test.ts`, update the SIGINT tests:

Test "SIGINT propagates kill to child process" (line 232):
```typescript
      const promise = runInteractive({
        phase: "design",
        args: ["topic"],
        cwd: "/test",
      });
```
Change `args: ["topic"]` to `args: []`.

Test "SIGINT listener is cleaned up after completion" (line 255):
```typescript
      const promise = runInteractive({
        phase: "design",
        args: ["topic"],
        cwd: "/test",
      });
```
Change `args: ["topic"]` to `args: []`.

- [x] **Step 5: Run the updated test file**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/remove-design-topic-input-6aca/cli && bun --bun vitest run src/__tests__/interactive-runner.test.ts -v`
Expected: All tests PASS. The prompt-construction test asserts `/beastmode:design` (no trailing topic). The `factory.ts` `runInteractive` function is unchanged -- `args.join(" ")` on `[]` produces `""`, and `.trim()` yields `/beastmode:design`.

- [x] **Step 6: Commit**

```bash
cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/remove-design-topic-input-6aca
git add cli/src/__tests__/interactive-runner.test.ts
git commit -m "test(remove-topic-arg): update interactive-runner design fixtures to empty args"
```

---

### Task 4: Add args rejection guard test for design phase

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Create: `cli/src/__tests__/phase-command.test.ts`

This task creates a test that verifies the args rejection guard in `phase.ts` -- when `phase === "design"` and `args.length > 0`, the command should log an error and call `process.exit(1)`.

- [x] **Step 1: Write the test file**

Create `cli/src/__tests__/phase-command.test.ts`:

```typescript
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Tests for the design-phase args rejection guard in phase.ts.
 *
 * The phaseCommand function calls process.exit(1) when design receives
 * positional args. We mock process.exit and the git helpers to test
 * this in isolation.
 */

// Mock git helpers to avoid real filesystem checks
vi.mock("../git/index.js", () => ({
  isInsideWorktree: vi.fn(async () => false),
  resolveMainCheckoutRoot: vi.fn(async () => "/mock/root"),
}));

// Mock store to avoid real filesystem reads
vi.mock("../store/index.js", () => ({
  JsonFileStore: vi.fn().mockImplementation(() => ({
    load: vi.fn(),
  })),
  resolveIdentifier: vi.fn(),
}));

// Mock config to avoid filesystem reads
vi.mock("../config.js", () => ({
  loadConfig: vi.fn(() => ({
    hitl: { model: "test", timeout: 30, design: "", plan: "", implement: "", validate: "", release: "" },
    "file-permissions": { timeout: 60, "claude-settings": "" },
    github: { enabled: false },
  })),
  getCategoryProse: vi.fn(() => ""),
}));

// Mock logger to capture error messages
const mockError = vi.fn();
vi.mock("../logger.js", () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: mockError,
    child: vi.fn(),
  })),
  createStdioSink: vi.fn(),
}));

describe("phaseCommand design args guard", () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockError.mockClear();
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as any);
  });

  afterEach(() => {
    exitSpy.mockRestore();
  });

  test("design with positional args prints error and exits with code 1", async () => {
    const { phaseCommand } = await import("../commands/phase");

    await expect(
      phaseCommand("design", ["something"], {
        hitl: { model: "test", timeout: 30, design: "", plan: "", implement: "", validate: "", release: "" },
        "file-permissions": { timeout: 60, "claude-settings": "" },
        github: { enabled: false },
      }),
    ).rejects.toThrow("process.exit called");

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(mockError).toHaveBeenCalledWith(
      expect.stringContaining("topic argument was removed"),
    );
  });

  test("design with multiple positional args also rejects", async () => {
    const { phaseCommand } = await import("../commands/phase");

    await expect(
      phaseCommand("design", ["some", "topic"], {
        hitl: { model: "test", timeout: 30, design: "", plan: "", implement: "", validate: "", release: "" },
        "file-permissions": { timeout: 60, "claude-settings": "" },
        github: { enabled: false },
      }),
    ).rejects.toThrow("process.exit called");

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  test("design with empty args does not exit early", async () => {
    // This test verifies the happy path doesn't trigger the guard.
    // It will still fail downstream (no real filesystem), but it should
    // NOT call process.exit(1) from the args guard.
    const { phaseCommand } = await import("../commands/phase");

    // The function will throw/exit for other reasons (mocked deps),
    // but it should NOT be the args guard that triggers it.
    try {
      await phaseCommand("design", [], {
        hitl: { model: "test", timeout: 30, design: "", plan: "", implement: "", validate: "", release: "" },
        "file-permissions": { timeout: 60, "claude-settings": "" },
        github: { enabled: false },
      });
    } catch {
      // Expected -- downstream mocks are incomplete
    }

    // The args guard specifically calls exit(1) with the topic-removed message.
    // If exit was called, it should NOT have been called with our specific message.
    const topicRemovedCalls = mockError.mock.calls.filter(
      (call: any[]) => typeof call[0] === "string" && call[0].includes("topic argument was removed"),
    );
    expect(topicRemovedCalls).toHaveLength(0);
  });
});
```

- [x] **Step 2: Run the new test**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/remove-design-topic-input-6aca/cli && bun --bun vitest run src/__tests__/phase-command.test.ts -v`
Expected: All 3 tests PASS. The first two verify the guard triggers. The third verifies the guard does not trigger for empty args.

- [x] **Step 3: Run the full test suite to check for regressions**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/remove-design-topic-input-6aca/cli && bun --bun vitest run -v`
Expected: All tests PASS, no regressions.

- [x] **Step 4: Commit**

```bash
cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/remove-design-topic-input-6aca
git add cli/src/__tests__/phase-command.test.ts
git commit -m "test(remove-topic-arg): add args rejection guard tests for design phase"
```
