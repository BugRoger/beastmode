# Roadmap Audit Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Update ROADMAP.md to reflect actual implementation status — move shipped features to Now, clarify Next, reorder Later.

**Architecture:** Single file edit. Replace all four sections (Now, Next, Later, Not Planned) with accurate content based on codebase audit.

**Tech Stack:** Markdown

**Design Doc:** `.beastmode/state/design/2026-03-05-roadmap-audit.md`

---

### Task 0: Rewrite ROADMAP.md

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `ROADMAP.md:1-42`

**Step 1: Replace entire file content**

Replace the full contents of `ROADMAP.md` with:

```markdown
# Roadmap

> What's shipped, what's next, and what we're not building.

## Now

Shipped and working in the current release.

- **Five-phase workflow** — design → plan → implement → validate → release
- **Configurable HITL gates** — `.beastmode/config.yaml` with `human`/`auto` modes per gate
- **Context persistence** — `.beastmode/` artifact storage survives across sessions
- **Meta layer** — phase retros capture learnings that inform future sessions
- **Git worktree isolation** — each feature gets its own worktree and branch
- **Brownfield discovery** — `/beastmode init --brownfield` auto-populates context from existing codebases
- **Progressive knowledge hierarchy** — L0/L1/L2/L3 with fractal progressive enhancement
- **Phase auto-chaining** — `config.yaml` transitions chain phases via `Skill()` calls. Set transitions to `auto`, and `/design` flows through `/plan` → `/implement` → `/validate` → `/release` automatically. Context threshold stops chaining when the window is low.
- **Deadpan persona** — centralized character definition with context-aware greetings and persona-voiced skill announces across all workflow phases

## Next

Designed or partially built. Coming soon.

- **Checkpoint restart** — restart from the last successful phase instead of re-running everything. Task-level resume exists for `/implement` (via `.tasks.json`); phase-level skip doesn't exist yet.
- **Dynamic retro walkers** — replace hardcoded retro agents with structure-walking agents that discover review targets from L1 @imports. Designed and approved; not yet implemented.
- **Demo recording** — terminal demo GIF/SVG for README.

## Later

On the radar. Not yet designed.

- **Model profile control** — configure which model each subagent uses (Opus, Sonnet, Haiku) via `.beastmode/config.yaml`. Per-agent cost/quality tradeoffs. Budget mode for high-volume work, quality mode for critical architecture.
- **Parallel features** — multiple features in separate worktrees simultaneously, with independent progress tracking.
- **Retro confidence scoring** — weight learnings by frequency and recency instead of raw count. A learning seen 3 times this week matters more than one seen 3 times over 3 months. Confidence decay for stale patterns, growth for recurring ones. Smarter auto-promotion to SOPs.
- **Community learning loop** — retro learnings don't stay in your project. Friction and patterns bubble up as issues to the beastmode repo automatically — crowdsourcing improvements from every user. The meta layer goes from project-scoped to ecosystem-scoped.
- **GitHub feature tracking** — features become GitHub issues. A kanban board tracks them through design → plan → implement → validate → release. State management updates labels as features move through phases. PRs link to artifacts, design docs, and plans. `.beastmode/state/` stays in sync, but now you can see everything in GitHub too.
- **Integration phase** — multi-feature coordination and merge conflict handling between parallel feature branches.
- **Progressive Autonomy Stage 3** — agent teams. Multiple agents pull features from a shared tasklist. Peers, not hierarchy. Each agent runs the full design → release pipeline independently.
- **Other agentic tools** — Cursor, Copilot Workspace, and other AI coding environments beyond Claude Code.

## Not Planned

Deliberately out of scope.

- **Product phase** — deciding *what* to build. Beastmode handles Development (Feature → Story), not Portfolio or Program layers. Stay in your lane.
- **CI/CD integration** — use your existing pipelines. Beastmode produces code; your CI ships it.
- **Project management** — no sprints, no story points, no standups, no burndown charts. If you need those, use a project management tool.
```

**Step 2: Verify no stale references**

Run: `grep -c "compact" ROADMAP.md`
Expected: `0`

Run: `grep -c "Progressive Autonomy Stage 2" ROADMAP.md`
Expected: `0`

Run: `grep -c "Phase auto-chaining" ROADMAP.md`
Expected: `1`

Run: `grep -c "Dynamic retro walkers" ROADMAP.md`
Expected: `1`
