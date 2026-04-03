# Branch Checkpoint Implementation

## Goal

Add isolated implementation branches to the implement skill. The CLI creates `feature/<slug>/<feature-name>` before dispatch. Prime verifies the branch. Agents commit per task on it. Checkpoint rebases back to the worktree branch with conflict resolution on failure.

## Architecture

- **Branch model**: CLI creates `feature/<slug>/<feature-name>` from worktree branch `feature/<slug>` before dispatch
- **Agent commits**: per-task commits with `feat(<feature>): <description>` format on the impl branch
- **Checkpoint**: rebase impl branch onto worktree branch, fast-forward, then commit deviation log
- **Conflict resolution**: spawned agent on rebase failure, max 2 attempts before abort and user report
- **Resume**: first unchecked task in `.tasks.md` — prior tasks already have commits on impl branch

## Tech Stack

- Markdown skill files (SKILL.md, implementer.md)
- Git branching/rebasing

## File Structure

| File | Responsibility |
|------|---------------|
| `skills/implement/SKILL.md` | Main implement skill definition — Prime branch verification, Subagent Safety update, Checkpoint rebase workflow |
| `.claude/agents/implementer.md` | Implementer agent role — already has commit-per-task, needs minor clarification about impl branch |

---

### Task 0: Add Branch Verification to Prime

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/implement/SKILL.md` (Phase 0: Prime section, between steps 5 and 6)

- [x] **Step 1: Add branch verification step to Prime**

Insert a new step 6 between "Capture Baseline Snapshot" (current step 5) and "Prepare Environment" (current step 6, becoming step 7):

```markdown
### 6. Verify Implementation Branch

The CLI creates and checks out `feature/<slug>/<feature-name>` before dispatch. Verify:

```bash
current_branch=$(git branch --show-current)
expected_branch="feature/${epic}/${feature}"
if [ "$current_branch" != "$expected_branch" ]; then
  echo "ERROR: Expected branch '$expected_branch' but on '$current_branch'"
  exit 1
fi
```

If the branch check fails, error: "Implementation branch not found. The CLI must create and check out `feature/<slug>/<feature-name>` before running /implement."
```

Renumber the existing "Prepare Environment" step from 6 to 7.

- [x] **Step 2: Verify the edit**

Read `skills/implement/SKILL.md` and confirm:
- Step 6 is "Verify Implementation Branch" with the git branch check
- Step 7 is "Prepare Environment" (renumbered from 6)
- The branch name pattern is `feature/<slug>/<feature-name>`

- [x] **Step 3: Commit**

```bash
git add skills/implement/SKILL.md
git commit -m "feat(branch-checkpoint): add branch verification to Prime"
```

---

### Task 1: Update Subagent Safety Constraints

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/implement/SKILL.md` (Constraints > Subagent Safety section)

- [x] **Step 1: Update Subagent Safety section**

Replace the current Subagent Safety section:

```markdown
### Subagent Safety

- Spawn ONE agent per task (never parallel implementer agents on the same wave — file conflicts)
- Controller stays in the working directory — agents inherit it
- Agents commit per task on the current branch — never push or switch branches
- Agents must NOT read the plan file — controller provides task text
- Agents must NOT modify files outside their task's file list
- If an agent returns BLOCKED, controller assesses and either re-dispatches or escalates to user
```

With:

```markdown
### Subagent Safety

- Spawn ONE agent per task (never parallel implementer agents on the same wave — file conflicts)
- Controller stays in the working directory — agents inherit it
- Agents commit per task on the impl branch (`feature/<slug>/<feature-name>`) only — never push, switch branches, or commit to the worktree branch
- Agents must NOT read the plan file — controller provides task text
- Agents must NOT modify files outside their task's file list
- If an agent returns BLOCKED, controller assesses and either re-dispatches or escalates to user
```

- [x] **Step 2: Verify the edit**

Read the Subagent Safety section and confirm the third bullet says "on the impl branch (`feature/<slug>/<feature-name>`) only".

- [x] **Step 3: Commit**

```bash
git add skills/implement/SKILL.md
git commit -m "feat(branch-checkpoint): update Subagent Safety for impl branch commits"
```

---

### Task 2: Rewrite Checkpoint Phase with Rebase Workflow

**Wave:** 2
**Depends on:** Task 0, Task 1

**Files:**
- Modify: `skills/implement/SKILL.md` (Phase 3: Checkpoint section)

- [x] **Step 1: Replace Checkpoint section**

Replace the entire "Phase 3: Checkpoint" section (from `## Phase 3: Checkpoint` through to `STOP. No additional output.`) with:

