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
- NEVER mix domain concerns — State tracks features, Context documents knowledge
- ALWAYS write phase artifacts to `artifacts/<phase>/` — retro promotes to `context/`
- Manifest JSON is the operational authority for feature lifecycle via manifest-store.ts (filesystem) and manifest.ts (pure state machine), with top-level `phase` field as the single phase source of truth; manifests live in `.beastmode/state/` (gitignored); GitHub is a one-way synced mirror updated by the CLI after every phase dispatch when enabled — repo files remain the content store
- Write protection: phases write `artifacts/` only, retro promotes and compaction agent prunes — prevents unauthorized knowledge edits
- ALWAYS structure artifacts/ as phase subdirs for committed skill outputs — no L1 index files in artifacts/
- NEVER put research under state/ — research/ lives at `.beastmode/research/` as reference material, not workflow state
- ALWAYS create a matching L3 directory (with .gitkeep) for every L2 file — ready for retro expansion

## Sub-Phase Anatomy
- Every phase follows: 0-prime, 1-execute, 2-validate, 3-checkpoint — standardized lifecycle
- ALWAYS enter worktree in prime before state file reads — step 3 in plan/implement primes
- 0-prime is read-only except for worktree entry (cd) — no other side effects
- 3-checkpoint commits work and hands off to next phase — retro runs only at release

## Component Architecture
- Skills (workflow verbs) in `/skills/`, context walker agent and utility agents (compaction) in `/agents/` — separation of concerns
- ALWAYS colocate interface (SKILL.md) with implementation — discoverability
- NEVER put shared logic in individual skills — extract to `skills/_shared/`
- Context walker agent receives all phase artifacts at release — single-pass review across the full cycle
- Phase checkpoint files MAY use blockquote directives before @imports to override shared skill behavior — reference sections by name, not step number, to survive renumbering

## Worktree Isolation
- ALWAYS use `git merge --squash` for releases — one commit per version on main
- ALWAYS archive branch tips before deletion: `archive/feature/<name>` — preserves history
- NEVER modify main branch during feature work — worktree provides isolation
- Worktrees persist across phases (create-once at first phase, squash-merge and remove at release) — not ephemeral per-session
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
- Phase transitions are externally orchestrated via TypeScript CLI (`beastmode <phase> <slug>`) — Justfile deleted, CLI is sole entry point, no in-skill auto-chaining
- Transition gates removed from config.yaml — checkpoint prints `beastmode <next-phase> <slug>` instead

## Retro Knowledge Promotion
- Retro runs once at release — context walker receives all phase artifacts in a single pass
- ALWAYS run retro before release commit — context walker as the sole walker
- Retro reconciliation is artifact-scoped — only checks docs relevant to the new state artifact
- Retro walkers ALWAYS apply value-add gate before creating L3 — skip records that add no rationale, constraints, provenance, or dissenting context beyond the L2 summary
- L0 promotion happens only during release phase via L0 proposal files in state/release/ — controlled rollup
- NEVER write to context/ directly from phases — retro and the compaction agent are the sole gatekeepers
- Single retro gate: retro.beastmode (L0 human approval) — L3/L2/L1 changes apply automatically, bottom-up order preserved
