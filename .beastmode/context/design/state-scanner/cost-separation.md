## Context
The original scanner included cost aggregation from .beastmode-runs.json as part of the EpicState type.

## Decision
Remove costUsd from EpicState and remove cost reporting from both the scanner and the status command entirely. Cost data remains in the per-dispatch run log (.beastmode-runs.json) for external consumption, but is not read, aggregated, or displayed by the scanner or status command.

## Rationale
Scanner's job is to report epic state for orchestration decisions. Cost reporting is neither a scanner concern nor a status command concern — it was adding complexity to both without clear user value. Run log is preserved for programmatic or external tooling consumption.

## Source
.beastmode/state/design/2026-03-29-bulletproof-state-scanner.md
.beastmode/state/design/2026-03-29-status-unfuckery-v2.md
