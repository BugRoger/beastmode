# Design Context

## Product
- ALWAYS design before code — structured phases prevent wasted implementation
- NEVER skip the retro sub-phase — it's how the system learns and improves
- Capabilities include: collaborative design, bite-sized planning, parallel wave execution, git worktree isolation, brownfield discovery with 17-domain init system, progressive knowledge hierarchy, self-improving retro, squash-per-release commits, session-start hook, unified /beastmode command (init, status, ideas subcommands), deferred ideas capture and reconciliation, deadpan persona, GitHub state externalization with issue-based lifecycle tracking

## Architecture
- ALWAYS follow the progressive loading pattern — L0 autoloads, L1 loads at prime, L2 on-demand
- NEVER use @imports between hierarchy levels — convention-based paths only
- Three data domains: State (feature workflow), Context (published knowledge), Meta (process knowledge with process + workarounds domains). GitHub supplements State as status/lifecycle authority while repo remains content authority
- ALWAYS create a matching L3 directory for every L2 file — structural invariant for retro expansion
- State has no L1 index files — only empty phase subdirs with .gitkeep as workflow containers
- research/ lives at .beastmode/ root, not under state/ — reference material is not workflow state
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
Self-chaining mechanism between phases. Auto-transitions use fully-qualified Skill tool calls. Standardized transition gate output: single inline code with resolved artifact path. Only the transition gate may produce next-step commands; retro agents are banned from transition guidance.

1. ALWAYS produce a single copy-pasteable inline code command with the resolved artifact path at transition
2. NEVER print transition guidance from retro agents — transition gate is the sole authority
3. ALWAYS STOP after printing transition output — no additional output

## Tech Stack
- NEVER add package runtime dependencies — beastmode is markdown interpreted by Claude Code. GitHub API via `gh` CLI is an infrastructure dependency
- ALWAYS use markdown + YAML frontmatter for skill definitions
- Distribution via Claude Code marketplace

## Init System
5-phase bootstrapping system (skeleton, inventory, write, retro, synthesize) that detects 17 L2 domains and produces retro-compatible output. Writers and retros run in parallel. Greenfield mode installs skeleton only.

1. ALWAYS follow 5-phase init order: skeleton install -> inventory -> write -> retro -> synthesize
2. ALWAYS produce ALWAYS/NEVER format in L2 and Context/Decision/Rationale in L3 — unified with retro output
3. NEVER include beastmode-specific domains in skeleton — retro creates those
4. ALWAYS run retro pass after writers even on empty state/ — no conditional gating

context/design/init-system.md

## GitHub State Model
GitHub Issues externalize beastmode's workflow state so features are visible on a project board and an autonomous daemon can drive the pipeline. Two-level issue hierarchy (Epic > Feature) with label-based state machines. GitHub tracks lifecycle and gates; repo files remain the content store.

1. ALWAYS use two-level hierarchy: Epic (capability) > Feature (work unit) with label-based type/phase/status encoding
2. ALWAYS keep GitHub as status authority and repo as content authority — no duplication
3. ALWAYS write to GitHub alongside existing state files during migration — additive first, subtractive later
4. NEVER store design docs or plans in issue bodies — link to repo artifacts instead
5. ALWAYS define transition modes in config.yaml — human (gated), auto (self-advance), automatic (roll-up)

context/design/github-state-model.md
