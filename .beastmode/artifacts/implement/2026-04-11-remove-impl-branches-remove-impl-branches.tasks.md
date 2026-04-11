# Remove Impl Branches — Write Plan

## Goal

Remove all impl branch infrastructure from the codebase. Parallel feature agents commit directly to the shared `feature/<slug>` branch. Wave-based file isolation is the concurrency mechanism.

## Architecture

- **Worktree module** (`cli/src/git/worktree.ts`): Delete `implBranchName()`, `createImplBranch()`, and the impl cleanup loop in `remove()`.
- **Commit issue ref** (`cli/src/git/commit-issue-ref.ts`): Delete `ImplBranchParts`, `parseImplBranch()`, impl branch routing in `resolveIssueNumber()`, and impl checkpoint routing in `resolveCommitIssueNumber()`.
- **Push module** (`cli/src/git/push.ts`): Remove `implBranchName` import and impl branch push.
- **Branch link** (`cli/src/github/branch-link.ts`): Remove `implBranchName` import and impl-to-feature linking block.
- **Runner** (`cli/src/pipeline/runner.ts`): Remove `createImplBranch` import and creation block.
- **Watch loop** (`cli/src/commands/watch-loop.ts`): Remove `createImplBranch` import and creation call in `dispatchFanOut()`.
- **Implement skill** (`plugin/skills/implement/SKILL.md`): Remove Phase 0 branch verification, Phase 3 rebase/merge, update constraints.
- **Implement dev agent** (`plugin/agents/implement-dev.md`): Update constraints to remove branch references.
- **Tests**: Delete dead test suites and update mocks.

## Tech Stack

TypeScript, Bun runtime, Vitest, Git

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/git/worktree.ts` | Modify | Delete `implBranchName`, `createImplBranch`, impl cleanup in `remove()` |
| `cli/src/git/commit-issue-ref.ts` | Modify | Delete `ImplBranchParts`, `parseImplBranch`, impl routing paths |
| `cli/src/git/push.ts` | Modify | Remove `implBranchName` import, simplify `pushBranches` |
| `cli/src/github/branch-link.ts` | Modify | Remove `implBranchName` import, remove impl linking block |
| `cli/src/pipeline/runner.ts` | Modify | Remove `createImplBranch` import and creation block |
| `cli/src/commands/watch-loop.ts` | Modify | Remove `createImplBranch` import and creation call |
| `cli/src/__tests__/worktree.test.ts` | Modify | Delete `implBranchName`, `createImplBranch`, impl cleanup test suites |
| `cli/src/__tests__/commit-issue-ref.test.ts` | Modify | Delete `parseImplBranch` tests, update `resolveIssueNumber` tests, update integration test |
| `cli/src/__tests__/branch-link.test.ts` | Modify | Remove `implBranchName` mock, update impl linking test |
| `cli/src/__tests__/git-push.test.ts` | Modify | Remove `implBranchName` mock, update impl push test |
| `cli/src/__tests__/pipeline-runner.test.ts` | Modify | Remove `createImplBranch` mock |
| `plugin/skills/implement/SKILL.md` | Modify | Remove Phase 0 verification, Phase 3 rebase, update constraints |
| `plugin/agents/implement-dev.md` | Modify | Update constraints |

---

### Task 1: Remove impl branch functions from worktree module

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/git/worktree.ts:74-114` (delete `implBranchName` and `createImplBranch`)
- Modify: `cli/src/git/worktree.ts:392-427` (remove impl cleanup from `remove()`)
- Test: `cli/src/__tests__/worktree.test.ts`

- [ ] **Step 1: Delete `implBranchName` and `createImplBranch` from worktree.ts**

Delete lines 74-114 (the `implBranchName` function and `createImplBranch` function).

- [ ] **Step 2: Remove impl branch cleanup from `remove()`**

In `remove()`, delete the block that lists and deletes `impl/<slug>--*` branches (lines 413-427). Also update the JSDoc comment at line 394 to remove the mention of impl branch deletion:

Change:
```typescript
/**
 * Remove a worktree and optionally delete its branch.
 * Also deletes all impl/<slug>--* branches for the slug.
 */
```
To:
```typescript
/**
 * Remove a worktree and optionally delete its branch.
 */
```

- [ ] **Step 3: Delete impl branch test suites from worktree.test.ts**

Delete the import of `implBranchName` and `createImplBranch` from line 5:

Change:
```typescript
import { git, gitCheck, create, enter, remove, ensureWorktree, exists, resolveMainBranch, rebase, implBranchName, createImplBranch } from "../git/worktree.js";
```
To:
```typescript
import { git, gitCheck, create, enter, remove, ensureWorktree, exists, resolveMainBranch, rebase } from "../git/worktree.js";
```

