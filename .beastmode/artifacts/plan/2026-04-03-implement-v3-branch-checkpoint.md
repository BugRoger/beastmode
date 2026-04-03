---
phase: plan
slug: implement-v3
epic: implement-v3
feature: branch-checkpoint
wave: 3
---

# Branch Checkpoint

**Design:** .beastmode/artifacts/design/2026-04-03-implement-v3.md

## User Stories

5. As a skill author, I want each feature implementation to run on an isolated branch (`feature/<slug>/<feature-name>`) with per-task commits, so that the worktree branch stays clean and resume is natural (find first unchecked task).
6. As a skill author, I want checkpoint to rebase the impl branch back to the worktree branch — with an auto-retry conflict resolution agent on failure — so that parallel feature implementations merge cleanly.

## What to Build

**Isolated Implementation Branches**

The skill assumes the CLI has already created and checked out `feature/<slug>/<feature-name>` before dispatch begins. The SKILL.md documents this assumption and verifies the branch exists in Prime.

The implementer agent gains commit responsibility on the impl branch:
- Per-task commits after each task completes (lifting the current "agents must not commit" constraint, but only for the impl branch)
- Commit message format: `feat(<feature>): <task description>`
- The implementer agent's prompt includes commit instructions as the final step of each task

**Checkpoint Rebase**

The checkpoint phase is rewritten to rebase instead of committing directly:

1. Rebase `feature/<slug>/<feature-name>` onto the worktree branch (`feature/<slug>`)
2. On success: fast-forward the worktree branch to the rebased head, write deviation log, commit
3. On rebase failure (conflicts from parallel feature implementations):
   - Spawn a conflict resolution agent that receives the conflict markers
   - Agent attempts to resolve each conflicted file
   - If resolution succeeds: continue rebase, commit
   - If resolution fails after 2 attempts: abort rebase, report to user with conflict details

**Resume Model**

The per-task commit model enables natural resume:
- On re-entry, the controller reads `.tasks.md` and finds the first unchecked task
- All prior tasks have commits on the impl branch — no need to re-run them
- `git bisect` becomes available per feature since each task commit is a known-good checkpoint

**SKILL.md Changes**

- Prime: add branch verification step (check `feature/<slug>/<feature-name>` exists and is checked out)
- Execute: update agent dispatch to include commit instructions in the implementer prompt
- Subagent Safety constraints: update "agents must NOT commit" to "agents commit per task on the impl branch only"
- Checkpoint: replace direct commit with rebase workflow, add conflict resolution agent fallback

## Acceptance Criteria

- [ ] SKILL.md Prime verifies `feature/<slug>/<feature-name>` branch is checked out
- [ ] Implementer agent prompt includes per-task commit instructions
- [ ] Commit message format: `feat(<feature>): <task description>`
- [ ] Subagent Safety section updated: agents commit on impl branch only (not "never commit")
- [ ] Checkpoint rebases impl branch onto worktree branch
- [ ] Conflict resolution agent spawned on rebase failure
- [ ] Max 2 conflict resolution attempts before reporting to user
- [ ] Deviation log committed on worktree branch after successful rebase
