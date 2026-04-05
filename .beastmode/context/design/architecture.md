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
- `store.json` is the structured entity store at `.beastmode/state/store.json` (gitignored, coexists with manifests during PRD-1; absorbs manifests in PRD-2) — provides hash-based IDs, cross-epic dependency modeling, and queryable CRUD via `beastmode store` CLI namespace
- Write protection: phases write `artifacts/` only, retro promotes and compaction agent prunes — prevents unauthorized knowledge edits
- ALWAYS structure artifacts/ as phase subdirs for committed skill outputs — no L1 index files in artifacts/
- NEVER put research under state/ — research/ lives at `.beastmode/research/` as reference material, not workflow state
- ALWAYS create a matching L3 directory (with .gitkeep) for every L2 file — ready for retro expansion
- ALWAYS introduce new subsystems alongside existing ones in coexistence mode first — PRD-1 establishes the foundation while old system continues, PRD-2 absorbs the old system; prevents disruption during adoption

context/design/architecture/phased-subsystem-rollout.md

## Consumer-Boundary Filtering
- ALWAYS push filtering/gating logic to the consumer boundary (sink, subscriber, adapter) when a source has multiple consumers with divergent filtering needs — producer is pass-all, consumers own policy

context/design/architecture/single-source-api-boundary.md

## Sub-Phase Anatomy
- Every phase follows sub-phase anatomy: prime -> execute -> validate -> checkpoint as inline sections within SKILL.md — standardized lifecycle
- ALWAYS enter worktree in prime before state file reads — step 3 in plan/implement primes
- 0-prime is read-only except for worktree entry (cd) — no other side effects
- 3-checkpoint commits work and hands off to next phase — retro runs only at release

## Component Architecture
- Skills (workflow verbs) in `/skills/`, context walker agent and utility agents (compaction) in `/agents/` — separation of concerns
- ALWAYS colocate interface (SKILL.md) with implementation — discoverability
- NEVER put shared logic in individual skills — extract to shared agents or CLI modules
- Context walker agent receives all phase artifacts at release — single-pass review across the full cycle
- Each SKILL.md is self-contained with inline phase sections — no external imports or blockquote directives

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

## Retro Knowledge Promotion
- Retro runs once at release — context walker receives all phase artifacts in a single pass
- ALWAYS run retro before release commit — context walker as the sole walker
- Retro reconciliation is artifact-scoped — only checks docs relevant to the new state artifact
- Retro walkers ALWAYS apply value-add gate before creating L3 — skip records that add no rationale, constraints, provenance, or dissenting context beyond the L2 summary
- L0 promotion happens only during release phase via L0 proposal files in state/release/ — controlled rollup
- NEVER write to context/ directly from phases — retro and the compaction agent are the sole gatekeepers
- All retro changes (L3/L2/L1/L0) apply automatically — no approval gate, bottom-up order preserved
