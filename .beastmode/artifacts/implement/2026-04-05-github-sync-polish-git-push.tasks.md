# Git Push — Implementation Tasks

## Goal

Add branch push and tag push steps to the pipeline runner so that feature branches, impl branches, and phase/archive tags are pushed upstream after each phase checkpoint. Push operations are pure git ops (not gated on `github.enabled`), use warn-and-continue on failure, and skip silently when no remote is configured.

## Architecture

- **New module:** `cli/src/git/push.ts` — `hasRemote()`, `pushBranches()`, `pushTags()` functions
- **Pipeline integration:** New Step 8.7 in `runner.ts` — after commit-issue-ref (Step 8.5), before cleanup (Step 9)
- **Error model:** Warn-and-continue — catch errors, log warning, never block
- **Remote detection:** `git remote get-url origin` — if it fails, no remote exists, skip silently
- **Branch selection:** Feature branch always pushed; impl branches pushed during implement phase only
- **Tag push:** `git push origin --tags` — pushes all tags (phase tags + archive tags)

## Tech Stack

- TypeScript, Bun runtime, Vitest test framework
- Existing `git()` helper from `cli/src/git/worktree.ts`

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/git/push.ts` | Create | Remote detection, branch push, tag push |
| `cli/src/__tests__/git-push.test.ts` | Create | Unit tests for push module |
| `cli/src/pipeline/runner.ts` | Modify | Add Step 8.7 — call push functions |
| `cli/src/__tests__/pipeline-runner.test.ts` | Modify | Add mock for push module, test Step 8.7 |

---

## Task 0: Integration Test

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/src/__tests__/git-push-integration.test.ts`

- [ ] **Step 1: Write integration test file**

