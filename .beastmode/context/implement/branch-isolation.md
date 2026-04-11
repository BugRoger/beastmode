# Branch Isolation

## Branch Model
- All agents commit directly to the feature branch (feature/<slug>)
- No separate implementation branches -- wave file isolation is the concurrency mechanism
- Agents commit per task: `feat(<feature>): <task description>`
- Feature branch accumulates all task commits from all parallel agents

## Checkpoint
- Commit artifact report directly on the feature branch
- No rebase or merge step -- all commits are already on the correct branch
- git add .beastmode/artifacts/implement/ && git commit

## Resume Model
- Controller reads .tasks.md and finds first unchecked task on re-entry
- Prior tasks have commits on the feature branch -- no re-execution needed
- Per-task commits enable git bisect per feature -- each commit is a known-good checkpoint

## Subagent Safety
- Agents commit only their task's files using git add <files> + git commit
- Commit message format enforced: `feat(<feature>): <task description>`
- NEVER switch branches -- all agents work on the feature branch
- Wave file isolation guarantees disjoint file sets across parallel agents within the same wave
