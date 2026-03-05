# Product

Beastmode is a workflow system that turns Claude Code into a disciplined engineering partner through opinionated workflow patterns. It provides a structured five-phase workflow (design → plan → implement → validate → release) with context persistence across sessions and a self-improvement meta layer.

## Vision

Turn Claude Code into a disciplined engineering partner through opinionated workflow patterns.

## Goals

- Structured phases (design → plan → implement → validate → release) with consistent sub-phase anatomy (prime → execute → validate → checkpoint)
- Context persistence across sessions via `.beastmode/` artifact storage organized as Product, Context, State, and Meta domains
- Self-improvement through meta layer — retro phases capture learnings that inform future sessions
- Progressive knowledge hierarchy — L0 (PRODUCT.md) provides richest standalone summary, L1 files provide domain summaries, L2 files provide full detail, L3 state artifacts provide provenance

## Capabilities

- **Five-phase workflow**: Design → plan → implement → validate → release with consistent 4-step sub-phase anatomy (prime → execute → validate → checkpoint)
- **Collaborative design**: Interactive gray area identification, multi-option proposals, and user approval gates before any implementation begins
- **Bite-sized planning**: Design components decomposed into wave-ordered, file-isolated tasks with complete code and exact commands
- **Parallel wave execution**: Implementation tasks dispatched in parallel within waves when file isolation analysis confirms no overlaps
- **Git worktree isolation**: Feature work happens in isolated worktrees created at design time, inherited by all phases, merged clean by /release
- **HITL gate configuration**: Configurable human-in-the-loop gates (auto/interactive/approval) across all workflow phases via config.yaml
- **Brownfield discovery**: Auto-populate project context by spawning parallel exploration agents against existing codebases
- **Fractal knowledge hierarchy**: L0/L1/L2/L3 progressive loading with bottom-up retro bubble to keep documentation accurate
- **Self-improving retro**: Each phase checkpoint classifies findings into SOPs, overrides, and learnings via parallel review agents, with tiered HITL gates and auto-promotion of recurring learnings to SOPs
- **Unified cycle commits**: All phase artifacts accumulate uncommitted in worktree; /release owns the single commit + merge + cleanup
- **Release automation**: Version detection, commit categorization, changelog generation, marketplace publishing, and PRODUCT.md rollup

## How It Works

Each skill (/design, /plan, /implement, /validate, /release) follows the same four sub-phases: prime loads context, execute does the work, validate checks quality, checkpoint saves artifacts and captures learnings. Features flow through `.beastmode/state/` directories as they progress through the workflow. Git worktrees provide isolation — created at /design, inherited through /plan and /implement, merged by /release. The retro sub-phase propagates changes upward through the L2→L1 knowledge hierarchy, while /release rolls up L1 summaries into this L0 document.