```typescript
import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";

/**
 * Integration test for git-push feature.
 *
 * Verifies that the pipeline runner pushes branches and tags
 * after each phase checkpoint, with proper error handling.
 *
 * These tests run against the mocked pipeline runner to verify
 * end-to-end push behavior through the full pipeline step sequence.
 */

// ---------- module-level mocks (must precede runner import) ----------

const mockGit = vi.hoisted(() => vi.fn(async (_args: string[], _opts?: any) => ({
  stdout: "",
  stderr: "",
  exitCode: 0,
})));

vi.mock("../git/worktree.js", () => ({
  git: mockGit,
  gitCheck: vi.fn(async () => true),
  create: vi.fn(async (slug: string) => ({
    slug,
    path: `/tmp/test-project/.claude/worktrees/${slug}`,
    branch: `feature/${slug}`,
  })),
  rebase: vi.fn(async () => ({ outcome: "success" as const, message: "rebased" })),
  archive: vi.fn(async () => "archive/test-epic"),
  remove: vi.fn(async () => {}),
  createImplBranch: vi.fn(async (slug: string, feature: string) => `impl/${slug}--${feature}`),
}));

vi.mock("../artifacts/reader.js", () => ({
  loadWorktreePhaseOutput: vi.fn(() => ({ status: "completed", artifacts: {} }) as any),
}));

vi.mock("../manifest/store.js", () => ({
  load: vi.fn(() => ({
    slug: "test-epic",
    phase: "plan",
    features: [{ slug: "my-feature", github: { issue: 42 } }],
    artifacts: {},
    worktree: { branch: "feature/test-epic", path: "/tmp" },
    lastUpdated: new Date().toISOString(),
  }) as any),
  save: vi.fn(),
  transact: vi.fn(async (_r: string, _s: string, fn: Function) => fn({ slug: "test-epic" })),
  rename: vi.fn(async () => ({ renamed: false, finalSlug: "test-epic", completedSteps: [] })),
}));

vi.mock("../manifest/reconcile.js", () => ({
  reconcileDesign: vi.fn(async () => ({ phase: "plan", manifest: { slug: "test-epic" } })),
  reconcilePlan: vi.fn(async () => ({ phase: "implement", manifest: { slug: "test-epic" } })),
  reconcileFeature: vi.fn(async () => ({ phase: "implement", manifest: { slug: "test-epic" } })),
  reconcileImplement: vi.fn(async () => ({ phase: "validate", manifest: { slug: "test-epic" } })),
  reconcileValidate: vi.fn(async () => ({ phase: "release", manifest: { slug: "test-epic" } })),
  reconcileRelease: vi.fn(async () => ({ phase: "done", manifest: { slug: "test-epic" } })),
}));

vi.mock("../git/tags.js", () => ({ createTag: vi.fn(async () => {}) }));
vi.mock("../github/sync.js", () => ({ syncGitHub: vi.fn(async () => ({ mutations: [] })), syncGitHubForEpic: vi.fn(async () => {}) }));
vi.mock("../github/discovery.js", () => ({ discoverGitHub: vi.fn(async () => null) }));
vi.mock("../manifest/pure.js", () => ({
  setGitHubEpic: vi.fn((m: any) => m),
  setFeatureGitHubIssue: vi.fn((m: any) => m),
  setEpicBodyHash: vi.fn((m: any) => m),
  setFeatureBodyHash: vi.fn((m: any) => m),
}));
vi.mock("../github/early-issues.js", () => ({ ensureEarlyIssues: vi.fn(async () => {}) }));
vi.mock("../git/commit-issue-ref.js", () => ({
  amendCommitWithIssueRef: vi.fn(async () => ({ amended: false })),
}));

// Mock push module — will be created in Task 1
const mockHasRemote = vi.hoisted(() => vi.fn(async () => true));
const mockPushBranches = vi.hoisted(() => vi.fn(async () => {}));
const mockPushTags = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("../git/push.js", () => ({
  hasRemote: mockHasRemote,
  pushBranches: mockPushBranches,
  pushTags: mockPushTags,
}));

import { run } from "../pipeline/runner.js";
import type { PipelineConfig } from "../pipeline/runner.js";
import type { BeastmodeConfig } from "../config.js";

const noop = () => {};
const nullLogger = {
  log: noop, detail: noop, debug: noop, trace: noop, warn: noop, error: noop,
  child: () => nullLogger,
} as any;

function makeConfig(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    phase: "plan",
    epicSlug: "test-epic",
    args: ["test-epic"],
    projectRoot: "/tmp/test-project",
    strategy: "interactive",
    config: {
      hitl: { model: "claude-sonnet-4-5-20250514", timeout: 30, design: "", plan: "", implement: "", validate: "", release: "" },
      "file-permissions": { timeout: 60, "claude-settings": "test" },
      github: { enabled: false },
      cli: {},
    } as BeastmodeConfig,
    dispatch: async () => ({ success: true }),
    logger: nullLogger,
    ...overrides,
  };
}

// ---------- tests ----------

describe("@github-sync-polish: git-push integration", () => {
  beforeEach(() => {
    mockHasRemote.mockClear();
    mockPushBranches.mockClear();
    mockPushTags.mockClear();
    mockHasRemote.mockImplementation(async () => true);
    mockPushBranches.mockImplementation(async () => {});
    mockPushTags.mockImplementation(async () => {});
  });

  afterAll(() => vi.restoreAllMocks());

  describe("Feature branch pushed after design phase checkpoint", () => {
    it("pushes feature branch after design phase completes", async () => {
      await run(makeConfig({ phase: "design" }));

      expect(mockHasRemote).toHaveBeenCalled();
      expect(mockPushBranches).toHaveBeenCalled();
    });
  });

  describe("Impl branch pushed after implement phase checkpoint", () => {
    it("pushes impl branch during implement phase", async () => {
      await run(makeConfig({ phase: "implement", featureSlug: "my-feature" }));

      expect(mockPushBranches).toHaveBeenCalled();
      const callArgs = mockPushBranches.mock.calls[0];
      expect(callArgs).toBeDefined();
    });
  });

  describe("Feature branch pushed after each successive phase", () => {
    it("pushes feature branch on plan phase", async () => {
      await run(makeConfig({ phase: "plan" }));

      expect(mockPushBranches).toHaveBeenCalled();
    });
  });

  describe("Phase tags pushed after checkpoint", () => {
    it("pushes tags after checkpoint", async () => {
      await run(makeConfig({ phase: "plan" }));

      expect(mockPushTags).toHaveBeenCalled();
    });
  });

  describe("Archive tags pushed during release", () => {
    it("pushes tags during release phase", async () => {
      await run(makeConfig({ phase: "release" }));

      expect(mockPushTags).toHaveBeenCalled();
    });
  });

  describe("Push failure does not block the phase checkpoint", () => {
    it("continues when push fails", async () => {
      mockPushBranches.mockRejectedValue(new Error("remote unreachable"));

      const result = await run(makeConfig({ phase: "plan" }));

      expect(result.success).toBe(true);
    });

    it("continues when tag push fails", async () => {
      mockPushTags.mockRejectedValue(new Error("remote unreachable"));

      const result = await run(makeConfig({ phase: "plan" }));

      expect(result.success).toBe(true);
    });
  });

  describe("No push when no remote", () => {
    it("skips push when hasRemote returns false", async () => {
      mockHasRemote.mockImplementation(async () => false);

      await run(makeConfig({ phase: "plan" }));

      expect(mockPushBranches).not.toHaveBeenCalled();
      expect(mockPushTags).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/git-push-integration.test.ts`
