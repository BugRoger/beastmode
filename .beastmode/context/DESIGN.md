# Design Context

## Product
- ALWAYS design before code — structured phases prevent wasted implementation
- NEVER skip the retro sub-phase — it's how the system learns and improves
- Capabilities include: collaborative design, bite-sized planning, parallel wave execution, git worktree isolation, brownfield discovery with 17-domain init system, progressive knowledge hierarchy, self-improving retro, squash-per-release commits, session-start hook, unified /beastmode command (init, status, ideas subcommands), deferred ideas capture and reconciliation, deadpan persona, manifest-based local state with optional GitHub mirroring for issue-based lifecycle tracking

## Architecture
- ALWAYS follow the progressive loading pattern — L0 autoloads, L1 loads at prime, L2 on-demand
- NEVER use @imports between hierarchy levels — convention-based paths only
- Three data domains: State (feature workflow), Context (published knowledge), Meta (process knowledge with process + workarounds domains). Manifest JSON is the operational authority for feature lifecycle; GitHub is a synced mirror updated at checkpoint boundaries when enabled
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
Manifest JSON is the operational authority for feature lifecycle. GitHub is a synced mirror updated at checkpoint boundaries when github.enabled is true. Two-level issue hierarchy (Epic > Feature) with label-based state machines. Subagents are GitHub-unaware; only checkpoints read/write manifests and sync GitHub. GitHub API failures warn and continue without blocking.

1. ALWAYS use two-level hierarchy: Epic (capability) > Feature (work unit) with label-based type/phase/status encoding
2. ALWAYS use manifest JSON as operational authority — GitHub is a synced mirror, not the source of truth
3. ALWAYS sync GitHub at checkpoint boundaries only — one sync step per phase between artifact-save and retro
4. NEVER let GitHub API failures block workflow — warn and continue, next checkpoint retries
5. NEVER make subagents GitHub-aware — only the checkpoint (main conversation) handles manifest and GitHub sync
6. ALWAYS use 12-label taxonomy: 2 type, 7 phase, 3 status (ready, in-progress, blocked) plus gate/awaiting-approval — status/review is dropped
7. ALWAYS use github.enabled config toggle to control GitHub sync — when false, all GitHub steps are silently skipped

context/design/github-state-model.md