```markdown
## Phase 3: Checkpoint

### 1. Save Implementation Report

Save to `.beastmode/artifacts/implement/YYYY-MM-DD-<epic-name>-<feature-name>.md`:

IMPORTANT: The filename MUST be exactly `YYYY-MM-DD-<epic-name>-<feature-name>.md` — no
extra suffixes like `-deviations`. The stop hook derives the output.json filename from
this basename, and the watch loop matches on `-<epic>-<feature>.output.json`. Any extra
suffix breaks the match and the watch loop never sees completion.

    # Implementation Report: <feature-name>

    **Date:** YYYY-MM-DD
    **Feature Plan:** .beastmode/artifacts/plan/YYYY-MM-DD-<epic-name>-<feature-name>.md
    **Tasks completed:** N/M
    **Review cycles:** N (spec: X, quality: Y)
    **Concerns:** N

    ## Completed Tasks
    - Task N: <description> — [clean | with concerns]

    ## Concerns
    - Task N: <description>

    ## Blocked Tasks
    - Task N: <blocker description>

If all tasks completed with no concerns, still write this file with "Concerns: 0" and empty sections.
This file MUST always be written — the stop hook reads its frontmatter to generate
output.json, which the watch loop uses to detect completion.

The artifact MUST begin with YAML frontmatter:

```yaml
---
phase: implement
slug: <epic-id>
epic: <epic-name>
feature: <feature-name>
status: completed
---
```

Set `status` to `completed` if all tasks passed, `error` if any task is blocked.

### 2. Rebase Implementation Branch

Rebase the impl branch onto the worktree branch:

```bash
# Switch to worktree branch
worktree_branch="feature/${slug}"
impl_branch="feature/${slug}/${feature}"

# Rebase impl branch onto worktree branch
git rebase "$worktree_branch" "$impl_branch"
```

**On success:** Fast-forward the worktree branch to the rebased head:

```bash
git checkout "$worktree_branch"
git merge --ff-only "$impl_branch"
```

Proceed to step 3 (Commit Deviation Log).

**On rebase failure (conflicts):**

1. Capture the conflict markers:
```bash
git diff --name-only --diff-filter=U
```

2. Spawn a conflict resolution agent:
   - Provide: list of conflicted files, the conflict markers from each file, context about the feature being implemented
   - The agent reads each conflicted file, resolves the conflict markers, writes the resolved file, and stages it
   - After resolution: `git rebase --continue`

3. If resolution succeeds: fast-forward worktree branch as above, proceed to step 3

4. If resolution fails:
   - `git rebase --abort`
   - Re-spawn the conflict resolution agent with the failure context
   - Max 2 attempts total

5. After 2 failed attempts:
   - `git rebase --abort`
   - Report to user with conflict details:

   ```
   Rebase failed: N conflicted files after 2 resolution attempts.
   Conflicted files:
   - path/to/file1.ts
   - path/to/file2.ts

   The impl branch (feature/<slug>/<feature>) has all task commits intact.
   Manual resolution needed before checkpoint can complete.
   ```

   STOP. Do not commit the deviation log or proceed.

### 3. Commit and Handoff

After successful rebase and fast-forward, commit the deviation log on the worktree branch:

```bash
git add .beastmode/artifacts/implement/
git commit -m "implement(<epic-name>-<feature-name>): checkpoint"
```

Print:

```
Next: beastmode validate <epic-name>
```

STOP. No additional output.
```

- [x] **Step 2: Verify the edit**

Read the Checkpoint section and confirm:
- Step 1 saves the implementation report (unchanged from current)
- Step 2 is the rebase workflow with conflict resolution agent fallback
- Step 3 commits the deviation log on the worktree branch after successful rebase
- Max 2 conflict resolution attempts
- On total failure: abort rebase, report to user, STOP

- [x] **Step 3: Commit**

```bash
git add skills/implement/SKILL.md
git commit -m "feat(branch-checkpoint): rewrite checkpoint with rebase workflow"
```

---

### Task 3: Update Implementer Agent for Branch Clarity

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `.claude/agents/implementer.md` (Constraints section)

- [x] **Step 1: Update Constraints section**

Replace the current Constraints section:

```markdown
## Constraints

- Do NOT read the plan file — your task spec contains everything you need
- Do NOT switch branches — you're already on the correct branch
- Do NOT push to remote
- Do NOT modify files outside your task's file list
- It is always OK to stop and say "this is too hard for me" — use BLOCKED or NEEDS_CONTEXT
```

With:

```markdown
## Constraints

- Do NOT read the plan file — your task spec contains everything you need
- Do NOT switch branches — you're on the impl branch (`feature/<slug>/<feature-name>`) and must stay on it
- Do NOT push to remote
- Do NOT commit to any branch other than the current impl branch
- Do NOT modify files outside your task's file list
- It is always OK to stop and say "this is too hard for me" — use BLOCKED or NEEDS_CONTEXT
```

- [x] **Step 2: Verify the edit**

Read `.claude/agents/implementer.md` Constraints section and confirm:
- Branch constraint mentions impl branch explicitly
- New bullet about not committing to other branches
- Rest of constraints unchanged

- [x] **Step 3: Commit**

```bash
git add .claude/agents/implementer.md
git commit -m "feat(branch-checkpoint): clarify impl branch constraints in implementer agent"
```
