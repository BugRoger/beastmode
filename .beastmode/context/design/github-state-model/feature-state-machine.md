# Feature State Machine

## Context
Features are implementable work units within an Epic. A daemon or human needs to identify which Features are ready for pickup and track them through implementation.

## Decision
Feature status tracked via mutually exclusive `status/*` labels: ready, in-progress, blocked, review. Roll-up rule: when a Feature closes, check parent Epic's SubIssuesSummary -- if percentCompleted == 100, advance Epic from phase/implement to phase/validate.

## Rationale
Daemon needs `type/feature` + `status/ready` as a machine-readable signal. SubIssuesSummary API provides percentCompleted for free, eliminating manual roll-up tracking.

## Source
.beastmode/state/design/2026-03-28-github-state-model.md
