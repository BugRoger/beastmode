# Phase Transitions

## Transition Mechanism
- ALWAYS use fully-qualified skill names for transitions — `beastmode:plan`, not `plan`
- ALWAYS pass the state artifact path as the argument to the next phase — maintains continuity
- When set to `auto`, Claude calls `Skill(skill="beastmode:<next>", args="<artifact-path>")` — explicit chaining

## Context Threshold
- ALWAYS check context threshold before auto-advancing — low context causes degraded behavior
- NEVER auto-advance below threshold — print restart instructions and STOP
- Configurable percentage in config.yaml (`context_threshold`) — tunable per project

## Phase-to-Skill Mapping
- ALWAYS follow the five-phase order: design -> plan -> implement -> validate -> release — no skipping
- Each transition gate is namespaced: `transitions.design-to-plan`, `transitions.plan-to-implement`, etc. — granular control
