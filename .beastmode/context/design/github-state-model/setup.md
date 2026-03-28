# Setup

## Context
GitHub infrastructure (labels, project board) must be bootstrapped before the state model can be used.

## Decision
Dedicated setup skill or /beastmode subcommand that creates all labels in the taxonomy, a Projects V2 board with phase columns (Backlog through Done), and close-to-done automation. Idempotent -- safe to re-run.

## Rationale
One-time bootstrap avoids manual GitHub configuration. Idempotency means re-running after partial failure is safe. Whether it's a standalone skill or subcommand is left to implementer's discretion.

## Source
.beastmode/state/design/2026-03-28-github-state-model.md