Delete these three `describe` blocks entirely:
- `describe("implBranchName", ...)` (lines 431-443)
- `describe("createImplBranch", ...)` (lines 445-499)
- `describe("impl branch cleanup on remove", ...)` (lines 501-555)

- [ ] **Step 4: Run tests to verify worktree module**

Run: `cd cli && bun --bun vitest run src/__tests__/worktree.test.ts --reporter=verbose`
Expected: PASS — all remaining tests pass, no references to removed functions

- [ ] **Step 5: Commit**

```bash
git add cli/src/git/worktree.ts cli/src/__tests__/worktree.test.ts
git commit -m "feat(remove-impl-branches): remove implBranchName and createImplBranch from worktree module"
```

---

### Task 2: Remove impl branch code from commit-issue-ref module

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/git/commit-issue-ref.ts:14-56,126-136`
- Test: `cli/src/__tests__/commit-issue-ref.test.ts`

- [ ] **Step 1: Delete `ImplBranchParts` interface and `parseImplBranch` from commit-issue-ref.ts**

Delete lines 14-34 (the `ImplBranchParts` interface and `parseImplBranch` function).

- [ ] **Step 2: Remove impl branch routing from `resolveIssueNumber`**

Delete the impl branch routing block at lines 50-56:

```typescript
  // Impl branch → feature issue
  const implParts = parseImplBranch(branchName);
  if (implParts) {
    const feature = features.find((f) => f.slug === implParts.feature);
    if (feature) return getSyncRef(syncRefs, feature.id)?.issue;
    return getSyncRef(syncRefs, epicId)?.issue;
  }
```

The function now starts with the feature branch check.

- [ ] **Step 3: Remove impl checkpoint routing from `resolveCommitIssueNumber`**

Delete lines 126-136 (the `implement(<slug>--<feature>):` pattern block):

```typescript
  // implement(<slug>--<feature>): pattern — impl branch checkpoint
  const implMatch = commitMessage.match(/^implement\([^)]*--([^)]+)\):/);
  if (implMatch) {
    const featureSlug = implMatch[1];
    const feature = features.find((f) => f.slug === featureSlug);
    if (feature) {
      const featureIssue = getSyncRef(syncRefs, feature.id)?.issue;
      if (featureIssue) return featureIssue;
    }
    return epicIssue;
  }
```

- [ ] **Step 4: Update commit-issue-ref.test.ts**

Remove `parseImplBranch` from the import:

```typescript
import {
  resolveIssueNumber,
  appendIssueRef,
  amendCommitWithIssueRef,
  resolveCommitIssueNumber,
  resolveRangeStart,
  amendCommitsInRange,
  type IssueRefFeature,
} from "../git/commit-issue-ref.js";
```

Delete the entire `describe("parseImplBranch", ...)` block (lines 20-46).

In `describe("resolveIssueNumber", ...)`:
- Delete the test at line 61: `"resolves feature issue for impl branch"`
- Delete the test at line 65: `"returns epic issue for impl branch with unknown feature (fallback)"`
- Delete the test at line 69: `"returns undefined for impl branch feature without sync ref"`

In `describe("resolveCommitIssueNumber", ...)`:
- Delete the test at line 153: `"returns feature issue for implement(<slug>--<feature>): prefix"`

In `describe("amendCommitWithIssueRef", ...)`:
- Delete the integration test at lines 219-235: `"amends impl task commit on impl branch with feature ref"` — this test creates an impl branch and commits on it, which is the removed functionality.

- [ ] **Step 5: Run tests to verify commit-issue-ref module**

Run: `cd cli && bun --bun vitest run src/__tests__/commit-issue-ref.test.ts --reporter=verbose`
Expected: PASS — all remaining tests pass

- [ ] **Step 6: Commit**

```bash
git add cli/src/git/commit-issue-ref.ts cli/src/__tests__/commit-issue-ref.test.ts
git commit -m "feat(remove-impl-branches): remove parseImplBranch and impl routing from commit-issue-ref"
```

---

### Task 3: Remove impl branch code from push, branch-link, runner, and watch-loop

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/git/push.ts`
- Modify: `cli/src/github/branch-link.ts`
- Modify: `cli/src/pipeline/runner.ts`
- Modify: `cli/src/commands/watch-loop.ts`
- Test: `cli/src/__tests__/git-push.test.ts`
- Test: `cli/src/__tests__/branch-link.test.ts`
- Test: `cli/src/__tests__/pipeline-runner.test.ts`

