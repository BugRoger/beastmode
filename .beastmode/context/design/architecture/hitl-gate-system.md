# HITL Gate System

## Context
Workflow phases have decision points that need to be configurable for autonomous operation while preventing dangerous skip behavior.

## Decision
Two-tier system: HARD-GATE (unconditional, always enforced) and configurable Gate steps (human/auto resolved from `.beastmode/config.yaml`). Task runner handles gate detection and substep pruning. Config read at each gate — no pre-loading.

## Rationale
- HARD-GATEs prevent dangerous skip behavior unconditionally
- Configurable gates enable autonomous phase chaining when set to auto
- Runtime config resolution means gates are self-contained

## Source
state/design/2026-03-04-hitl-gate-config.md