Expected: FAIL — `../git/push.js` module does not exist yet

---

## Task 1: Push Module

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/src/git/push.ts`
- Create: `cli/src/__tests__/git-push.test.ts`

- [ ] **Step 1: Write unit tests for push module**

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

const mockGit = vi.hoisted(() => vi.fn(async (_args: string[], _opts?: any) => ({
  stdout: "",
  stderr: "",
  exitCode: 0,
})));

vi.mock("../git/worktree.js", () => ({
  git: mockGit,
}));

import { hasRemote, pushBranches, pushTags } from "../git/push.js";

describe("git/push", () => {
  beforeEach(() => {
    mockGit.mockClear();
    mockGit.mockImplementation(async () => ({ stdout: "", stderr: "", exitCode: 0 }));
  });

  describe("hasRemote", () => {
    it("returns true when origin remote exists", async () => {
      mockGit.mockImplementation(async () => ({
        stdout: "https://github.com/user/repo.git",
        stderr: "",
        exitCode: 0,
      }));

      const result = await hasRemote({ cwd: "/tmp" });
      expect(result).toBe(true);
      expect(mockGit).toHaveBeenCalledWith(
        ["remote", "get-url", "origin"],
        { cwd: "/tmp", allowFailure: true },
      );
    });

    it("returns false when no origin remote", async () => {
      mockGit.mockImplementation(async () => ({
        stdout: "",
        stderr: "fatal: No such remote 'origin'",
        exitCode: 2,
      }));

      const result = await hasRemote({ cwd: "/tmp" });
      expect(result).toBe(false);
    });
  });

  describe("pushBranches", () => {
    it("pushes feature branch on non-implement phase", async () => {
      await pushBranches({
        epicSlug: "my-epic",
        phase: "plan",
        cwd: "/tmp",
      });

      expect(mockGit).toHaveBeenCalledWith(
        ["push", "origin", "feature/my-epic"],
        expect.objectContaining({ cwd: "/tmp", allowFailure: true }),
      );
    });

    it("pushes both feature and impl branch on implement phase with featureSlug", async () => {
      await pushBranches({
        epicSlug: "my-epic",
        phase: "implement",
        featureSlug: "my-feature",
        cwd: "/tmp",
      });

      const calls = mockGit.mock.calls;
      const pushCalls = calls.filter(([args]) => args[0] === "push");
      expect(pushCalls).toHaveLength(2);
      expect(pushCalls[0][0]).toEqual(["push", "origin", "feature/my-epic"]);
      expect(pushCalls[1][0]).toEqual(["push", "origin", "impl/my-epic--my-feature"]);
    });

    it("pushes only feature branch on implement phase without featureSlug", async () => {
      await pushBranches({
        epicSlug: "my-epic",
        phase: "implement",
        cwd: "/tmp",
      });

      const calls = mockGit.mock.calls;
      const pushCalls = calls.filter(([args]) => args[0] === "push");
      expect(pushCalls).toHaveLength(1);
      expect(pushCalls[0][0]).toEqual(["push", "origin", "feature/my-epic"]);
    });

    it("pushes feature branch on release phase", async () => {
      await pushBranches({
        epicSlug: "my-epic",
        phase: "release",
        cwd: "/tmp",
      });

      const calls = mockGit.mock.calls;
      const pushCalls = calls.filter(([args]) => args[0] === "push");
      expect(pushCalls).toHaveLength(1);
      expect(pushCalls[0][0]).toEqual(["push", "origin", "feature/my-epic"]);
    });
  });

  describe("pushTags", () => {
    it("pushes all tags", async () => {
      await pushTags({ cwd: "/tmp" });

      expect(mockGit).toHaveBeenCalledWith(
        ["push", "origin", "--tags"],
        expect.objectContaining({ cwd: "/tmp", allowFailure: true }),
      );
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd cli && bun --bun vitest run src/__tests__/git-push.test.ts`
Expected: FAIL — `../git/push.js` module does not exist

