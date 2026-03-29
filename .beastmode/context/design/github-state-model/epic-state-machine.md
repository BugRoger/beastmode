# Epic State Machine

## Context
Epics flow through beastmode's five phases. Each phase transition needs a mechanism that supports both human-gated and auto-gated modes. Terminal states (done, cancelled) need consistent cleanup of child feature issues.

## Decision
Mutually exclusive `phase/*` labels encode Epic lifecycle: backlog -> design -> plan -> implement -> validate -> release -> done. Gates use `gate/awaiting-approval` label + issue comments for pre-code phases, PR reviews for code phases. Transition modes configured in config.yaml. Terminal state handling: when epic reaches done, close epic issue AND all child feature issues, set epic board status to "Done". When epic reaches cancelled, close epic issue AND all child feature issues, add "Cancelled" comment to epic, remove from board or set status "Done" (no "Cancelled" board column exists).

## Rationale
Labels are the most visible and queryable mechanism for lifecycle state. Comment-based gates match pre-code artifacts (design docs, plans). PR-based gates match code artifacts. implement-to-validate is automatic (all Features closed) because no human judgment is needed for a rollup check. Closing all child features on terminal states prevents zombie open features from cluttering the repo.

## Source
.beastmode/artifacts/design/2026-03-28-github-state-model.md
.beastmode/artifacts/design/2026-03-29-github-no-for-real-sync.md
