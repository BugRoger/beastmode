# Workflow

## Phase Lifecycle
Five-phase core workflow: design -> plan -> implement -> validate -> release. Each phase follows sub-phase anatomy: prime -> execute -> validate -> checkpoint. Standalone utilities: /beastmode (init), /status. Retro runs within each checkpoint.

1. ALWAYS follow five-phase core: design -> plan -> implement -> validate -> release
2. ALWAYS suggest next phase at checkpoint completion
3. ONLY the transition gate in checkpoint sub-phases may print next-step commands — retro and sub-agents are banned from producing transition guidance

## Session Tracking
- ALWAYS update status file on phase completion — `.beastmode/status/YYYY-MM-DD-<feature>.md`
- ALWAYS record session file paths for retro agent inspection — traceability
- Shared reference `skills/_shared/session-tracking.md` provides the template — standardized format

## Parallel Execution
- ALWAYS batch independent tasks for parallel execution in /implement — throughput
- NEVER commit during /implement execute phase — defer to /release
- Up to 3 independent tasks per batch — concurrency limit
- Batch selection filters pending tasks with no unmet dependencies — dependency-aware

## Retro Agents
- ALWAYS pass L1 paths (not hardcoded file lists) to retro agents — dynamic discovery
- ALWAYS include session context block in agent prompts — scoped review
- Context walker parses @imports from L1 files to discover L2 review targets — hierarchy-driven
- Meta walker classifies findings as SOPs, overrides, or learnings — categorized knowledge

## Release Git Workflow
- ALWAYS archive feature branch tip before squash merge — preserves history
- ALWAYS use GitHub release style commit messages — consistency
- Releases use `git merge --squash` to collapse feature branches into one commit per version on main — clean history

## Persona System
- ALWAYS import persona.md in 0-prime.md announce steps — centralized character
- NEVER hardcode announce strings — use persona-voiced instructions
- Context-aware greetings factor in time of day and project state — situational awareness

## Autonomous Chaining
Config.yaml transitions section controls phase-to-phase chaining. Transition gates use standardized output format: human mode prints `Next:` with inline-code command; auto mode chains via Skill() calls. All gates end with STOP. All retro gates must be configurable for fully autonomous cycles.

1. ALWAYS respect gate mode from config.yaml — never skip gates
2. ALWAYS use inline code (single backticks) for next-step commands — never code blocks
3. ALWAYS end transition gate output with STOP — no additional output after the command

## Related Decisions
- Init L2 expansion with retro-compatible format — see [init-l2-expansion](../../state/plan/2026-03-08-init-l2-expansion.md)