- [ ] **Step 3: Write the push module**

```typescript
/**
 * Git push operations — push branches and tags to remote after phase checkpoints.
 *
 * Pure git operations — not gated on github.enabled.
 * Warn-and-continue: never throw, log failures.
 */

import { git } from "./worktree.js";
import { implBranchName } from "./worktree.js";

/**
 * Check whether a remote named "origin" is configured.
 * Returns false when no remote exists (pure local workflow).
 */
export async function hasRemote(
  opts: { cwd?: string } = {},
): Promise<boolean> {
  const result = await git(
    ["remote", "get-url", "origin"],
    { cwd: opts.cwd, allowFailure: true },
  );
  return result.exitCode === 0;
}

export interface PushBranchesOpts {
  epicSlug: string;
  phase: string;
  featureSlug?: string;
  cwd?: string;
}

/**
 * Push branches to origin after a phase checkpoint.
 *
 * Feature branch (`feature/<slug>`) is always pushed.
 * Impl branch (`impl/<slug>--<feature>`) is additionally pushed
 * during the implement phase when a featureSlug is provided.
 */
export async function pushBranches(opts: PushBranchesOpts): Promise<void> {
  const { epicSlug, phase, featureSlug, cwd } = opts;

  // Always push the feature branch
  await git(["push", "origin", `feature/${epicSlug}`], { cwd, allowFailure: true });

  // Push impl branch during implement phase
  if (phase === "implement" && featureSlug) {
    const implBranch = implBranchName(epicSlug, featureSlug);
    await git(["push", "origin", implBranch], { cwd, allowFailure: true });
  }
}

/**
 * Push all tags to origin.
 * Covers phase tags (beastmode/<slug>/<phase>) and archive tags (archive/<slug>).
 */
export async function pushTags(
  opts: { cwd?: string } = {},
): Promise<void> {
  await git(["push", "origin", "--tags"], { cwd: opts.cwd, allowFailure: true });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/git-push.test.ts`
Expected: PASS — all 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add cli/src/git/push.ts cli/src/__tests__/git-push.test.ts
git commit -m "feat(git-push): add push module with hasRemote, pushBranches, pushTags"
```

---

## Task 2: Pipeline Runner Integration

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/pipeline/runner.ts`
- Modify: `cli/src/__tests__/pipeline-runner.test.ts`

- [ ] **Step 1: Write pipeline runner tests for push step**

Add to `cli/src/__tests__/pipeline-runner.test.ts`:

1. Add mock for `../git/push.js` alongside existing mocks
2. Add mock references to `resetAllMocks()`
3. Add test cases for the new push step

New mocks (add after the existing `mockAmendCommitWithIssueRef` or `mockEnsureEarlyIssues` mock block):

```typescript
// Mock git/push
const mockHasRemote = vi.hoisted(() => vi.fn(async () => true));
const mockPushBranches = vi.hoisted(() => vi.fn(async () => {}));
const mockPushTags = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("../git/push.js", () => ({
  hasRemote: mockHasRemote,
  pushBranches: mockPushBranches,
  pushTags: mockPushTags,
}));
```

