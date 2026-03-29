# VISION/README Consolidation Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Consolidate VISION.md into README.md, PRODUCT.md, and a new ROADMAP.md, then delete VISION.md.

**Architecture:** Port VISION.md's problem statement and "What Beastmode Is NOT" to README. Add SAFe positioning to PRODUCT.md. Create ROADMAP.md with Now/Next/Later/Not Planned. Delete VISION.md. All 4 files are independent — no file overlap.

**Tech Stack:** Markdown files

**Design Doc:** [.beastmode/state/design/2026-03-04-vision-readme-consolidation.md](.beastmode/state/design/2026-03-04-vision-readme-consolidation.md)

---

### Task 0: Update README.md with VISION.md content

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `README.md`

**Step 1: Replace "What It Does" heading and opening with "The Problem"**

Replace the current "What It Does" section opening (lines 24-28):

```markdown
## What It Does

Claude Code is powerful. But without structure, you re-explain your project every session, get inconsistent implementations, and lose work between context windows.

Beastmode fixes this. Five phases. Context persists. Patterns compound.
```

With:

```markdown
## The Problem

Three ways AI coding goes sideways:

**Context amnesia.** New session, blank slate. You explain the architecture again. And again. The AI has no memory of yesterday's decisions, last week's refactor, or why you chose that particular pattern. Every conversation starts from zero.

**Scope chaos.** You asked for a login form. You got a login form, a password reset flow, email verification, OAuth integration, and a half-finished admin panel. The AI interpreted "login" as "auth system" and burned 50k tokens before you noticed.

**Process vacuum.** No design phase. No task breakdown. Just straight to code. The AI produces something that works — until you realize it doesn't fit the architecture, violates three conventions, and needs to be rewritten.

These compound. Context loss means the AI can't remember the design decisions that would prevent scope creep. Without process, there's no checkpoint where you can catch any of this before it ships.

Beastmode fixes this. Five phases. Context persists. Patterns compound.
```

**Step 2: Add "What Beastmode Is NOT" section before Credits**

Insert before the `## Credits` section:

```markdown
## What Beastmode Is NOT

**Not a replacement for engineering judgment.** You still design. Agents assist. Final call is yours.

**Not project management.** No sprints. No story points. No standups. No burndown charts. Just engineering workflow.

**Not prescriptive about your stack.** Works with any language, framework, or toolchain. The workflow is stack-agnostic.

**Not autonomous by default.** You choose the leash length. Start with full control. Loosen as trust builds.

**Not magic.** Crystallized engineering lore — patterns that survived contact with reality. Structure helps. Structure isn't a substitute for thinking.
```

**Step 3: Add Roadmap link before "What Beastmode Is NOT"**

Insert after the "Why This Works" section, before "What Beastmode Is NOT":

```markdown
## Roadmap

See [ROADMAP.md](ROADMAP.md) for what's coming next.
```

**Step 4: Verify**

Read README.md and confirm:
- "The Problem" section contains all three problems (context amnesia, scope chaos, process vacuum)
- "What Beastmode Is NOT" section present with 5 items
- ROADMAP.md link present
- No references to progressive autonomy, agent teams, or parallel features
- File reads correctly end-to-end

---

### Task 1: Update PRODUCT.md with SAFe positioning

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `.beastmode/PRODUCT.md`

**Step 1: Add "Where It Fits" section between Goals and How It Works**

Insert after `## Goals` section and before `## How It Works`:

```markdown
## Where It Fits

Beastmode focuses only on the Development layer of software delivery:

```
Portfolio:   Strategy → Ideate → Review → Analyse → Prioritize → Epic
Program:     Epic → Refine → Partition → Estimate → Approve → Feature
Development: Feature → Design → Plan → Implement → Validate → Story    ← BEASTMODE
Delivery:    Story → Integrate → Test → Deploy → Release → Product
Operations:  Product → Support → Patch → Secure → Optimize → Stability
```

Takes a Feature as input, produces working code as output. Ignores Portfolio (strategy), Program (project management), Delivery (CI/CD), and Operations (monitoring). Different tools, different concerns.
```

