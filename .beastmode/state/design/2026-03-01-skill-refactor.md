# Skill Refactor Design

**Goal:** Refactor all beastmode skills to a consistent, minimal pattern that improves triggering and reduces token bloat.

**Approach:** Lean SKILL.md with phases linking to references, shared functionality composed within phases.

---

## 1. SKILL.md Structure

Every skill follows this pattern:

```markdown
---
name: <skill-name>
description: <Action words> — <keywords>. Use when <trigger>. <What it does>.
---

# /<skill-name>

<One sentence overview.>

<HARD-GATE>
<Constraint one-liner.> [→ Why](references/constraints.md)
</HARD-GATE>

## Phases

1. [<Phase>](phases/1-<phase>.md) — <3-5 word description>
2. [<Phase>](phases/2-<phase>.md) — <3-5 word description>
```

**Rules:**
- Body under 50 lines
- One sentence overview
- HARD-GATE with link to explanation (if applicable)
- 3-5 phases max
- Phase descriptions are terse (3-5 words)

---

## 2. Phase File Structure

Phase files have numbered internal steps with shared functionality @imported at any position:

```markdown
# <Phase Name>

## 1. <Step Name>

<Imperative instructions...>

## 2. <Step Name>

<Imperative instructions...>

## 3. Session Tracking

@../_shared/session-tracking.md

## 4. Context Report

@../_shared/context-report.md
```

**Rules:**
- Numbered internal steps
- Imperative voice throughout
- Shared functionality via @import at any position (start, middle, end)
- Specific, actionable instructions (not conceptual)
- Code examples where applicable

---

## 3. Shared Functionality Files

**Location:** `skills/_shared/`

**Files:**
- `session-tracking.md` — Update status file for current phase
- `context-report.md` — Print token usage, artifacts, handoff options

**Pattern:**

```markdown
# <Functionality Name>

<Imperative instructions...>

1. <Step>
2. <Step>
3. <Step>

## Template

```markdown
<template content>
```
```

**Rules:**
- Self-contained, context-aware (figures out phase/feature from environment)
- No parameters needed from calling skill
- Imperative, actionable steps
- Include templates/examples inline

---

## 4. Directory Structure

```
skills/
├── _shared/
│   ├── session-tracking.md
│   └── context-report.md
├── <skill>/
│   ├── SKILL.md
│   ├── phases/
│   │   ├── 1-<phase>.md
│   │   └── 2-<phase>.md
│   └── references/
│       └── constraints.md
└── ...
```

**Rules:**
- `phases/` — Sequential execution content, numbered files
- `references/` — Non-sequential docs (constraints, detailed explanations)
- `_shared/` — Reusable building blocks for all skills
- No `templates/` or `assets/` unless skill-specific need

---

## 5. Description Format

**Pattern:**

```yaml
description: <Action words> — <keywords>. Use when <trigger>. <What it does>.
```

### Workflow Skills (the cycle)

| Skill | Description |
|-------|-------------|
| prime | Load codebase context — priming, context, understanding. Use when starting a new session. Reads prime docs and loads project knowledge. |
| design | Brainstorm and create designs — designing, speccing, ideating. Use when you have an idea to flesh out. Asks questions, proposes approaches, writes design doc. |
| plan | Create implementation plans — planning, architecting, task breakdown. Use after design. Creates step-by-step implementation plan with code examples. |
| implement | Execute implementation plans — implementing, coding, building. Use after plan. Runs tasks in isolated worktree, merges on completion. |
| release | Create changelogs and release notes — releasing, documenting, shipping. Use after implement. Generates changelog and release notes from commits. |
| retro | Session retrospective — reflecting, reviewing, improving. Use at end of cycle. Reviews session, updates prime docs, captures learnings. |

### Utility Skills (not in cycle)

| Skill | Description |
|-------|-------------|
| research | Conduct discovery and exploration — researching, investigating, analyzing. Use when gathering information. Explores codebase, web, docs and writes findings. |
| status | View session status — tracking, progress, milestones. Use when checking project state. Displays current session and phase progress. |
| bootstrap | Initialize project structure — scaffolding, initializing, setup. Use when starting a new project. Creates .agents/ folder structure with templates. |
| bootstrap-wizard | Interactive project configuration — wizard, configure, prefill. Use after bootstrap. Asks questions to fill prime doc templates. |
| bootstrap-discovery | Autonomous codebase analysis — discovery, scanning, analyzing. Use after bootstrap on existing codebases. Spawns agents to analyze and populate prime docs. |

---

## 6. Skills to Refactor

### Workflow Skills

1. **prime** — Currently minimal, needs phases structure
2. **design** — Currently verbose, move process to phases
3. **plan** — Currently verbose, move task structure to phases
4. **implement** — Already has phases/, align to new pattern
5. **release** — Currently minimal, needs phases structure
6. **retro** — Currently has references/, align phases pattern

### Utility Skills

7. **research** — Currently minimal, needs phases structure
8. **status** — Simple, minimal refactor needed
9. **bootstrap** — Has templates/, keep those, add phases
10. **bootstrap-wizard** — Has references/, align to pattern
11. **bootstrap-discovery** — Has references/, align to pattern

### Delete

- **verify** — Removed from workflow

---

## 7. Migration Notes

- Move current SKILL.md content to `phases/` files
- Extract constraints to `references/constraints.md`
- Update @imports to use `../_shared/` paths
- Keep existing `templates/` in bootstrap (skill-specific)
- Keep existing `agents/` in retro (rename to phases?)
- Verify all skills trigger correctly after refactor