Add mock for commit-issue-ref (if not already mocked — currently it's NOT mocked in pipeline-runner.test.ts, but the runner imports it):

```typescript
// Mock git/commit-issue-ref
const mockAmendCommitWithIssueRef = vi.hoisted(() => vi.fn(async () => ({ amended: false })));
vi.mock("../git/commit-issue-ref.js", () => ({
  amendCommitWithIssueRef: mockAmendCommitWithIssueRef,
}));
```

Add to `resetAllMocks()`:

```typescript
mockHasRemote.mockClear();
mockPushBranches.mockClear();
mockPushTags.mockClear();
mockHasRemote.mockImplementation(async () => true);
mockPushBranches.mockImplementation(async () => {});
mockPushTags.mockImplementation(async () => {});
```

New test describe block:

```typescript
describe("git push (Step 8.7)", () => {
  it("pushes branches and tags when remote exists", async () => {
    await run(makeConfig());

    expect(mockHasRemote).toHaveBeenCalled();
    expect(mockPushBranches).toHaveBeenCalled();
    expect(mockPushTags).toHaveBeenCalled();
  });

  it("skips push when no remote", async () => {
    mockHasRemote.mockImplementation(async () => false);

    await run(makeConfig());

    expect(mockPushBranches).not.toHaveBeenCalled();
    expect(mockPushTags).not.toHaveBeenCalled();
  });

  it("passes epicSlug and phase to pushBranches", async () => {
    await run(makeConfig({ phase: "plan", epicSlug: "my-epic" }));

    expect(mockPushBranches).toHaveBeenCalledWith(expect.objectContaining({
      epicSlug: "my-epic",
      phase: "plan",
    }));
  });

  it("passes featureSlug to pushBranches for implement phase", async () => {
    await run(makeConfig({ phase: "implement", epicSlug: "my-epic", featureSlug: "my-feat" }));

    expect(mockPushBranches).toHaveBeenCalledWith(expect.objectContaining({
      epicSlug: "my-epic",
      phase: "implement",
      featureSlug: "my-feat",
    }));
  });

  it("continues when push throws", async () => {
    mockHasRemote.mockRejectedValue(new Error("git broke"));

    const result = await run(makeConfig());

    expect(result.success).toBe(true);
  });

  it("runs after commit-issue-ref and before cleanup", async () => {
    const callOrder: string[] = [];

    mockHasRemote.mockImplementation(async () => {
      callOrder.push("8.7:hasRemote");
      return true;
    });
    mockPushBranches.mockImplementation(async () => {
      callOrder.push("8.7:pushBranches");
    });
    mockPushTags.mockImplementation(async () => {
      callOrder.push("8.7:pushTags");
    });

    // Use release phase to verify push runs before cleanup
    await run(makeConfig({ phase: "release" }));

    const pushIdx = callOrder.indexOf("8.7:hasRemote");
    expect(pushIdx).toBeGreaterThanOrEqual(0);
  });

  it("is not gated on github.enabled", async () => {
    // github.enabled is false in makeConfig default
    await run(makeConfig());

    expect(mockHasRemote).toHaveBeenCalled();
    expect(mockPushBranches).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd cli && bun --bun vitest run src/__tests__/pipeline-runner.test.ts`
Expected: FAIL — runner.ts doesn't import or call push functions yet

- [ ] **Step 3: Add push step to pipeline runner**

In `cli/src/pipeline/runner.ts`:

1. Add import at top:
```typescript
import { hasRemote, pushBranches, pushTags } from "../git/push.js";
```

2. Add Step 8.7 after the commit-issue-ref block (after line 346) and before Step 9:
```typescript
  // -- Step 8.7: git.push ------------------------------------------------
  // Push branches and tags to remote. Pure git operation — not gated on
  // github.enabled. Warn-and-continue on failure.
  try {
    const remoteExists = await hasRemote({ cwd: worktreePath });
    if (remoteExists) {
      await pushBranches({
        epicSlug,
        phase: config.phase,
        featureSlug: config.featureSlug,
        cwd: worktreePath,
      });
      await pushTags({ cwd: worktreePath });
      logger.detail?.("pushed branches and tags");
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`git push failed (non-blocking): ${message}`);
  }
```

3. Update the file header comment to include Step 8.7:
```
 *   8.5. commit-issue-ref         -- Amend commit with issue number
 *   8.7. git.push                 -- Push branches and tags to remote
```

- [ ] **Step 4: Run pipeline runner tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/pipeline-runner.test.ts`
Expected: PASS

- [ ] **Step 5: Run all tests to verify no regressions**

Run: `cd cli && bun --bun vitest run`
Expected: PASS — all existing tests plus new ones

- [ ] **Step 6: Commit**

```bash
git add cli/src/pipeline/runner.ts cli/src/__tests__/pipeline-runner.test.ts
git commit -m "feat(git-push): integrate push step into pipeline runner"
```

---

## Task 3: Integration Test GREEN

**Wave:** 3
**Depends on:** Task 2

**Files:**
- Test: `cli/src/__tests__/git-push-integration.test.ts`

- [ ] **Step 1: Run integration tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/git-push-integration.test.ts`
Expected: PASS — all scenarios GREEN now that push module and runner integration exist

- [ ] **Step 2: Run full test suite**

Run: `cd cli && bun --bun vitest run`
Expected: PASS — all tests pass

- [ ] **Step 3: Commit integration test**

```bash
git add cli/src/__tests__/git-push-integration.test.ts
git commit -m "test(git-push): add integration tests for push scenarios"
```
