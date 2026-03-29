# Git Branching & Worktree Strategy — Implementation Plan

**Goal:** Replace `cycle/<topic>` branching with `feature/<feature>`, move worktrees to `.beastmode/worktrees/`, re-enable natural commits, extract worktree logic into shared utility.

**Architecture:** Rewrite `_shared/worktree-manager.md` as the single source of truth for all worktree operations. Each phase's 0-prime `@imports` the shared manager. Remove all inline worktree shell scripts from phase files. Update `release/1-execute.md` to reference shared merge/cleanup. Remove "Do NOT commit" constraints.

**Design Doc:** `.beastmode/state/design/2026-03-04-git-branching-strategy.md`

---

## Task 0: Rewrite `skills/_shared/worktree-manager.md`

**Files:**
- Modify: `skills/_shared/worktree-manager.md`

**Step 1: Replace entire file contents with new worktree manager**

New content has 4 operations:
- **Create Worktree** — creates `.beastmode/worktrees/<feature>` on branch `feature/<feature>`, `mkdir -p`, `git worktree add`, `cd`
- **Enter Worktree** — reads path from status file, verifies exists, `cd`, reports
- **Merge Options** — AskUserQuestion with 4 options (merge locally, PR, keep, discard) with full shell for each
- **Status File Format** — standardized markdown block
- **Read Worktree from Status** — `get_worktree_path()` helper

**Step 2: Verify**

Run: `grep -c "feature/" skills/_shared/worktree-manager.md` → multiple matches
Run: `grep -c "cycle/" skills/_shared/worktree-manager.md` → 0

---

## Task 1: Update `/design` 0-prime

**Files:**
- Modify: `skills/design/phases/0-prime.md`

**Step 1: Replace "## 4. Create Cycle Worktree" section (lines 34-46)**

Replace with:
```markdown
## 4. Create Feature Worktree

@../_shared/worktree-manager.md#Create Worktree
```

**Step 2: Verify**

Run: `grep "cycle" skills/design/phases/0-prime.md` → no matches

---

## Task 2: Update `/plan` 0-prime

**Files:**
- Modify: `skills/plan/phases/0-prime.md`

**Step 1: Replace "## 5. Enter Cycle Worktree" section (lines 27-36)**

Replace with:
```markdown
## 5. Enter Feature Worktree

@../_shared/worktree-manager.md#Enter Worktree
```

**Step 2: Verify**

Run: `grep "cycle" skills/plan/phases/0-prime.md` → no matches

---

## Task 3: Update `/implement` 0-prime

**Files:**
- Modify: `skills/implement/phases/0-prime.md`

**Step 1: Replace "## 4. Enter Cycle Worktree" section (lines 19-26)**

Replace with:
```markdown
## 4. Enter Feature Worktree

@../_shared/worktree-manager.md#Enter Worktree
```

**Step 2: Verify**

Run: `grep "cycle" skills/implement/phases/0-prime.md` → no matches

---

## Task 4: Remove "No Commits" constraints

**Files:**
- Modify: `skills/design/phases/3-checkpoint.md`
- Modify: `skills/implement/phases/1-execute.md`

**Step 1: In `skills/design/phases/3-checkpoint.md` line 21**

Remove: `**Do NOT commit.** Worktree provides WIP safety.`

**Step 2: In `skills/implement/phases/1-execute.md` lines 29-31**

Remove entire "## 4. No Commits" section

**Step 3: Verify**

Run: `grep -r "Do NOT commit" skills/` → no matches

---

## Task 5: Update `/release` 1-execute merge/cleanup

**Files:**
- Modify: `skills/release/phases/1-execute.md`

**Step 1: Replace sections 5-7 (lines 59-140)**

Replace "Stage All Changes", "Create Unified Commit", and "Present Merge Options" with:

```markdown
## 5. Commit Release Changes

Stage and commit release artifacts (changelog, version bumps):

\`\`\`bash
git add -A
git commit -m "feat(<feature>): <summary-from-changelog>

Artifacts:
- Design: .beastmode/state/design/YYYY-MM-DD-<feature>.md
- Plan: .beastmode/state/plan/YYYY-MM-DD-<feature>.md
- Release: .beastmode/state/release/YYYY-MM-DD-vX.Y.Z.md
"
\`\`\`

## 6. Merge and Cleanup

@../_shared/worktree-manager.md#Merge Options
```

**Step 2: Verify**

Run: `grep "cycle" skills/release/phases/1-execute.md` → no matches

---

## Task 6: Update `/implement` constraints

**Files:**
- Modify: `skills/implement/references/constraints.md`

**Step 1: Change `.agents/worktrees/` to `.beastmode/worktrees/` on line 10**

---

## Task 7: Update `_shared/session-tracking.md`

**Files:**
- Modify: `skills/_shared/session-tracking.md`

**Step 1: Update worktree path and branch references (lines 36-37)**

From: `.agents/worktrees/cycle/<feature>` / `cycle/<feature>`
To: `.beastmode/worktrees/<feature>` / `feature/<feature>`

---

## Task 8: Update `.gitignore`

**Files:**
- Modify: `.gitignore`

**Step 1: Add `.beastmode/worktrees/` line**

Keep existing `.agents/worktrees/` for backward compat.

---

## Task 9: Update context documentation

**Files:**
- Modify: `.beastmode/context/implement/agents.md`
- Modify: `.beastmode/context/plan/conventions.md`

**Step 1: In `agents.md`, replace "Cycle Workflow" section**

Rename to "Feature Workflow (Branch + Worktree)". Update all `cycle/` → `feature/`, `.agents/worktrees/cycle/` → `.beastmode/worktrees/`. Remove "No interim commits". Add "Natural commits" and "Release owns merge".

**Step 2: In `conventions.md`, update branch naming**

`cycle/<topic>` → `feature/<feature>`

**Step 3: In `conventions.md`, update anti-pattern**

`.agents/worktrees/cycle/<topic>` → `.beastmode/worktrees/<feature>`

**Step 4: Verify**

Run: `grep -r "cycle/" .beastmode/context/` → no matches