- [ ] **Step 1: Simplify push.ts**

Remove the `implBranchName` import from line 9:

```typescript
import { git } from "./worktree.js";
```

Remove the impl branch push block (lines 45-49). The function becomes:

```typescript
export async function pushBranches(opts: PushBranchesOpts): Promise<void> {
  const { epicSlug, cwd } = opts;

  // Always push the feature branch
  await git(["push", "origin", `feature/${epicSlug}`], { cwd, allowFailure: true });
}
```

Update the JSDoc for `pushBranches` — remove the sentence about impl branch pushing. Remove `featureSlug` from `PushBranchesOpts` if no other code uses it (check first — keep if it's used elsewhere). Actually, keep `PushBranchesOpts` unchanged since callers pass `featureSlug` and `phase` and changing the interface is out of scope.

Simplify the function body only — destructure just `epicSlug` and `cwd`, ignore `phase` and `featureSlug`:

```typescript
export async function pushBranches(opts: PushBranchesOpts): Promise<void> {
  const { epicSlug, cwd } = opts;
  await git(["push", "origin", `feature/${epicSlug}`], { cwd, allowFailure: true });
}
```

- [ ] **Step 2: Simplify branch-link.ts**

Remove `implBranchName` from the import at line 15:

```typescript
import { git } from "../git/worktree.js";
```

Delete the impl branch linking block (lines 73-85):

```typescript
  // Link impl branch -> feature issue (implement phase only)
  if (phase === "implement" && featureSlug && featureIssueNumber) {
    const implBranch = implBranchName(epicSlug, featureSlug);
    await linkOneBranch({
      repoId,
      repo,
      issueNumber: featureIssueNumber,
      branchName: implBranch,
      oid,
      cwd,
      logger: log,
    });
  }
```

Update the JSDoc at line 31 — remove the sentence: "During implement phase, also links the impl branch to the feature issue."

- [ ] **Step 3: Remove createImplBranch from runner.ts**

Remove `createImplBranch` from the import at line 27:

```typescript
import { rebase } from "../git/worktree.js";
```

Delete the impl branch creation block (lines 180-189):

```typescript
  // Create impl branch for implement phase (idempotent — skips if exists)
  if (config.phase === "implement" && config.featureSlug) {
    try {
      const implBranch = await createImplBranch(config.epicSlug, config.featureSlug, { cwd: worktreePath });
      logger.info(`impl branch: ${implBranch}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`impl branch creation failed: ${message}`);
    }
  }
```

- [ ] **Step 4: Remove createImplBranch from watch-loop.ts**

Remove the `createImplBranch` import at line 24:

```typescript
// (delete the entire line — nothing else imported from worktree.js at that line)
```

Delete the impl branch creation try-catch block in `dispatchFanOut` (lines 334-342):

```typescript
        // Create impl branch before dispatch — idempotent, skips if exists.
        // Best-effort: failure here should not block session dispatch.
        try {
          await createImplBranch(epic.slug, featureSlug, {
            cwd: resolve(this.config.projectRoot, ".claude", "worktrees", epic.slug),
          });
        } catch (branchErr) {
          this.logger.warn("impl branch creation failed", { feature: featureSlug, error: String(branchErr) });
        }
```

- [ ] **Step 5: Update git-push.test.ts**

Remove `implBranchName` from the mock at lines 9-12:

```typescript
vi.mock("../git/worktree.js", () => ({
  git: mockGit,
}));
```

Update the test `"pushes both feature and impl branch on implement phase with featureSlug"` (lines 64-77) — it should now only push the feature branch:

```typescript
    it("pushes only feature branch on implement phase with featureSlug", async () => {
      await pushBranches({
        epicSlug: "my-epic",
        phase: "implement",
        featureSlug: "my-feature",
        cwd: "/tmp",
      });

      const calls = mockGit.mock.calls;
      const pushCalls = calls.filter(([args]) => args[0] === "push");
      expect(pushCalls).toHaveLength(1);
      expect(pushCalls[0][0]).toEqual(["push", "origin", "feature/my-epic"]);
    });
