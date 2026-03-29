## Context
The scanner needs to communicate gate-blocked status to the orchestrator so it can pause epics appropriately.

## Decision
Reactive gate blocking: scanner only checks manifest feature statuses for blocked entries. No preemptive config gate checking.

## Rationale
Agents run until they hit a human gate and report back. Preemptive checking adds complexity without value — the gate is enforced at the agent level regardless.

## Source
.beastmode/artifacts/design/2026-03-29-bulletproof-state-scanner.md
