# Release v0.5.5

**Date:** 2026-03-04

## Highlights

Configurable HITL gate system and working auto-transitions between workflow phases. Gates can be set to `human` or `auto` via `.beastmode/config.yaml`. Auto-transitions now use explicit `Skill` tool calls with fully-qualified names to chain phases reliably.

## Features

- Add `.beastmode/config.yaml` with 10 gate IDs and 4 transition IDs, all defaulting to human/auto based on safety
- Add `skills/_shared/gate-check.md` shared utility for reading gate config and branching behavior
- Add `skills/_shared/transition-check.md` with explicit Skill tool call for auto mode transitions
- Annotate 10 HITL gates across design (5), plan (1), implement (3), and release (1) skill phases
- Add transition logic to all 4 checkpoint files (design, plan, implement, validate)
- README rewrite with centered hero, shields.io badges, and install-first layout

## Fixes

- Fix auto-transitions: use explicit `Skill(skill="beastmode:<next>", args="<artifact>")` calls instead of ambiguous "invoke" language
- All 4 checkpoint transitions now pass feature slug as artifact argument
- Drop unreliable `/compact` reference from transition-check.md

## Full Changelog

- `.beastmode/config.yaml`: New config file with gate defaults and transition settings
- `skills/_shared/gate-check.md`: Gate behavior dispatcher (human vs auto)
- `skills/_shared/transition-check.md`: Phase transition with Skill tool calls and context threshold
- `skills/design/phases/{0-prime,1-execute,2-validate,3-checkpoint}.md`: 5 gate annotations + transition
- `skills/plan/phases/{2-validate,3-checkpoint}.md`: 1 gate annotation + transition
- `skills/implement/phases/{1-execute,2-validate,3-checkpoint}.md`: 3 gate annotations + transition
- `skills/validate/phases/3-checkpoint.md`: Transition logic with feature slug
- `skills/release/phases/1-execute.md`: 1 gate annotation (version confirmation)
- `README.md`: Rewritten with centered header, badges, install-first layout
