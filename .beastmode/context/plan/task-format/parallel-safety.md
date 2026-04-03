# Parallel Safety

## Context
Parallel task dispatch within a wave requires guaranteeing no file conflicts between agents.

## Decision
/plan's validate phase runs file isolation analysis: collects all file paths per wave, builds file-to-task map. If any file appears in 2+ tasks, the later task moves to a new wave. Safe waves get `Parallel-safe: true` flag. /implement verifies the flag at runtime, falling back to sequential dispatch if verification fails.

## Rationale
Two-layer safety (plan-time analysis + runtime verification) prevents file conflicts. The flag is machine-written by /plan validation, never human-authored.

## Feature-Level Isolation
File isolation analysis applies at feature level in multi-feature epics, not just
at task level within a single feature plan. When two features in the same wave
share file targets, the later feature must be moved to a subsequent wave. The
release-serialization epic demonstrated this: release-held-event (wave 1)
implemented functionality that release-gate (wave 1) also targeted, causing the
gate feature to find its work already done and only add tests.

## Source
state/plan/2026-03-04-parallel-wave-upgrade-path.md
