# Parallel Dispatch

## Context
Multiple agents can execute same-wave tasks simultaneously, risking file conflicts.

## Decision
Verify file isolation before parallel dispatch. Never let two agents modify the same file simultaneously. Report results per-agent after completion. Same-wave tasks can run simultaneously only if no shared files.

## Rationale
Wave-based parallelism is only safe when file isolation is guaranteed. Silent merges hide conflicts; per-agent reporting makes results auditable.

## Source
Source artifact unknown — backfill needed
