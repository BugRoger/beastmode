# Architecture

System design for beastmode. L0/L1/L2/L3 progressive loading hierarchy with standardized format per level. Three data domains (State/Context/Meta). Worktree isolation for implementation. Squash-per-release commits. Two-tier HITL gate system with task-runner enforcement. Artifact-scoped retro reconciliation. Write-protected knowledge promotion.

## Knowledge Hierarchy
Four-level progressive enhancement: L0 (system manual, autoloaded), L1 (phase summaries, loaded at prime), L2 (full detail, on-demand), L3 (records, linked from L2). Each level follows standardized format: summary paragraph, sections grouped by child-level topics, numbered rules, convention paths. L0 contains only persona spec and high-level workflow map; operational details (hierarchy paths, write protection, gate mechanics, sub-phase anatomy) live in skills.

1. ALWAYS follow progressive loading — L0 autoloads, L1 at prime, L2 on-demand, L3 linked from L2
2. NEVER use @imports between levels — convention-based paths only
3. L2 domains follow tiered taxonomy: Tier 1 (universal), Tier 2 (high-frequency), Tier 3 (specialized/retro-driven)
4. L1 files use UPPERCASE.md naming, L2 use lowercase.md
5. ALWAYS use absolute directives (NEVER/ALWAYS) for non-negotiable rules in L1/L2 files
6. L3 records ALWAYS have four sections: Context, Decision, Rationale, Source
7. L0 contains persona + map only — operational details belong in skills, not in the autoloaded system manual

## Data Domains
Three domains with distinct purposes: State (feature workflow, `.beastmode/state/`), Context (published knowledge, `.beastmode/context/`), Meta (process knowledge, `.beastmode/meta/`). Meta uses two L2 domains per phase: `process.md` (process patterns) and `workarounds.md` (beastmode feedback). Topic-clustered L3 records accumulate observations with confidence tags ([LOW]/[MEDIUM]/[HIGH]).

1. NEVER mix domain concerns — State tracks features, Context documents knowledge, Meta captures process knowledge
2. ALWAYS write phase artifacts to `state/` — retro promotes to `context/` and `meta/`
3. Write protection: phases write `state/` only; retro promotes to context and meta
4. Meta domain has two L2 domains per phase: process.md (process patterns) and workarounds.md (beastmode feedback)
5. Meta L3 records are topic-clustered with confidence tags — no date prefixes

## Sub-Phase Anatomy
Every workflow phase follows: 0-prime (context load + worktree entry), 1-execute (action phase), 2-validate (quality check), 3-checkpoint (persistence + retro).

1. ALWAYS enter worktree in prime before state file reads — step 3 in plan/implement primes
2. 0-prime is read-only except for worktree entry (cd) — no other side effects
3. 3-checkpoint triggers retro agents (context walker + meta walker in parallel)

## Component Architecture
Skills (workflow verbs) in `/skills/`, shared utilities in `skills/_shared/`, retro agents in `/agents/`. Each skill has SKILL.md manifest, `phases/` directory (0-3), and optional `references/`.

1. ALWAYS colocate interface (SKILL.md) with implementation
2. NEVER put shared logic in individual skills — use `skills/_shared/`
3. Retro agents are phase-scoped — context walker and meta walker review their phase's domain docs

## Worktree Isolation
Feature work in isolated git worktrees at `.beastmode/worktrees/`. Created at /design, inherited through plan/implement/validate, squash-merged by /release. Cross-session discovery resolves feature worktree from explicit argument (state file path) or fallback scan of `.beastmode/worktrees/`.

1. ALWAYS use `git merge --squash` for releases — one commit per version on main
2. ALWAYS archive branch tips before deletion: `archive/feature/<name>`
3. NEVER modify main branch during feature work — worktree provides isolation
4. Cross-session discovery: phases resolve feature worktree from explicit argument or fallback scan

## HITL Gate System
Two-tier: unconditional gates (always enforced, embedded as structural task-runner steps) and configurable gates (human/auto resolved from config.yaml). Task runner handles detection and substep pruning. Auto-transitions between phases use `Skill(skill="beastmode:<next>", args="<artifact>")` with fully-qualified names. Context threshold checks determine whether to auto-advance or print session-restart instructions.

1. NEVER skip gate steps — `## N. [GATE|...]` steps are structural task-runner items that cannot be bypassed
2. Configurable gates resolve from `.beastmode/config.yaml` at runtime
3. Gate syntax: `## N. [GATE|namespace.gate-id]` with GATE-OPTION subsections
4. NEVER place competing gate mechanisms on the same decision point

## Retro Knowledge Promotion
Artifact-scoped reconciliation: context walker quick-checks L1, deep-checks L2 only when stale, recognizes new areas without confidence scoring. Meta walker mirrors the context walker algorithm with L1 quick-check, L2 deep-check, L3 record management, and confidence-gated promotion. Two retro gates: `retro.records` (L3 record creation/appends) and `retro.promotions` (L1/L2 upgrades). Single `retro.context-write` gate covers context doc writes. Promotion thresholds: [HIGH] promotes immediately, [MEDIUM] + 3 observations promotes to L1, [LOW] + 3 observations upgrades to [MEDIUM]. Retro owns L2->L1 propagation; release owns L1->L0 via rollup step.

1. ALWAYS run retro before release commit — context walker + meta walker in parallel
2. Retro reconciliation is artifact-scoped — only checks docs relevant to the new state artifact
3. L0 promotion happens only during release phase via L0 proposal files in state/release/
4. NEVER write to context/ or meta/ directly from phases — retro is the sole gatekeeper
5. Meta promotion is confidence-gated: [HIGH] immediate, [MEDIUM]+3 to L1, [LOW]+3 to [MEDIUM]
6. Two meta retro gates: retro.records (L3 writes) and retro.promotions (L1/L2 upgrades)