**Step 2: Verify**

Read PRODUCT.md and confirm:
- "Where It Fits" section present with SAFe diagram
- No aspirational content added
- Existing Vision, Goals, How It Works sections unchanged

---

### Task 2: Create ROADMAP.md

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `ROADMAP.md`

**Step 1: Write ROADMAP.md at repo root**

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

## Next

Designed or partially built. Coming soon.

- **Progressive Autonomy Stage 2** — auto-chaining between phases. The gate mechanism exists (`config.yaml` transitions with `auto` mode), but the wiring to `/compact` and auto-invoke the next skill is incomplete. When done: trigger `/design`, walk away, come back to a completed feature branch.
- **Checkpoint restart** — restart from the last successful phase instead of re-running everything. Phase artifacts already support this; the explicit restart command doesn't exist yet.
- **Demo recording** — terminal demo GIF/SVG for README.

## Later

On the radar. Not yet designed.

- **Progressive Autonomy Stage 3** — agent teams. Multiple agents pull features from a shared tasklist. Peers, not hierarchy. Each agent runs the full design → release pipeline independently.
- **Parallel features** — multiple features in separate worktrees simultaneously, with independent progress tracking.
- **GitHub Issues as tasklist backend** — features as Issues, status as labels. For teams that want visibility beyond the filesystem.
- **Integration phase** — multi-feature coordination and merge conflict handling between parallel feature branches.
- **Other agentic tools** — Cursor, Copilot Workspace, and other AI coding environments beyond Claude Code.

## Not Planned

Deliberately out of scope.

- **Product phase** — deciding *what* to build. Beastmode handles Development (Feature → Story), not Portfolio or Program layers. Stay in your lane.
- **CI/CD integration** — use your existing pipelines. Beastmode produces code; your CI ships it.
- **Project management** — no sprints, no story points, no standups, no burndown charts. If you need those, use a project management tool.
```

**Step 2: Verify**

Read ROADMAP.md and confirm:
- All four sections present (Now/Next/Later/Not Planned)
- Progressive Autonomy Stage 2 and Stage 3 clearly described
- "Not Planned" matches VISION.md's scoping
- No content that belongs in README or PRODUCT.md

---

### Task 3: Delete VISION.md

**Wave:** 2
**Depends on:** Tasks 0, 1, 2

**Files:**
- Delete: `VISION.md`

**Step 1: Verify content relocation**

Before deleting, read README.md, PRODUCT.md, and ROADMAP.md to confirm all VISION.md sections are accounted for:

| VISION.md section | Destination | Check |
|---|---|---|
| Problem statement (3 problems) | README "The Problem" | Verify present |
| Where Beastmode Fits (SAFe) | PRODUCT.md "Where It Fits" | Verify present |
| Progressive Autonomy (3 stages) | ROADMAP.md Next/Later | Verify present |
| What Beastmode Is NOT | README section | Verify present |
| Roadmap Now/Next/Later/Not Planned | ROADMAP.md | Verify present |
| Core Insight, Phase Anatomy, Workflow | Already in architecture.md | N/A (skip) |
| Context Structure, Meta Layer | Already in architecture.md | N/A (skip) |
| Git-Native Architecture | Already in architecture.md | N/A (skip) |
| Assumptions | Covered by PRODUCT.md + ROADMAP.md | N/A (skip) |

**Step 2: Delete VISION.md**

```bash
git rm VISION.md
```

**Step 3: Verify deletion**

```bash
git status
```
Expected: `deleted: VISION.md`

```bash
grep -r "VISION.md" CLAUDE.md .beastmode/CLAUDE.md README.md
```
Expected: no matches (VISION.md not referenced anywhere)
