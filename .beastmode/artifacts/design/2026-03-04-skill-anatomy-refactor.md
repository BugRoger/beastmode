# Skill Anatomy Refactor

## Why

Align phased skills with VISION.md's canonical phase anatomy: `prime → execute → validate → checkpoint`. Currently each skill has custom sub-phases; standardizing enables:
- Predictable structure across all workflow phases
- Easier onboarding (same pattern everywhere)
- Clear separation of concerns (load → do → check → save)
- Standalone utilities (/prime, /research, /retro) absorbed into every phase

---

## Approach

**Keep both layers, align structure:**
- `commands/*.md` — Interface definitions (Reads/Writes/Flow)
- `skills/{phase}/phases/` — Implementation with standardized sub-phases

**Standard anatomy for all phased skills (0-indexed):**
```
phases/0-prime.md      # Load context, conditional research (/prime + /research absorbed)
phases/1-execute.md    # Do the actual work
phases/2-validate.md   # Check work, approval gates
phases/3-checkpoint.md # Save artifacts, capture learnings (/retro absorbed)
```

---

## Absorbed Standalone Skills

| Skill | Absorbed Into | Functionality |
|-------|---------------|---------------|
| `/prime` | 0-prime | Load project context at start of every phase |
| `/research` | 0-prime | Conditional research via keyword/complexity triggers |
| `/retro` | 3-checkpoint | Capture learnings, update meta files |

**Deprecated skills (to be removed):**
- `skills/prime/` — Replaced by shared 0-prime behavior
- `skills/research/` — Folded into 0-prime
- `skills/retro/` — Folded into 3-checkpoint

**Remaining standalone utilities:**
- `skills/bootstrap/` — Project initialization (not a workflow phase)
- `skills/bootstrap-discovery/` — Codebase analysis (not a workflow phase)
- `skills/bootstrap-wizard/` — Interactive setup (not a workflow phase)
- `skills/status/` — Display current state (not a workflow phase)

---

## Mapping

### /design

| Current | New | Content |
|---------|-----|---------|
| 0-research.md | → 0-prime.md | Fold research trigger + spawning into prime |
| 1-explore.md | → 0-prime.md | Merge context loading, clarifying questions |
| 2-design.md | → 1-execute.md | Propose approaches, iterate on design |
| *(none)* | → 2-validate.md | Completeness check + user approval |
| 3-document.md | → 3-checkpoint.md | Write doc, update status, capture learnings, suggest /plan |

### /plan

| Current | New | Content |
|---------|-----|---------|
| 0-research.md | → 0-prime.md | Fold research trigger into prime |
| 1-prepare.md | → 0-prime.md | Load design doc, understand scope |
| 2-write.md | → 1-execute.md | Break into tasks, write plan |
| *(none)* | → 2-validate.md | Completeness check + user approval |
| 3-handoff.md | → 3-checkpoint.md | Save plan, capture learnings, suggest /implement |

### /implement

| Current | New | Content |
|---------|-----|---------|
| 1-setup.md | → 0-prime.md | Load plan, verify worktree |
| 2-prepare.md | → 0-prime.md | Install deps, understand tasks |
| 3-execute.md | → 1-execute.md | Execute tasks, write code |
| *(none)* | → 2-validate.md | Tests pass? Build works? |
| 4-complete.md | → 3-checkpoint.md | Update status, capture learnings, suggest /validate |

### /validate

| Current | New | Content |
|---------|-----|---------|
| 1-prime.md | → 0-prime.md | Renumber to 0-indexed |
| 2-execute.md | → 1-execute.md | Renumber |
| 3-validate.md | → 2-validate.md | Renumber |
| 4-checkpoint.md | → 3-checkpoint.md | Renumber, add retro functionality |

### /release

