# HITL Gate System

## Context
Workflow phases have decision points that need to be configurable for autonomous operation while preventing dangerous skip behavior.

## Decision
Two-tier system: unconditional gates (always enforced, embedded as structural `## N. [GATE|...]` task-runner steps) and configurable gates (human/auto resolved from `.beastmode/config.yaml`). Task runner handles gate detection and substep pruning — gates cannot be bypassed. Config read at each gate — no pre-loading. Phase transitions are externally orchestrated via Justfile — transition gates removed from config.yaml, checkpoint prints `just <next-phase> <slug>` instead of auto-chaining.

## Rationale
- Structural gate steps in task runner make skip behavior impossible
- Configurable gates enable autonomous phase chaining when set to auto
- Runtime config resolution means gates are self-contained
- Competing gate mechanisms (HARD-GATE + config) were unified into the step format

## Source
state/design/2026-03-04-hitl-gate-config.md
state/design/2026-03-05-hitl-adherence.md
state/design/2026-03-05-ungated-hitl-fixes.md
state/design/2026-03-28-external-orchestrator.md
