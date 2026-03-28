# Epic State Machine

## Context
Epics flow through beastmode's five phases. Each phase transition needs a mechanism that supports both human-gated and auto-gated modes.

## Decision
Mutually exclusive `phase/*` labels encode Epic lifecycle: backlog -> design -> plan -> implement -> validate -> release -> done. Gates use `gate/awaiting-approval` label + issue comments for pre-code phases, PR reviews for code phases. Transition modes configured in config.yaml.

## Rationale
Labels are the most visible and queryable mechanism for lifecycle state. Comment-based gates match pre-code artifacts (design docs, plans). PR-based gates match code artifacts. implement-to-validate is automatic (all Features closed) because no human judgment is needed for a rollup check.

## Source
.beastmode/state/design/2026-03-28-github-state-model.md
