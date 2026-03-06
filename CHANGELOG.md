# Changelog

All notable changes to beastmode.

---

### v0.11.1 — The Reflow (Mar 2026)

- **README restructure** — "What Makes It Different" → expanded "How It Works" + new "What Makes It Work" section
- **Mechanics-only prose** — Removed pitch framing, replaced with sharp explanations of how beastmode actually works
- **Session model documented** — Self-contained phase model (checkpoint → clean session → prime) now front and center

### v0.11.0 — The Squash (Mar 2026)

- **Squash-per-release** — `/release` uses `git merge --squash` to collapse feature branches into one commit on main
- **Archive tagging** — Feature branch tips preserved as `archive/feature/<name>` tags before deletion
- **GitHub release style commits** — `Release vX.Y.Z — Title` with categorized Features/Fixes/Artifacts body
- **Retroactive rewrite script** — `scripts/squash-history.sh` rebuilds main as one commit per version tag

### v0.10.1 — The Ungated Retro (Mar 2026)

- **Configurable retro gates** — 4 per-category `Gate:` steps (learnings, sops, overrides, context-changes) replace HTML comment annotations
- **Merge strategy gate** — Release merge/PR/keep/discard decision now configurable via `release.merge-strategy` gate
- **5 new config keys** — Fine-grained autonomous control for retro and merge phases
- **README differentiators section** — New "What Makes It Different" section with four substantial inline arguments: progressive hierarchy, compounding knowledge, session-surviving context, design-before-code

### v0.10.0 — The Visible Gate (Mar 2026)

- **Task-runner gate detection** — Gate steps processed by task runner with config.yaml lookup and mode-based substep pruning
- **Inline gate steps** — 15 `## N. Gate:` steps replace `<!-- HITL-GATE -->` annotations + `@gate-check.md`/`@transition-check.md` imports across all skill phases
- **Two-tier HITL system** — `<HARD-GATE>` for unconditional constraints, `## N. Gate:` for configurable human/auto behavior

### v0.9.0 — The Dynamic Retro (Mar 2026)

- **Dynamic retro walkers** — Replace hardcoded retro agents with structure-walking hierarchy walkers
- **Design approval summary** — Executive summary shown before design approval gate
- **Meta hierarchy** — Fractal L2 hierarchy for meta domain with SOPs, overrides, learnings per phase

### v0.8.1 — The Summary (Mar 2026)

- **Design approval summary** — Executive summary (goal, approach, locked decisions, acceptance criteria) shown before the approval gate so users see the full picture before approving

### v0.7.0 — The Argument (Mar 2026)

- **Progressive hierarchy essay** — New `docs/progressive-hierarchy.md` makes the case for curated hierarchical context over flat embedding retrieval
- **README rework** — "Why This Works" leads with hierarchy differentiator and links to the deep-dive essay
- **Agent-facing differentiators** — PRODUCT.md gains "Key Differentiators" section so agents understand *why* the hierarchy exists
- **docs/ directory** — External-facing documentation home, not imported by agents

### v0.6.1 — No More Rebase (Mar 2026)

- **Merge-only release** — Replaced `git rebase origin/main` with merge-only strategy; conflicts resolve once instead of per-commit replay
- **Fewer version files** — Dropped hardcoded version from README.md badge and PRODUCT.md `Current Version` section; version now lives in 3 files (plugin.json, marketplace.json, session-start.sh)

### v0.6.0 — The Paper Trail (Mar 2026)

- **CHANGELOG.md** — Consolidated 18 releases into 10 scannable entries with subtle personality in version titles
- **README changelog link** — Credits section now links to the full changelog

### v0.5.2 — Living Docs & README Rewrite (Mar 2026)

- **PRODUCT.md release rollup** — PRODUCT.md becomes a living document updated at release time with capabilities inventory and current version
- **README rewrite** — Restructured following high-star GitHub patterns: centered hero, badges, install-first layout, removed credibility killers

### v0.5.0 — Parallel Waves (Mar 2026)