```

- [ ] **Step 6: Update branch-link.test.ts**

Remove `implBranchName` from the mock at lines 17-20:

```typescript
vi.mock("../git/worktree.js", () => ({
  git: mockGit,
}));
```

Update the test `"links both feature and impl branches during implement phase"` (lines 58-77) — it should now only link the feature branch:

```typescript
    it("links only feature branch during implement phase", async () => {
      mockGhRepoNodeId.mockResolvedValue("R_repo123");
      mockGhIssueNodeId.mockResolvedValue("I_epic456");
      mockGhCreateLinkedBranch.mockResolvedValue("LB_1");

      await linkBranches({
        repo: "BugRoger/beastmode",
        epicSlug: "my-epic",
        epicIssueNumber: 100,
        featureSlug: "my-feature",
        featureIssueNumber: 200,
        phase: "implement",
      });

      expect(mockGhCreateLinkedBranch).toHaveBeenCalledTimes(1);
      expect(mockGhCreateLinkedBranch.mock.calls[0][2]).toBe("feature/my-epic");
    });
```

- [ ] **Step 7: Update pipeline-runner.test.ts**

Remove `createImplBranch` from the mock at line 28:

```typescript
vi.mock("../git/worktree.js", () => ({
  create: mockCreate,
  rebase: mockRebase,
  archive: mockArchive,
  remove: mockRemove,
}));
```

- [ ] **Step 8: Run all affected tests**

Run: `cd cli && bun --bun vitest run src/__tests__/git-push.test.ts src/__tests__/branch-link.test.ts src/__tests__/pipeline-runner.test.ts --reporter=verbose`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add cli/src/git/push.ts cli/src/github/branch-link.ts cli/src/pipeline/runner.ts cli/src/commands/watch-loop.ts cli/src/__tests__/git-push.test.ts cli/src/__tests__/branch-link.test.ts cli/src/__tests__/pipeline-runner.test.ts
git commit -m "feat(remove-impl-branches): remove impl branch code from push, branch-link, runner, and watch-loop"
```

---

### Task 4: Update implement skill and dev agent documentation

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `plugin/skills/implement/SKILL.md`
- Modify: `plugin/agents/implement-dev.md`

- [ ] **Step 1: Remove Phase 0 Step 1 from SKILL.md**

Delete the entire "### 1. Verify Implementation Branch" section (lines 25-38), including the bash script and error message. Keep "### 2. Prepare Environment" and renumber it to "### 1. Prepare Environment".

- [ ] **Step 2: Remove Phase 3 Step 2 from SKILL.md**

Delete the entire "### 2. Rebase Implementation Branch" section (lines 427-482), including all sub-sections about conflict resolution.

Renumber "### 3. Commit and Handoff" to "### 2. Commit and Handoff".

Update the text in this section — remove "After successful rebase and fast-forward, " prefix. The section should read:

```markdown
### 2. Commit and Handoff

Commit the implementation report on the feature branch:

\`\`\`bash
git add .beastmode/artifacts/implement/
git commit -m "implement(<epic-name>-<feature-name>): checkpoint"
\`\`\`
```

- [ ] **Step 3: Update Subagent Safety constraint in SKILL.md**

Change line 518 from:

```
- Agents commit per task on the impl branch (`impl/<slug>--<feature-name>`) only — never push, switch branches, or commit to the worktree branch
```

To:

```
- Agents commit per task on the feature branch using `git add <files>` + `git commit` — never push or switch branches
```

- [ ] **Step 4: Update implement-dev.md constraints**

Change lines 123-125 from:

```
- Do NOT switch branches — stay on your impl branch
- Do NOT push to remote
- Do NOT commit to any branch except your current impl branch
```

To:

```
- Do NOT switch branches — stay on the current branch
- Do NOT push to remote
- Commit only your task's files using `git add <files>` + `git commit` on the current branch
```

- [ ] **Step 5: Commit**

```bash
git add plugin/skills/implement/SKILL.md plugin/agents/implement-dev.md
git commit -m "feat(remove-impl-branches): remove impl branch references from skill and agent docs"
```

---

### Task 5: Full test suite verification

**Wave:** 3
**Depends on:** Task 1, Task 2, Task 3

**Files:**
- (no files to modify — verification only)

- [ ] **Step 1: Run full test suite**

Run: `cd cli && bun --bun vitest run --reporter=verbose`
Expected: PASS — all 1754+ tests pass (excluding the 4 pre-existing Bun global failures)

- [ ] **Step 2: Verify no dead imports remain**

Run: `cd cli && grep -rn 'implBranchName\|createImplBranch\|parseImplBranch\|ImplBranchParts' src/`
Expected: No output (zero matches)

- [ ] **Step 3: Verify no impl branch string patterns in source**

Run: `cd cli && grep -rn 'impl/' src/ --include='*.ts' | grep -v '__tests__' | grep -v 'node_modules'`
Expected: No matches in production code

- [ ] **Step 4: Commit verification results**

No commit needed — this is a verification-only task.
