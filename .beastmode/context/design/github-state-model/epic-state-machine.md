# Epic State Machine

## Context
Epics flow through beastmode's five phases. Each phase transition is driven by the CLI after dispatch completion.

## Decision
Mutually exclusive `phase/*` labels encode Epic lifecycle: backlog -> design -> plan -> implement -> validate -> release -> done, with cancelled as an additional terminal state. Cancelled epics are closed on GitHub and moved to the Done board column (no custom column).

## Rationale
Labels are the most visible and queryable mechanism for lifecycle state. implement-to-validate is automatic (all Features closed) because no human judgment is needed for a rollup check.

## Source
.beastmode/artifacts/design/2026-03-28-github-state-model.md
.beastmode/artifacts/design/2026-03-31-github-sync-watch-loop.md
