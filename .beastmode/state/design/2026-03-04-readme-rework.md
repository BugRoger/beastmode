# Design: README Rework

## Goal

Rework the beastmode README to achieve 5000-star GitHub energy. Fix all inconsistencies between README and actual product. Port VISION.md's opinionated voice. Remove credibility killers. Structure for maximum impact.

## Approach

Narrative arc structure with problem-first hook, targeting Claude Code daily drivers. VISION.md's confident, plainspoken voice throughout. Apply Strunk's rules: active voice, concrete language, omit needless words, emphatic words at end.

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hook style | Problem-first | VISION.md's "powerful but chaotic" hooks readers who feel the pain |
| Audience | Claude Code daily drivers | Skip basic explanations, assume tool familiarity |
| Tone | VISION.md voice | Opinionated, plainspoken, confident without arrogance |
| Structure | Narrative arc | Problem → Solution → Workflow → Why → Install → Autonomy → Credits |

### Claude's Discretion

- Exact wording of transition sentences between sections
- Paragraph break placement within sections
- Whether to use horizontal rules between major sections

## Components

### 1. Title + Tagline
Keep current tagline: "Turn Claude Code into a disciplined engineering partner." Strong, concrete, active.

### 2. Problem Statement (from VISION.md)
Three short paragraphs naming the three problems:
- **Context amnesia** — new session, blank slate, explain the architecture again
- **Scope chaos** — asked for login form, got an auth system
- **Process vacuum** — no design phase, straight to code

Bold the problem names. This is the hook.

### 3. Solution Paragraph
"Beastmode fixes this with structure borrowed from enterprise practices — the parts that actually work." From VISION.md. Add: five phases, configurable gates, context that survives sessions.

### 4. Quick Start
Install commands + first workflow in 6 lines. Move up from current mid-page position.

### 5. The Workflow
Visual flow diagram + table with all five actual phases:
- `/design` — think through the approach
- `/plan` — break design into tasks
- `/implement` — execute the plan in isolated worktree
- `/validate` — quality gate before release
- `/release` — ship to main, capture learnings

Remove `/prime`, `/retro`, `/research` (don't exist as standalone skills).

### 6. Why This Works
Four bullets, active voice:
- Context survives sessions
- Scales to complexity
- Knowledge compounds
- No ceremony

### 7. Progressive Autonomy (from VISION.md)
Three stages condensed:
- Stage 1: Human triggers each phase, reviews between
- Stage 2: Phases run autonomously, human gates between them
- Stage 3: Features run end-to-end, human reviews PRs not prompts

### 8. .beastmode/ Folder
Simplified tree. Cut `sessions/`, `worktrees/`. One sentence: "All context lives in Git."

### 9. Credits + License
Keep superpowers and GSD credits. MIT license.

## Files Affected

- `README.md` — complete rewrite

## What Gets Cut

| Section | Why |
|---------|-----|
| Status table (🚧) | Credibility killer — no high-star repo shows incomplete features |
| `/prime` skill references | Doesn't exist — absorbed into sub-phases |
| `/retro` skill references | Doesn't exist — absorbed into checkpoint |
| `/research` skill references | Doesn't exist — auto-triggered by design/plan |
| File Naming section | Too granular for README, belongs in docs |
| `sessions/` and `worktrees/` in tree | Implementation details |

## What Gets Added

| Section | Why |
|---------|-----|
| Problem statement | Hook — the "why should I care" |
| Progressive Autonomy | The differentiator |
| Correct skill list | Fix inconsistencies with reality |

## Acceptance Criteria

- [ ] No references to `/prime`, `/retro`, or `/research` as standalone skills
- [ ] `/validate` included in workflow
- [ ] Problem statement ports VISION.md's three problems
- [ ] Progressive autonomy section present
- [ ] Install commands within first 40 lines
- [ ] Status table removed
- [ ] All five phases correctly described
- [ ] Active voice throughout (Strunk rule 10)
- [ ] Under 160 lines total
- [ ] `.beastmode/` tree matches actual structure

## Research

Research findings saved to `.beastmode/state/research/2026-03-04-readme-star-patterns.md`. Key insights from studying repos with 24k-73k stars: kill status tables, move install up, add personality, short beats long.

## Deferred Ideas

- **Demo GIF/SVG** — all high-star repos have one. Needs actual terminal recording. Separate task.
- **Badges** — stars, license, Claude Code compatible. Easy but separate concern.
- **Social proof quotes** — once real users exist. Can't fabricate.
