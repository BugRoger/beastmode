# Changelog Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Add a CHANGELOG.md consolidating 18 release notes into ~10 scannable entries with subtle personality.

**Architecture:** Single new markdown file at repo root. Consolidates `.beastmode/state/release/` notes into version-grouped entries following the `everything-claude-code` format. README gets a one-liner link.

**Tech Stack:** Markdown

**Design Doc:** [.beastmode/state/design/2026-03-04-changelog.md](../../design/2026-03-04-changelog.md)

---

### Task 1: Create CHANGELOG.md

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Create: `CHANGELOG.md`

**Step 1: Create the changelog file**

Create `CHANGELOG.md` at the repo root with the following content. Version titles have subtle flavor. Entries consolidate patch releases per the design doc's grouping table. Format: `### vX.Y.Z — Title (Mon YYYY)` headers, `- **Feature** — Description` bullets.

```markdown
# Changelog

All notable changes to beastmode.

---

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
```

**Step 2: Verify rendered output**

Review the file visually:
- All 18 source releases accounted for across 10 entries
- Newest first
- No commit hashes
- Version titles have flavor
- Bold bullet format consistent throughout

---

### Task 2: Add changelog link to README

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `README.md:85-88`

**Step 1: Add changelog link to Credits section**

In `README.md`, add a changelog link between the Credits heading and the License section. Change:

```markdown
## Credits

Built on ideas from [superpowers](https://github.com/obra/superpowers) and [get-shit-done](https://github.com/gsd-build/get-shit-done).

## License
```

To:

```markdown
## Credits

Built on ideas from [superpowers](https://github.com/obra/superpowers) and [get-shit-done](https://github.com/gsd-build/get-shit-done).

See the full [Changelog](CHANGELOG.md).

## License
```

**Step 2: Verify**

Confirm README has the link and it points to the correct file.
