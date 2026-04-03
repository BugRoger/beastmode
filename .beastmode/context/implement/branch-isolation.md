# Branch Isolation

## Branch Model
- CLI creates `feature/<slug>/<feature-name>` from the worktree branch before dispatch
- Skill assumes the branch exists and is checked out — verified in Prime
- Agents commit per task on the impl branch: `feat(<feature>): <task description>`
- Worktree branch (`feature/<slug>`) stays clean until checkpoint rebase

## Checkpoint Rebase
- Rebase `feature/<slug>/<feature-name>` onto `feature/<slug>` (worktree branch)
- On success: fast-forward worktree branch to rebased head, write deviation log, commit
- On rebase failure: spawn conflict resolution agent with conflict markers
- Max 2 conflict resolution attempts before abort and user escalation
- Deviation log committed on worktree branch after successful rebase

## Resume Model
- Controller reads .tasks.md and finds first unchecked task on re-entry
- Prior tasks have commits on impl branch — no re-execution needed
- Per-task commits enable `git bisect` per feature — each commit is a known-good checkpoint

## Subagent Safety
- Agents commit on the impl branch only — never on the worktree branch
- Commit message format enforced: `feat(<feature>): <task description>`
- Branch verification in Prime: check `feature/<slug>/<feature-name>` exists and is checked out before dispatch
