# Workflow

## Phase Lifecycle
- ALWAYS follow five-phase core: design -> plan -> implement -> validate -> release — invariant sequence
- ALWAYS suggest next phase at checkpoint completion — guides user
- NEVER skip phases — each builds on the previous
- Each phase follows sub-phase anatomy: prime -> execute -> validate -> checkpoint — standardized lifecycle
- Standalone utilities: /beastmode (init), /status — outside the phase chain

## Session Tracking
- ALWAYS update status file on phase completion — `.beastmode/status/YYYY-MM-DD-<feature>.md`
- ALWAYS record session file paths for retro agent inspection — traceability
- Shared reference `skills/_shared/session-tracking.md` provides the template — standardized format

## Context Reports
- ALWAYS include context report @import at end of each phase skill — visibility
- Reports token usage, loaded artifacts, phase position, and handoff options — orientation for next session

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
- ALWAYS check context threshold before auto-chaining — prevents degraded behavior
- ALWAYS respect gate mode from config.yaml — never skip gates
- Config.yaml transitions section controls phase-to-phase chaining — centralized control
- All retro gates must be configurable for fully autonomous cycles — end-to-end automation
