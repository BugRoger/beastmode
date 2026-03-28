# Architecture

## Knowledge Hierarchy
- ALWAYS follow progressive loading: L0 autoloads, L1 at prime, L2 on-demand, L3 linked from L2 — prevents context bloat
- NEVER @import between levels — convention-based paths prevent circular dependencies
- L2 domains follow tiered taxonomy: Tier 1 universal, Tier 2 high-frequency, Tier 3 retro-driven — prioritizes loading order
- L1 uses UPPERCASE.md, L2 uses lowercase.md — visual distinction at filesystem level
- ALWAYS use absolute directives (NEVER/ALWAYS) for non-negotiable rules in L1/L2 — enforces clarity
- L3 records ALWAYS have four sections: Context, Decision, Rationale, Source — standardizes decision records
- L0 contains persona + map only — operational details belong in skills, not the autoloaded manual
- Each level follows standardized format: summary paragraph, sections, numbered rules, convention paths — consistency across hierarchy

## Data Domains
- NEVER mix domain concerns — State tracks features, Context documents knowledge, Meta captures process knowledge
- ALWAYS write phase artifacts to `state/` — retro promotes to `context/` and `meta/`
- Manifest JSON is the operational authority for feature lifecycle; GitHub is a synced mirror updated at checkpoint boundaries when enabled — repo files remain the content store
- Write protection: phases write `state/` only, retro promotes — prevents unauthorized knowledge edits
- Meta has two L2 domains per phase: process.md and workarounds.md — separates process patterns from beastmode feedback
- Meta L3 records are topic-clustered with confidence tags — no date prefixes, observations accumulate by topic
- ALWAYS structure state/ as empty phase subdirs with .gitkeep only — no L1 index files in state/
- NEVER put research under state/ — research/ lives at `.beastmode/research/` as reference material, not workflow state
- ALWAYS create a matching L3 directory (with .gitkeep) for every L2 file — ready for retro expansion

## Sub-Phase Anatomy
- Every phase follows: 0-prime, 1-execute, 2-validate, 3-checkpoint — standardized lifecycle
- ALWAYS enter worktree in prime before state file reads — step 3 in plan/implement primes
- 0-prime is read-only except for worktree entry (cd) — no other side effects
- 3-checkpoint triggers retro agents — context walker + meta walker in parallel

## Component Architecture
- Skills (workflow verbs) in `/skills/`, shared utilities in `skills/_shared/`, retro agents in `/agents/` — separation of concerns
- ALWAYS colocate interface (SKILL.md) with implementation — discoverability
- NEVER put shared logic in individual skills — extract to `skills/_shared/`
- Retro agents are phase-scoped — context walker and meta walker review their phase's domain docs

## Worktree Isolation
- ALWAYS use `git merge --squash` for releases — one commit per version on main
- ALWAYS archive branch tips before deletion: `archive/feature/<name>` — preserves history
- NEVER modify main branch during feature work — worktree provides isolation
- Worktrees are ephemeral per-session — feature branches are the durable handoff mechanism between sessions
- CLI-owned worktree lifecycle: branches from `feature/<slug>` if it exists, otherwise from origin/HEAD — smart branch detection rewritten in TypeScript
- Worktree directory is `.claude/worktrees/` (Claude Code default) — CLI manages full lifecycle (create, merge, remove)
- CLI cleans up worktrees after merge — no manual cleanup required
- Skills MUST detect when already running inside an agent worktree and skip their own worktree creation — prevents double-worktree nesting
- After parallel implement agents complete, CLI merges worktrees sequentially with pre-merge conflict simulation via `git merge-tree` then verifies manifest completeness — convergence before validation

## HITL Gate System
- NEVER skip gate steps — `## N. [GATE|...]` steps are structural task-runner items that cannot be bypassed
- Configurable gates resolve from `.beastmode/config.yaml` at runtime — flexibility without hardcoding
- Gate syntax: `## N. [GATE|namespace.gate-id]` with GATE-OPTION subsections — standardized format
- NEVER place competing gate mechanisms on the same decision point — avoids ambiguity
- GitHub gates use comment-based approval for pre-code phases and PR reviews for code phases — gate mechanism matches artifact type
- Phase transitions are externally orchestrated via TypeScript CLI (`beastmode run`) — Justfile retained as thin alias, no in-skill auto-chaining
- Transition gates removed from config.yaml — checkpoint prints `just <next-phase> <slug>` instead

## Retro Knowledge Promotion
- Retro always runs at checkpoint — walkers handle empty phases gracefully, no quick-exit gating
- ALWAYS run retro before release commit — context walker + meta walker in parallel
- Retro reconciliation is artifact-scoped — only checks docs relevant to the new state artifact
- NEVER skip retro — walkers handle empty phases gracefully, no quick-exit gating
- L0 promotion happens only during release phase via L0 proposal files in state/release/ — controlled rollup
- NEVER write to context/ or meta/ directly from phases — retro is the sole gatekeeper
- Meta promotion is confidence-gated: [HIGH] immediate, [MEDIUM]+3 to L1, [LOW]+3 to [MEDIUM] — graduated trust
- Four retro gates aligned to hierarchy: retro.records (L3), retro.context (L2), retro.phase (L1), retro.beastmode (L0) — bottom-up approval
