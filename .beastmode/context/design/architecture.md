# Architecture

System design for beastmode. L0/L1/L2/L3 progressive loading hierarchy with fractal patterns. Three data domains (State/Context/Meta). Worktree isolation for implementation. Squash-per-release commits. Two-tier HITL gate system. Retro-driven knowledge promotion. Artifact-based persistence.

## Knowledge Hierarchy
Four-level progressive enhancement: L0 (system manual, autoloaded), L1 (phase summaries, loaded at prime), L2 (full detail, on-demand), L3 (records, linked from L2). Each level follows the fractal pattern: summary + child summaries + convention paths.

1. ALWAYS follow progressive loading — L0 autoloads, L1 at prime, L2 on-demand, L3 linked from L2
2. NEVER use @imports between levels — convention-based paths only
3. L2 domains follow tiered taxonomy: Tier 1 (universal), Tier 2 (high-frequency), Tier 3 (specialized/retro-driven)
4. L1 files use UPPERCASE.md naming, L2 use lowercase.md

## Data Domains
Three domains with distinct purposes: State (feature workflow, `.beastmode/state/`), Context (published knowledge, `.beastmode/context/`), Meta (learnings/SOPs/overrides, `.beastmode/meta/`).

1. NEVER mix domain concerns — State tracks features, Context documents knowledge, Meta captures learnings
2. ALWAYS write phase artifacts to `state/` — retro promotes to `context/` and `meta/`
3. Write protection: phases write `state/` only; retro promotes to context and meta

## Sub-Phase Anatomy
Every workflow phase follows: 0-prime (read-only context load), 1-execute (action phase), 2-validate (quality check), 3-checkpoint (persistence + retro).

1. ALWAYS enter worktree at step 1 of execute — never in prime
2. 0-prime is read-only — no side effects, no bash commands, no cd
3. 3-checkpoint triggers retro agents (context walker + meta walker in parallel)

## Component Architecture
Skills (workflow verbs) in `/skills/`, agents in `/agents/`, infrastructure in `.beastmode/`. Each skill has SKILL.md manifest, `phases/` directory (0-3), and optional `references/`.

1. ALWAYS colocate interface (SKILL.md) with implementation
2. NEVER put shared logic in individual skills — use `skills/_shared/`
3. Agent prompts are standalone documents — agents discover their own targets

## Worktree Isolation
Feature work in isolated git worktrees at `.beastmode/worktrees/`. Created at /design, inherited through plan/implement/validate, squash-merged by /release.

1. ALWAYS use `git merge --squash` for releases — one commit per version on main
2. ALWAYS archive branch tips before deletion: `archive/feature/<name>`
3. NEVER modify main branch during feature work — worktree provides isolation

## HITL Gate System
Two-tier: HARD-GATE (unconditional, always enforced) and configurable Gate steps (human/auto from config.yaml). Task runner handles detection and substep pruning.

1. NEVER skip HARD-GATEs — they prevent dangerous behavior
2. Configurable gates resolve from `.beastmode/config.yaml` at runtime
3. Gate syntax: `## N. [GATE|namespace.gate-id]` with GATE-OPTION subsections

## Retro Knowledge Promotion
Bottom-up compaction: retro agents review L1/L2 for accuracy, detect gaps, propose L2 file creation with confidence-scored promotion thresholds (HIGH/1st, MEDIUM/2nd, LOW/3rd).

1. ALWAYS run retro before release commit
2. Gap promotion thresholds: HIGH confidence = immediate, MEDIUM = 2nd occurrence, LOW = 3rd
3. L0 promotion happens only during release phase
