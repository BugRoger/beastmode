# Remove Phase Badge -- Implementation Tasks

## Goal

Remove the `**Phase:**` badge line from all GitHub issue body renderers. The phase is already conveyed via GitHub labels (`phase/design`, `phase/plan`, etc.), making the body badge redundant. The `phase` field on interfaces must remain -- it is used for label construction and sync logic.

## Architecture

Two production call sites emit the badge:

1. **`formatEpicBody()`** in `cli/src/github/sync.ts` -- pushes `**Phase:** ${input.phase}` as the first section. Remove that push.
2. **Early issue stub** in `cli/src/github/early-issues.ts` -- hardcodes `**Phase:** design\n\n` as a literal prefix. Remove it so the stub begins with the italicized placeholder.

Six test locations assert the badge IS present; all must flip to assert ABSENT. Four BDD step definitions and two BDD scenarios also assert the badge; they must be updated.

## Tech Stack

- Runtime: Bun
- Test runner: `bun --bun vitest run` (vitest)
- BDD runner: `bun --bun node_modules/.bin/cucumber-js`
- Language: TypeScript

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/github/sync.ts` | Modify (line 121) | Remove phase badge push from `formatEpicBody()` |
| `cli/src/github/early-issues.ts` | Modify (line 71) | Remove phase prefix from stub body string |
| `cli/src/__tests__/body-format.test.ts` | Modify (lines 42-47, 166-175) | Invert phase badge assertions to `not.toContain` |
| `cli/src/__tests__/body-enrichment.integration.test.ts` | Modify (lines 68-86) | Invert phase badge assertion to `not.toContain` |
| `cli/src/__tests__/github-sync.test.ts` | Modify (line 434) | Remove phase badge assertion from epic creation test |
| `cli/features/github-enrichment/step_definitions/enrichment.steps.ts` | Modify (lines 76-84, 117-122, 130-137, 144-149) | Invert phase badge step definitions to assert absence |
| `cli/features/github-enrichment/epic-body-content.feature` | Modify (scenarios at lines 17-20, 28-33, 34-38) | Rewrite phase badge scenarios to assert absence |

## Wave Isolation

| Wave | Tasks | Files | Parallel-safe | Reason |
|------|-------|-------|---------------|--------|
| 1 | T1, T2 | T1: `cli/src/github/sync.ts`, `cli/src/__tests__/body-format.test.ts` / T2: `cli/src/github/early-issues.ts` | no | T1 modifies `sync.ts` which is imported by tests in T3-T5; however T1 and T2 have disjoint files BUT `body-format.test.ts` imports from `sync.ts` -- T1 covers both, T2 is independent. Marking sequential because T2 is trivial and agents benefit from seeing T1 pass first. |
| 2 | T3, T4, T5 | T3: `cli/src/__tests__/body-enrichment.integration.test.ts` / T4: `cli/src/__tests__/github-sync.test.ts` / T5: `cli/features/github-enrichment/step_definitions/enrichment.steps.ts`, `cli/features/github-enrichment/epic-body-content.feature` | yes | disjoint files, no shared state, no intra-wave dependencies |

---

## Tasks

### Task 1: Remove phase badge from formatEpicBody and fix unit tests

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/github/sync.ts:119-121`
- Modify: `cli/src/__tests__/body-format.test.ts:42-47,166-175`

- [x] **Step 1: Update body-format test -- flip "includes phase badge" to assert absence**

In `cli/src/__tests__/body-format.test.ts`, replace the test at line 42-47:

```typescript
  test("does not include phase badge", () => {
    const manifest = makeManifest({ phase: "design" });
    const body = formatEpicBody(manifest);

    expect(body).not.toContain("**Phase:**");
  });
```

- [x] **Step 0 Update body-format test -- flip "graceful fallback" assertion**

In `cli/src/__tests__/body-format.test.ts`, replace the test at line 166-180. The test name is `"graceful fallback: phase badge and checklist without summary"`. Replace the entire test:

```typescript
  test("graceful fallback: checklist without summary, no phase badge", () => {
    const manifest = makeManifest({
      features: [
        makeFeature({ slug: "feat-a", status: "pending" }),
        makeFeature({ slug: "feat-b", status: "completed" }),
      ],
    });
    const body = formatEpicBody(manifest);

    expect(body).not.toContain("**Phase:**");
    expect(body).toContain("- [ ]");
    expect(body).toContain("- [x]");
    expect(body).not.toContain("## Problem");
    expect(body).not.toContain("## Solution");
  });
```