| Current | New | Content |
|---------|-----|---------|
| 1-analyze.md | → 0-prime.md | Load artifacts, analyze changes |
| 2-generate.md | → 1-execute.md | Generate changelog, create commit |
| *(none)* | → 2-validate.md | Clean merge? Changelog complete? |
| 3-publish.md | → 3-checkpoint.md | Merge to main, cleanup worktree, final retro |

---

## 2-validate Patterns

Each skill's validate sub-phase checks different things:

| Skill | Validate Checks |
|-------|-----------------|
| design | Completeness (all sections?) → User approval |
| plan | Completeness (tasks defined?) → User approval |
| implement | Tests pass? Build works? |
| validate | All gates pass (tests, lint, types) |
| release | Clean merge? Changelog complete? |

---

## 3-checkpoint Patterns

Each skill's checkpoint sub-phase captures learnings (retro functionality):

| Skill | Checkpoint Actions |
|-------|-------------------|
| design | Write doc, update status, capture design decisions to meta |
| plan | Save plan, capture planning insights to meta |
| implement | Update status, capture implementation learnings |
| validate | Record test results, capture quality insights |
| release | Final merge, comprehensive retro, cleanup worktree |

---

## Files Affected

**Rewritten (4 files each):**
- `skills/design/phases/` — 0-prime, 1-execute, 2-validate, 3-checkpoint
- `skills/plan/phases/` — 0-prime, 1-execute, 2-validate, 3-checkpoint
- `skills/implement/phases/` — 0-prime, 1-execute, 2-validate, 3-checkpoint
- `skills/validate/phases/` — 0-prime, 1-execute, 2-validate, 3-checkpoint (renumber + add retro)
- `skills/release/phases/` — 0-prime, 1-execute, 2-validate, 3-checkpoint

**Updated:**
- `skills/design/SKILL.md` — New phase references
- `skills/plan/SKILL.md` — New phase references
- `skills/implement/SKILL.md` — New phase references
- `skills/validate/SKILL.md` — New phase references
- `skills/release/SKILL.md` — New phase references

**Deleted (old phase files):**
- `skills/design/phases/0-research.md`
- `skills/design/phases/1-explore.md`
- `skills/design/phases/2-design.md`
- `skills/design/phases/3-document.md`
- `skills/plan/phases/0-research.md`
- `skills/plan/phases/1-prepare.md`
- `skills/plan/phases/2-write.md`
- `skills/plan/phases/3-handoff.md`
- `skills/implement/phases/1-setup.md`
- `skills/implement/phases/2-prepare.md`
- `skills/implement/phases/3-execute.md`
- `skills/implement/phases/4-complete.md`
- `skills/validate/phases/1-prime.md`
- `skills/validate/phases/2-execute.md`
- `skills/validate/phases/3-validate.md`
- `skills/validate/phases/4-checkpoint.md`
- `skills/release/phases/1-analyze.md`
- `skills/release/phases/2-generate.md`
- `skills/release/phases/3-publish.md`

**Deleted (deprecated skills):**
- `skills/prime/` — Entire directory
- `skills/research/` — Entire directory
- `skills/retro/` — Entire directory

**Updated (documentation):**
- `commands/design.md` — Document standard anatomy
- `commands/plan.md` — Document standard anatomy
- `commands/implement.md` — Document standard anatomy
- `commands/validate.md` — Document standard anatomy
- `commands/release.md` — Document standard anatomy

---

## Decisions

| Decision | Rationale |
|----------|-----------|
| 0-indexed sub-phases | Matches programming convention; 0-prime reads naturally |
| Fold /prime into 0-prime | Every phase needs context loading; DRY |
| Fold /research into 0-prime | Research is "loading" external context; belongs in prime |
| Fold /retro into 3-checkpoint | Learnings captured after every phase, not just end |
| Add 2-validate to all phases | Explicit checkpoint before saving work |
| User approval in design/plan validate | Interactive phases need human gate |
| Test check in implement validate | Automated verification before release |
| Keep bootstrap/status standalone | Not workflow phases; initialization/utility |

---

## Next

`/plan` to create implementation tasks.