- **Parallel wave dispatch** — /implement spawns agents concurrently within waves when file isolation analysis confirms no overlaps
- **File isolation analysis** — /plan detects file overlap per wave, auto-resequences conflicts, marks safe waves with `Parallel-safe: true`
- **Sequential fallback** — Graceful degradation to sequential dispatch when parallel safety can't be verified

### v0.4.1 — The Big Redesign (Mar 2026)

- **Implement v2** — Subagent-per-task execution model with wave ordering, deviation rules, and spec checks
- **Design v2** — Gray area identification, scope guardrails, role clarity, discussion pacing, and downstream-aware output
- **Plan improvements** — Wave-based task dependencies, design coverage verification, structured skill handoff
- **Lean prime refactor** — 0-prime is now read-only; all side effects moved to 1-execute
- **Lazy task expansion** — Sub-phases expand only when entered, reducing TodoWrite noise by ~60%
- **Git branching strategy** — `feature/<feature>` branches with `.beastmode/worktrees/` isolation
- **Phase retro system** — Parallel agents review context docs and capture meta learnings at every checkpoint
- **Release workflow** — Sync with main before version bump, fix version detection, retro before commit

### v0.4.0 — Fractal Knowledge (Mar 2026)

- **Progressive L1 docs** — Fractal knowledge hierarchy where every level follows the same pattern: summary + section summaries + @imports
- **`.beastmode/CLAUDE.md` manifest** — Pure @imports hub wiring all L0/L1 files into sessions
- **Retro bottom-up bubble** — 3-checkpoint propagates summaries L2 → L1 → L0
- **Fix: meta and state loading** — Meta learnings and state L1 files now actually loaded into sessions

### v0.3.6 — Plan & Release Polish (Mar 2026)

- **Wave-based task dependencies** — Plan task format gains `Wave` and `Depends on` fields for parallel execution
- **Design coverage verification** — Plan validation checks every design component maps to a task
- **Release version sync** — Rebase on main before bumping to eliminate version conflicts on merge
- **Release retro fix** — Retro moved before commit step so meta learnings get included in the release

### v0.3.3 — Lean & Lazy (Mar 2026)

- **Lazy task expansion** — Sub-phases expand only when a phase becomes active, not at parse time
- **Child collapse** — Completed phase children removed from TodoWrite to save tokens
- **Session tracking removal** — Eliminated `.beastmode/sessions/` directory; worktree lookup via path convention instead

### v0.3.1 — Phase Retro (Mar 2026)

- **Shared retro module** — Every workflow phase runs a scoped retro with 2 parallel agents at checkpoint
- **Context review agent** — Compares session artifacts against context docs for accuracy
- **Meta learnings agent** — Captures phase-specific insights with confidence levels
- **Quick-exit heuristic** — Skips agent review for trivial sessions

### v0.3.0 — Branching Out (Mar 2026)

- **Feature branches** — `feature/<feature>` naming replaces `cycle/<topic>`, spanning the entire design-to-release lifecycle
- **Worktree isolation** — Feature work happens in `.beastmode/worktrees/<feature>`, shared worktree-manager handles create/enter/merge/cleanup
- **Natural commits** — Removed "Do NOT commit" constraints; phases commit freely, release owns merge

### v0.2.0 — New Foundation (Mar 2026)

- **`.beastmode/` migration** — Replaced `.agents/` with organized four-domain structure: Product, State, Context, Meta
- **L0/L1/L2 hierarchy** — Efficient context loading: L1 always loaded, L2 on-demand
- **`/validate` skill** — Quality gate before release with tests, lint, type checks
- **Skill anatomy standard** — All workflow skills follow `0-prime → 1-execute → 2-validate → 3-checkpoint`
- **Release skill** — Version detection, commit categorization, changelog generation, interactive merge, git tagging
- **Task runner** — Shared utility enforces step completion via TodoWrite tracking

### v0.1.12 — Genesis (Mar 2026)

- **Session banner** — `hooks/session-start.sh` prints activation banner with version and random self-deprecating quote
- **Plugin hooks** — `plugin.json` gains hooks configuration with `${CLAUDE_PLUGIN_ROOT}` path variable