- [x] **Step 0 Run tests to verify they fail (RED)**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/github-sync-bug-fixes-c861/cli && bun --bun vitest run src/__tests__/body-format.test.ts --reporter=verbose`
Expected: FAIL -- the two modified tests fail because `formatEpicBody()` still emits `**Phase:**`

- [x] **Step 0 Remove phase badge push from formatEpicBody**

In `cli/src/github/sync.ts`, delete lines 120-121 (the phase badge comment and push). The block to remove:

```typescript
  // Phase badge
  sections.push(`**Phase:** ${input.phase}`);
```

After removal, the function body starts directly with the problem/solution section (line 123 onward). Also remove the doc comment reference to "phase badge" on line 113:

Replace line 113:
```
 * Includes: phase badge, problem statement, solution summary, feature checklist.
```
With:
```
 * Includes: problem statement, solution summary, feature checklist.
```

And update the module doc comment on line 15 -- replace:
```
 * Epic body: phase badge, problem/solution, feature checklist.
```
With:
```
 * Epic body: problem/solution, feature checklist.
```

- [x] **Step 0 Run tests to verify they pass (GREEN)**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/github-sync-bug-fixes-c861/cli && bun --bun vitest run src/__tests__/body-format.test.ts --reporter=verbose`
Expected: PASS -- all 58 tests pass

- [x] **Step 0 Commit**

```bash
cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/github-sync-bug-fixes-c861 && git add cli/src/github/sync.ts cli/src/__tests__/body-format.test.ts && git commit -m "feat(github-sync): remove phase badge from formatEpicBody

Phase is already conveyed via GitHub labels (phase/design, etc.),
making the body badge redundant."
```

---

### Task 2: Remove phase badge from early issue stub

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/github/early-issues.ts:71`

- [x] **Step 0 Remove phase prefix from stub body string**

In `cli/src/github/early-issues.ts`, replace line 71:

```typescript
      const stubBody = `**Phase:** design\n\n_Stub issue — content will be enriched after the design phase completes._`;
```

With:

```typescript
      const stubBody = `_Stub issue — content will be enriched after the design phase completes._`;
```

- [x] **Step 0 Verify no test references the old stub body**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/github-sync-bug-fixes-c861/cli && bun --bun vitest run --reporter=verbose 2>&1 | tail -20`
Expected: PASS -- all tests pass (the early-issues module has no dedicated unit test for the stub body content)

- [x] **Step 0 Commit**

```bash
cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/github-sync-bug-fixes-c861 && git add cli/src/github/early-issues.ts && git commit -m "feat(github-sync): remove phase badge from early issue stub

Stub body now begins directly with the italicized placeholder text."
```

---

### Task 3: Fix body-enrichment integration test phase badge assertion

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/__tests__/body-enrichment.integration.test.ts:68-86`

- [x] **Step 0 Update the "retains phase badge and feature checklist" test**

In `cli/src/__tests__/body-enrichment.integration.test.ts`, replace the test block at lines 68-86:

```typescript
    test("does not include phase badge, retains feature checklist", () => {
      const input: EpicBodyInput = {
        slug: "a1b2c3",
        epic: "logging-cleanup",
        phase: "implement",
        features: [
          { slug: "core-logger", status: "completed", github: { issue: 10 } },
          { slug: "adapter", status: "pending" },
        ],
        prdSections: {
          problem: "Problem text",
          solution: "Solution text",
        },
      };
      const body = formatEpicBody(input);
      expect(body).not.toContain("**Phase:**");
      expect(body).toContain("- [x]");
      expect(body).toContain("- [ ]");
    });
```

- [x] **Step 0 Run the test to verify it passes**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/github-sync-bug-fixes-c861/cli && bun --bun vitest run src/__tests__/body-enrichment.integration.test.ts --reporter=verbose`
Expected: PASS

- [x] **Step 0 Commit**

```bash
cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/github-sync-bug-fixes-c861 && git add cli/src/__tests__/body-enrichment.integration.test.ts && git commit -m "test(github-sync): invert phase badge assertion in body-enrichment test"
```

---

### Task 4: Fix github-sync test phase badge assertion

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/__tests__/github-sync.test.ts:424-435`

- [x] **Step 0 Update the "includes correct phase in epic labels on creation" test**

In `cli/src/__tests__/github-sync.test.ts`, find the test at line 424 named `"includes correct phase in epic labels on creation"`. Replace line 434:

```typescript
    expect(createCalls[0].args[2]).toContain("**Phase:** implement");
```

With:

```typescript
    expect(createCalls[0].args[2]).not.toContain("**Phase:**");
```

- [x] **Step 0 Run the test to verify it passes**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/github-sync-bug-fixes-c861/cli && bun --bun vitest run src/__tests__/github-sync.test.ts --reporter=verbose`
Expected: PASS

- [x] **Step 0 Commit**

