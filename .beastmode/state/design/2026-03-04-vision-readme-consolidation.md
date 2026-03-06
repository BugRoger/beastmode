# Design: VISION/README Consolidation

## Goal

Consolidate VISION.md into the proper homes (README.md, PRODUCT.md, new ROADMAP.md). Delete VISION.md. Ensure README and PRODUCT.md only contain what's real and shipped. Create ROADMAP.md for aspirational content with Now/Next/Later/Not Planned format.

## Approach

Three file changes + one new file + one deletion. README gets VISION.md's strongest prose (problem statement, "What Beastmode Is NOT"). PRODUCT.md gets positioning context (SAFe Development lane). ROADMAP.md becomes the home for Progressive Autonomy and all aspirational features. VISION.md gets deleted.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Kill VISION.md | Yes — delete after relocation | Founding document served its purpose; content now properly housed |
| README content rule | Only shipped features | "README is REAL" — no aspirational content |
| PRODUCT.md content rule | Only shipped reality | Agents should work with what exists |
| ROADMAP.md location | Repo root | Visible to users, not imported by agents |
| ROADMAP.md format | Now/Next/Later/Not Planned | Matches VISION.md's proven structure, updated to reality |
| Progressive Autonomy home | ROADMAP.md only | It's aspirational until Stage 2 auto-chaining works |
| "What Beastmode Is NOT" home | README | Positioning for external audience |
| SAFe positioning home | PRODUCT.md | Helps agents understand scope boundaries |
| ROADMAP.md not in CLAUDE.md imports | Correct | Agents don't need roadmap context |

### Claude's Discretion

- Exact wording when porting VISION.md prose to README
- How much of the SAFe framing to include in PRODUCT.md (full diagram vs summary)
- Exact ordering of ROADMAP.md items within each tier
- Whether to add a one-liner about ROADMAP.md to PRODUCT.md

## Components

### 1. README.md — Upgrade with VISION.md voice

Port from VISION.md:
- Problem statement (context amnesia, scope chaos, process vacuum) — strongest prose, use as the hook
- "What Beastmode Is NOT" — positioning section
- One line linking to ROADMAP.md

Keep from current README:
- Tagline, install, skills table, "How It Works", "Why This Works", credits, license

Do NOT add:
- Progressive Autonomy stages
- Agent teams
- Parallel features
- Any unshipped feature

### 2. PRODUCT.md — Add positioning

Add from VISION.md:
- "Where Beastmode Fits" — SAFe Development lane diagram and explanation
- Scope constraint: "only Development — takes a Feature as input, produces a Story (working code) as output"

Keep existing content:
- Vision one-liner, Goals, How It Works

### 3. ROADMAP.md — New file at repo root

**Now (shipped):**
- Five-phase workflow (design → plan → implement → validate → release)
- Configurable HITL gates (config.yaml with human/auto modes)
- Context persistence across sessions (.beastmode/ artifact storage)
- Meta layer with phase retros that inform future sessions
- Git worktree isolation for implementation
- Brownfield discovery (auto-populate context from existing codebase)
- Progressive knowledge hierarchy (L0/L1/L2/L3)

**Next:**
- Progressive Autonomy Stage 2 — auto-chaining between phases (mechanism exists, wiring incomplete)
- Checkpoint restart/recovery — restart from last successful phase
- Demo GIF/SVG for README

**Later:**
- Progressive Autonomy Stage 3 — agent teams, features run end-to-end
- Parallel features — multiple features in separate worktrees simultaneously
- GitHub Issues as tasklist backend
- Integration phase — multi-feature coordination, merge conflict handling
- Other agentic tools (Cursor, Copilot Workspace)

**Not Planned:**
- Product phase (deciding what to build) — stay in Development lane
- CI/CD integration — use existing tools
- Project management features — no sprints, no story points, no standups

### 4. VISION.md — Delete

All valuable content relocated. File served as founding document.

## Files Affected

| File | Change |
|------|--------|
| `README.md` | ADD problem statement, "What Beastmode Is NOT", ROADMAP.md link |
| `.beastmode/PRODUCT.md` | ADD "Where It Fits" positioning section |
| `ROADMAP.md` | **NEW** — Now/Next/Later/Not Planned |
| `VISION.md` | **DELETE** |

## Testing Strategy

- Verify VISION.md content is accounted for (relocated or intentionally dropped)
- Verify README contains no references to unshipped features
- Verify PRODUCT.md contains no aspirational content
- Verify ROADMAP.md is not referenced in CLAUDE.md or .beastmode/CLAUDE.md

## Acceptance Criteria

- [ ] VISION.md deleted from repo
- [ ] README contains VISION.md's three problems (context amnesia, scope chaos, process vacuum)
- [ ] README contains "What Beastmode Is NOT" section
- [ ] README contains zero references to unshipped features (progressive autonomy stages, agent teams, parallel features)
- [ ] README links to ROADMAP.md
- [ ] PRODUCT.md contains SAFe Development lane positioning
- [ ] PRODUCT.md contains zero aspirational content
- [ ] ROADMAP.md exists at repo root with Now/Next/Later/Not Planned
- [ ] ROADMAP.md Progressive Autonomy stages are clearly described
- [ ] ROADMAP.md "Not Planned" section matches VISION.md's scoping
- [ ] ROADMAP.md not imported in CLAUDE.md or .beastmode/CLAUDE.md
- [ ] No content from VISION.md is lost (everything relocated or intentionally dropped)

## Deferred Ideas

- Demo GIF/SVG for README (needs terminal recording, separate task)
- Social proof / badges beyond current set
- ROADMAP.md auto-update during /release (move items between tiers as features ship)
