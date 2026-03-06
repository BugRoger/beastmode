# Phase Transitions

Self-chaining mechanism between workflow phases. Each phase's checkpoint contains a transition gate that either auto-advances to the next phase or stops with session-restart instructions.

## Transition Mechanism
When a transition gate is set to `auto`, Claude calls `Skill(skill="beastmode:<next>", args="<artifact-path>")` with fully-qualified skill names. Each transition passes the feature's state file path as the artifact argument.

1. ALWAYS use fully-qualified skill names for transitions — `beastmode:plan`, not `plan`
2. ALWAYS pass the state artifact path as the argument to the next phase

## Context Threshold
Configurable percentage in config.yaml (`context_threshold`). Before auto-advancing, check estimated remaining context. If below threshold, print session-restart instructions instead of chaining.

1. ALWAYS check context threshold before auto-advancing — low context causes degraded behavior
2. NEVER auto-advance below threshold — print restart instructions and STOP

## Phase-to-Skill Mapping
design -> plan -> implement -> validate -> release. Each transition gate is namespaced: `transitions.design-to-plan`, `transitions.plan-to-implement`, etc.

1. ALWAYS follow the five-phase order — no skipping phases
