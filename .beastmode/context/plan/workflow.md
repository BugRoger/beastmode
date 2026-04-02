# Workflow

## Phase Lifecycle
Five-phase core workflow: design -> plan -> implement -> validate -> release. Each phase follows sub-phase anatomy: prime -> execute -> validate -> checkpoint. Standalone utilities: /beastmode (init), /status, /cancel (epic teardown). Retro runs within each checkpoint.

1. ALWAYS follow five-phase core: design -> plan -> implement -> validate -> release
2. ALWAYS suggest next phase at checkpoint completion
3. ONLY checkpoints may print next-step commands — retro and sub-agents are banned from producing transition guidance

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
- Persona is loaded once via BEASTMODE.md L0 autoload — no per-skill imports needed
- NEVER hardcode announce strings — use persona-voiced instructions
- Context-aware greetings and skill announce rules live in BEASTMODE.md Persona section — centralized in L0

## Autonomous Chaining
Checkpoint prints the CLI command for the next phase. Design phase is interactive (human runs manually). Non-design phases run autonomously via the watch loop. GitHub state model extends transitions with label-based phase advancement on Epic issues, enabling external visibility and daemon-driven pipeline progression.

1. ALWAYS use inline code (single backticks) for next-step commands — never code blocks
2. ALWAYS end checkpoint transition output with STOP — no additional output after the command

## Related Decisions
- Init L2 expansion with retro-compatible format — see [init-l2-expansion](../../state/plan/2026-03-08-init-l2-expansion.md)
- Cancel command and CLI orchestration — see [epic-worktree-lifecycle](../../state/plan/2026-03-29-epic-worktree-lifecycle.manifest.json)