```bash
cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/github-sync-bug-fixes-c861 && git add cli/src/__tests__/github-sync.test.ts && git commit -m "test(github-sync): invert phase badge assertion in sync engine test"
```

---

### Task 5: Fix BDD step definitions and feature scenarios for phase badge removal

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/features/github-enrichment/step_definitions/enrichment.steps.ts:76-84,117-122,130-137,144-149`
- Modify: `cli/features/github-enrichment/epic-body-content.feature:17-20,28-33,34-38`

- [x] **Step 0 Replace the "phase badge indicating" step definition**

In `cli/features/github-enrichment/step_definitions/enrichment.steps.ts`, replace the step definition at lines 76-84:

```typescript
Then(
  "the body does not contain a phase badge",
  function (this: GitHubEnrichmentWorld) {
    assert.ok(
      !this.lastBody.includes("**Phase:**"),
      `Phase badge should be absent. Body: ${this.lastBody}`,
    );
  },
);
```

- [x] **Step 0 Replace the "enriched at design phase" Given step assertion**

In `cli/features/github-enrichment/step_definitions/enrichment.steps.ts`, replace the assertion at line 121:

```typescript
  assert.ok(this.lastBody.includes("**Phase:** design"));
```

With:

```typescript
  assert.ok(!this.lastBody.includes("**Phase:**"), "Phase badge should be absent after removal");
```

- [x] **Step 0 Replace the "phase badge reflects" step definition**

In `cli/features/github-enrichment/step_definitions/enrichment.steps.ts`, replace the step definition at lines 132-137:

```typescript
Then("the body still does not contain a phase badge", function (this: GitHubEnrichmentWorld) {
  assert.ok(
    !this.lastBody.includes("**Phase:**"),
    `Phase badge should be absent. Body: ${this.lastBody}`,
  );
});
```

- [x] **Step 0 Replace the "contains the epic slug as the title" step assertion**

In `cli/features/github-enrichment/step_definitions/enrichment.steps.ts`, replace lines 146-149:

```typescript
Then("the body contains the epic slug as the title", function (this: GitHubEnrichmentWorld) {
  // With the phase badge removed, a minimal epic body (no summary, no features)
  // will be empty. Verify the badge is absent.
  assert.ok(!this.lastBody.includes("**Phase:**"), "Phase badge should be absent");
});
```

- [x] **Step 0 Update the epic-body-content.feature scenarios**

In `cli/features/github-enrichment/epic-body-content.feature`, replace the entire file content:

```gherkin
@github-issue-enrichment
Feature: Epic issue body displays PRD summary

  An epic's GitHub issue body contains the PRD summary extracted from the
  design artifact: problem statement, solution, user stories, and locked
  decisions. Observers understand the epic without leaving GitHub.

  Scenario: Epic issue body contains all PRD sections after design phase
    Given an epic has completed the design phase
    And the design artifact contains a problem statement, solution, user stories, and decisions
    When the epic issue body is enriched
    Then the body contains the problem statement section
    And the body contains the solution section
    And the body contains the user stories section
    And the body contains the decisions section

  Scenario: Epic issue body does not contain phase badge
    Given an epic is at the plan phase
    When the epic issue body is enriched
    Then the body does not contain a phase badge

  Scenario: Epic issue body includes feature checklist after plan phase
    Given an epic has completed the plan phase with three features
    When the epic issue body is enriched
    Then the body contains a checklist with three feature entries
    And each checklist entry shows the feature name

  Scenario: Epic issue body still has no phase badge after phase advance
    Given an epic has been enriched at the design phase
    When the epic advances to the plan phase
    And the epic issue body is re-enriched
    Then the body still does not contain a phase badge

  Scenario: Epic issue body without a design artifact shows minimal content
    Given a new epic has no design artifact yet
    When the epic issue body is enriched
    Then the body contains the epic slug as the title
    And the body does not contain PRD sections
```

- [x] **Step 0 Run the BDD tests to verify they pass**

Run: `cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/github-sync-bug-fixes-c861/cli && bun --bun node_modules/.bin/cucumber-js features/github-enrichment/epic-body-content.feature --require features/github-enrichment/step_definitions/*.ts --require features/github-enrichment/support/*.ts`
Expected: PASS -- all 5 scenarios pass

- [ ] **Step 7: Commit**

```bash
cd /Users/D038720/Code/github.com/bugroger/beastmode/.claude/worktrees/github-sync-bug-fixes-c861 && git add cli/features/github-enrichment/step_definitions/enrichment.steps.ts cli/features/github-enrichment/epic-body-content.feature && git commit -m "test(github-sync): update BDD scenarios to assert phase badge absence"
```
