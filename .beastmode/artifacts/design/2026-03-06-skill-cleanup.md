# Skill Cleanup

## Goal

Standardize all skill files with consistent patterns for persona, imports, gates, task runner placement, context loading, and research flow. Remove hardcoded text, fix import semantics, make gates machine-parsable and human-readable.

## Approach

7 cleanup components applied uniformly across all skills. No new files created — existing patterns updated in place. Changes are structural (how skills are written) not behavioral (what skills do).

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Persona + Announce | Merge into one step, no hardcoded text | Claude improvises from persona.md + SKILL.md description. Persona voice + role framing in one natural greeting. |
| @ import semantics | `@file` = always mandatory. Prose refs use `[name](path)` | Clean separation: standalone @ on own line = "read this now". Markdown links = "see also". No ambiguity. |
| Gate syntax | `## N. [GATE\|id]` + `### [GATE-OPTION\|mode] Label` | Greppable (`[GATE\|` finds gates, `[GATE-OPTION\|` finds options). Config-linkable (id maps to config.yaml). Human-readable (tags declare role, nesting declares relationship). |
| Task runner placement | First line in HARD-GATE block | `Read @_shared/task-runner.md. Parse and execute the phases below.` — ensures it's the first thing Claude sees. Skill constraints follow in same block. |
| Load Prior Decisions | Replaced by general L1 link-following | "Follow links in L1 files when relevant" is more flexible than a dedicated step scanning specific directories. Prior decisions, conventions, learnings all accessible through the same mechanism. |

### Claude's Discretion

- Research trigger wording (remove implicit human pause — exact phrasing)
- Context trigger wording (exact instruction text for "follow L1 links")
- Order of steps within 0-prime (as long as Announce is first)

## Components

### Component 1: SKILL.md Template Update

Every SKILL.md gets the new structure:

```markdown
---
name: <skill>
description: <description>
---

# /<skill>

One sentence overview.

<HARD-GATE>
Read @_shared/task-runner.md. Parse and execute the phases below.

<skill-specific constraints>
</HARD-GATE>

## Phases

0. [Prime](phases/0-prime.md) — <terse description>
1. [Execute](phases/1-execute.md) — <terse description>
2. [Validate](phases/2-validate.md) — <terse description>
3. [Checkpoint](phases/3-checkpoint.md) — <terse description>
```

- No trailing `@_shared/task-runner.md` at bottom
- Applies to: design, plan, implement, validate, release, status
- Beastmode is a router, different structure (skip)

### Component 2: Announce Skill Standardization

Every 0-prime gets a single step:

```markdown
## 1. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does and what the user's role is.

@../_shared/persona.md
```

- Delete "Role Clarity" step from design 0-prime
- Delete all hardcoded persona text from all phase files
- No other 0-prime has Role Clarity, so only design is affected

### Component 3: @ Import Audit

Rules:
- `@file` on its own line = mandatory import (read this now)
- `[name](path)` in prose = reference (consult if useful)
- Never use @ in flowing prose text

Known fixes:
- design 1-execute: `See @../_shared/worktree-manager.md for full reference` → `See [worktree-manager.md](../_shared/worktree-manager.md) for full reference`
- Any other prose-embedded @ references found during audit

Full audit required across all phase files in all skills.

### Component 4: Gate Syntax Migration

Old format:
```markdown
## 7. Gate: design.existing-design-choice

Read `.beastmode/config.yaml` → check `gates.design.existing-design-choice`.
Default: `human`. Execute ONLY the matching option below.
Remove non-matching options from the task list.

### 7.1 human — Ask User
...
### 7.2 auto — Claude Decides
...
```

New format:
```markdown
## 7. [GATE|design.existing-design-choice]

Read `.beastmode/config.yaml` → resolve mode for `design.existing-design-choice`.
Default: `human`.

### [GATE-OPTION|human] Ask User
...
### [GATE-OPTION|auto] Select All
...
```

Changes:
- Heading: `Gate: id` → `[GATE|id]`
- Sub-options: `N.M mode — Label` → `[GATE-OPTION|mode] Label`
- Drop numbered sub-options (7.1, 7.2)
- Keep 2-line preamble (config lookup + default)
- Drop "Execute ONLY the matching option below. Remove non-matching options from the task list." — task runner handles this mechanically now

Applies to all ~20 gates across:
- design phases (7 gates)
- plan phases (2 gates)
- implement phases (5 gates)
- validate phases (1 gate)
- release phases (3 gates)
- `_shared/retro.md` (4 gates)
- Checkpoint transition gates (4 gates)

### Component 5: Load Prior Decisions → Context Trigger

Remove the dedicated "Load Prior Decisions" step from design 0-prime (step 4).

Update "Load Project Context" step in all skill 0-primes to:

```markdown
## N. Load Project Context

Read (if they exist):
- `.beastmode/PRODUCT.md`
- `.beastmode/context/{PHASE}.md`
- `.beastmode/meta/{PHASE}.md`

Follow links in these L1 files to L2 details when relevant to the current topic.
Prior decisions, conventions, and learnings inform this phase — don't re-decide what's already been decided.
```

Applies to: design, plan, implement, validate, release 0-primes.

