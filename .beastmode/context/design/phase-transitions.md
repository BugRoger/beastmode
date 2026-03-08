# Phase Transitions

## Transition Mechanism
- ALWAYS use fully-qualified skill names for transitions — `beastmode:plan`, not `plan`
- ALWAYS pass the state artifact path as the argument to the next phase — maintains continuity
- When set to `auto`, Claude calls `Skill(skill="beastmode:<next>", args="<artifact-path>")` — explicit chaining

## Phase-to-Skill Mapping
design -> plan -> implement -> validate -> release. Each transition gate is namespaced: `transitions.design-to-plan`, `transitions.plan-to-implement`, etc.

1. ALWAYS follow the five-phase order — no skipping phases

## Transition Gate Output
Standardized output format for all checkpoint transition gates. Both human and auto modes print the same inline code command with the resolved artifact path. Auto mode additionally attempts the Skill call. Command format: `/beastmode:<next-phase> .beastmode/state/<phase>/YYYY-MM-DD-<feature>.md`. STOP after printing — no additional output.

1. ALWAYS produce a single inline code command with the fully resolved artifact path
2. ALWAYS STOP after transition output — no additional output follows the gate
3. Command format uses `<next-phase>` naming that matches skill names

## Guidance Authority
Only the transition gate in the checkpoint phase may produce next-step commands. Retro agents and sub-agents are banned from printing transition guidance, session-restart instructions, or next-step commands.

1. NEVER print next-step commands from retro agents — transition gate is the sole authority
