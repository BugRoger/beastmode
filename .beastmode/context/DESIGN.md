# Design Context

## Product
- ALWAYS design before code — structured phases prevent wasted implementation
- NEVER skip the retro sub-phase — it's how the system learns and improves
- Capabilities include: collaborative design, bite-sized planning, parallel wave execution, git worktree isolation, brownfield discovery, progressive knowledge hierarchy, self-improving retro, squash-per-release commits, session-start hook, /beastmode command, deadpan persona

## Architecture
- ALWAYS follow the progressive loading pattern — L0 autoloads, L1 loads at prime, L2 on-demand
- NEVER use @imports between hierarchy levels — convention-based paths only
- Three data domains: State (feature workflow), Context (published knowledge), Meta (process knowledge with process + workarounds domains)
- Sub-phase anatomy is invariant: prime -> execute -> validate -> checkpoint
- NEVER write to context/ or meta/ directly from phases — retro is the sole gatekeeper
- Retro reconciliation is artifact-scoped — quick-check L1 first, deep-check L2 only when stale
- Meta walker mirrors context walker algorithm — L1 quick-check, L2 deep-check, L3 record management with confidence-gated promotion
- NEVER skip retro — walkers handle empty phases gracefully, no quick-exit gating

## Task Runner
- ALWAYS track tasks via TodoWrite — one in_progress at a time
- NEVER expand linked files eagerly — lazy expansion on first visit only
- Gate steps (`## N. [GATE|...]`) are structural — cannot be bypassed

## Release Workflow
- ALWAYS run retro from checkpoint before merge — consistent across all five phases
- NEVER make interim commits during feature work — single commit at release
- ALWAYS archive branch tip before squash merge

## Phase Transitions
- ALWAYS check context threshold before auto-advancing
- NEVER auto-advance below threshold — print restart instructions and STOP

## Tech Stack
- NEVER add runtime dependencies — beastmode is markdown interpreted by Claude Code
- ALWAYS use markdown + YAML frontmatter for skill definitions
- Distribution via Claude Code marketplace