### Component 6: Research Trigger Fix

In design and plan 0-prime "Check Research Trigger" step:

Current step 4: "Summarize findings to user" (implicit pause)

New step 4: "Summarize findings to user and continue to next step"

No gate, no pause. Research informs the phase, it doesn't block it.

### Component 7: Task Runner Gate Detection Update

Update `_shared/task-runner.md` Execute Loop gate detection:

Old pattern:
```
IF task.content matches pattern "Gate: <gate-id>":
  ...
  Find child tasks (N.1, N.2, etc.) — each starts with a mode label (e.g., "human — ...", "auto — ...")
  Remove all children whose mode label does NOT match the resolved mode
```

New pattern:
```
IF task.content matches pattern "[GATE|<gate-id>]":
  ...
  Find child tasks — each has a [GATE-OPTION|mode] label
  Remove all children whose [GATE-OPTION|mode] does NOT match the resolved mode
```

Config lookup path unchanged: `gates.{id}` or `transitions.{id}`.

## Files Affected

**SKILL.md files** (6 files — template update + task runner placement):
- `skills/design/SKILL.md`
- `skills/plan/SKILL.md`
- `skills/implement/SKILL.md`
- `skills/validate/SKILL.md`
- `skills/release/SKILL.md`
- `skills/status/SKILL.md`

**0-prime files** (5 files — announce, context trigger, prior decisions, research trigger):
- `skills/design/phases/0-prime.md`
- `skills/plan/phases/0-prime.md`
- `skills/implement/phases/0-prime.md`
- `skills/validate/phases/0-prime.md`
- `skills/release/phases/0-prime.md`

**Gate-bearing phase files** (~12 files — gate syntax migration):
- `skills/design/phases/0-prime.md` (1 gate)
- `skills/design/phases/1-execute.md` (3 gates)
- `skills/design/phases/2-validate.md` (1 gate)
- `skills/design/phases/3-checkpoint.md` (1 gate)
- `skills/plan/phases/2-validate.md` (1 gate)
- `skills/plan/phases/3-checkpoint.md` (1 gate)
- `skills/implement/phases/1-execute.md` (2 gates)
- `skills/implement/phases/2-validate.md` (1 gate)
- `skills/implement/phases/3-checkpoint.md` (1 gate)
- `skills/validate/phases/3-checkpoint.md` (1 gate)
- `skills/release/phases/1-execute.md` (2 gates)
- `skills/release/phases/3-checkpoint.md` (0 gates — just transition suggestion)

**Shared files** (2 files):
- `skills/_shared/task-runner.md` (gate detection pattern update)
- `skills/_shared/retro.md` (4 gates + gate syntax migration)

**Documentation** (1 file):
- `.beastmode/context/plan/conventions.md` (@ import rules, gate syntax, skill manifest pattern)

**Total: ~25 files**

## Acceptance Criteria

- [ ] Every SKILL.md has task runner as first line in HARD-GATE
- [ ] No trailing `@_shared/task-runner.md` at bottom of any SKILL.md
- [ ] Every 0-prime has exactly one "Announce Skill" step with `@../_shared/persona.md`
- [ ] No hardcoded persona text in any phase file
- [ ] No "Role Clarity" step exists anywhere
- [ ] All prose @ references converted to `[name](path)` markdown links
- [ ] All standalone `@file` imports are genuinely mandatory reads
- [ ] `grep -rn "\[GATE|" skills/` returns all gates
- [ ] `grep -rn "\[GATE-OPTION|" skills/` returns all gate options
- [ ] No `Gate:` old-format headings remain in any phase file
- [ ] Task runner gate detection updated to match `[GATE|` prefix
- [ ] "Load Prior Decisions" step removed from design 0-prime
- [ ] "Load Project Context" step includes L1 link-following instruction in all 0-primes
- [ ] Research trigger has no implicit human pause
- [ ] conventions.md updated with new @ import rules, gate syntax, skill manifest pattern

## Testing Strategy

```bash
# Verify all gates use new syntax
grep -rn "\[GATE|" skills/           # Should find all gate declarations
grep -rn "\[GATE-OPTION|" skills/    # Should find all gate options
grep -rn "Gate:" skills/             # Should return 0 (old format gone)

# Verify @ imports are clean
grep -rn "^@" skills/                # All mandatory imports (standalone @ on own line)
grep -rn "See @\|with @" skills/     # Should return 0 (no prose @ references)

# Verify task runner placement
grep -rn "task-runner.md" skills/*/SKILL.md  # Should find in HARD-GATE block
grep -A1 "HARD-GATE" skills/*/SKILL.md       # First line should reference task-runner

# Verify no Role Clarity
grep -rn "Role Clarity" skills/      # Should return 0

# Verify announce step
grep -rn "Announce Skill" skills/*/phases/0-prime.md  # Should find in every 0-prime
```

## Deferred Ideas

- ~~**Retro agents create new L2 clusters dynamically**: When retro finds patterns that don't fit in existing L2 files, it should be able to propose and create new L2 files + wire them into L1 @imports. Deferred to the existing dynamic-retro-walkers design.~~ (implemented: 2026-03-08)
