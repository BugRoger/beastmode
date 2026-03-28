# Configuration

## Context
Phase transitions need configurable modes (human-gated vs auto-advance) that map to GitHub label operations.

## Decision
Extend config.yaml with `transitions:` block mapping each phase transition to a mode: human (requires gate/awaiting-approval + approval), auto (self-advance), or automatic (triggered by Feature roll-up).

## Rationale
config.yaml already controls gate behavior. Extending it maintains the single-source principle for transition configuration. Runtime resolution means behavior can change without skill edits.

## Source
.beastmode/state/design/2026-03-28-github-state-model.md
