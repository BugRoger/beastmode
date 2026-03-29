# Release v0.4.1

**Date:** 2026-03-04

## Highlights

Major redesign of the /implement skill with subagent-per-task execution, wave-based parallelism, and three-tier deviation handling. Also includes design v2, plan improvements, lean prime refactor, and session tracking removal.

## Features

- **implement**: Redesign with subagent-per-task execution model — wave ordering, deviation rules, spec checks, implementer agent prompt
- **design**: Design phase v2 with gray areas, scope guardrails, and role clarity
- **plan**: Improve plan skill with wave dependencies and coverage verification
- **release**: Sync with main before version bump, fix version detection
- **phases**: Move side effects from 0-prime to 1-execute (lean prime refactor)
- **task-runner**: Lazy sub-phase expansion with child collapse
- **retro**: Restore phase retro as shared checkpoint module
- **git-branching**: Feature branches with .beastmode/worktrees/ isolation

## Chores

- Add Prime Directives to CLAUDE.md
- Resolve context doc updates after agents-refs merge
- Consolidate all artifacts under .beastmode/ (remove .agents/ references)
- Remove session JSONL tracking

## Full Changelog

```
94da2da feat(implement): redesign with subagent-per-task execution model
aa2f609 feat(release): sync with main before version bump, fix version detection
5f80154 feat(plan): improve plan skill with wave dependencies and coverage verification
29e60ca chore: add Prime Directives to CLAUDE.md
f4374c7 feat(design): design phase v2 with gray areas, scope guardrails, role clarity
ccd2ef7 refactor(session-tracking): remove session JSONL tracking
0c407e0 feat(phases): move side effects from 0-prime to 1-execute
af27663 feat(task-runner): lazy sub-phase expansion with child collapse
ea989b2 chore: resolve context doc updates after agents-refs merge
2408814 refactor(remove-agents-refs): consolidate all artifacts under .beastmode/
12494d8 feat(retro): restore phase retro as shared checkpoint module
bc61cd2 feat(git-branching): feature/<feature> branches with .beastmode/worktrees/ isolation
e157de8 feat(task-runner): add lazy sub-step expansion to TodoWrite tracking
```
