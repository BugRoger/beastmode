# Design: HITL Adherence Improvement

**Date:** 2026-03-05
**Feature:** `feature/hitl-adherence`

## Goal

Make HITL gates actually work — both intra-phase gates (approvals, interactive choices) and inter-phase transitions (auto-chaining between skills). The current mechanism uses invisible HTML comments and @imported files that Claude routinely skips.

## Approach

Three changes that work together:

1. **Replace invisible `<!-- HITL-GATE -->` comments with explicit `## N. Gate: <id>` steps** in all phase files. Each gate becomes a numbered step that the task runner processes, with mode-specific substeps (human/auto) that get dynamically pruned based on config.

2. **Extend the task runner** with gate step detection — when it encounters a `Gate:` step, it reads config.yaml, resolves the mode, removes non-matching substeps, and executes the survivor.

3. **Keep `<HARD-GATE>` unchanged** for unconditional constraints. Keep `gate-check.md` and `transition-check.md` as documentation/reference (no longer in the execution path — the task runner handles it).

## Key Decisions

### Locked Decisions

- **Two-tier gate system**: `<HARD-GATE>` for unconditional constraints (unchanged, works well). `## N. Gate:` steps for configurable gates (new, replaces broken HITL-GATE mechanism).
- **Gates are task-runner steps**: Each gate is a numbered `## N. Gate: <id>` heading with `### N.1 human` and `### N.2 auto` substeps. The task runner detects gates by title pattern, reads config, prunes non-matching options, executes the survivor.
- **Read config at each gate**: Each gate reads `.beastmode/config.yaml` on demand. No pre-loading in prime. Self-contained gates that don't depend on earlier steps.
- **Imperative language**: Gate instructions use direct commands ("Read config.yaml. Check gates.design.approval.") not declarative descriptions ("This gate checks config...").
- **Shared files become reference-only**: `gate-check.md` and `transition-check.md` demoted from execution path to documentation. All `@import` references to these files removed from phase files.
- **Remove conflicting HARD-GATEs**: The `<HARD-GATE>User must explicitly approve</HARD-GATE>` blocks on approval gates (design, plan) conflict with auto mode. Remove them — the gate step handles both modes.
- **Unified gate format**: All 14 gates (10 intra-phase + 4 transitions) use the same `## N. Gate: <id>` format with substep options. No special-casing for different gate categories.

### Claude's Discretion

- Exact step renumbering in each phase file (gates may shift existing step numbers)
- Final content of demoted gate-check.md / transition-check.md reference files
- Whether to keep or remove the `<!-- HITL-GATE -->` HTML comments alongside new gate steps (recommend remove for clarity)

## Components

### 1. Task Runner Gate Detection (`skills/_shared/task-runner.md`)

Add gate step detection logic:

```markdown
## Gate Step Detection

When a task title matches `Gate: <gate-id>`:
1. Read `.beastmode/config.yaml`
2. Look up the gate ID (supports both `gates.<phase>.<name>` and `transitions.<name>`)
3. Resolve mode: config value or `human` if missing
4. Find child tasks matching `N.X <mode> — ...`
5. Remove all children that DON'T match the resolved mode
6. Set the matching child to `in_progress`
7. Continue normal execution loop
```

### 2. Gate Step Format (applied to all 14 gates)

Standard format for intra-phase gates:
```markdown
## N. Gate: <phase>.<gate-name>

Read `.beastmode/config.yaml` → check `gates.<phase>.<gate-name>`.
Default: `human`. Execute ONLY the matching option below.
Remove non-matching options from the task list.

### N.1 human — <Description>

[Human-mode behavior: AskUserQuestion, approval prompt, etc.]

### N.2 auto — <Description>

[Auto-mode behavior: self-approve, make choice, log decision]
Log: "Gate `<id>` → auto: <decision>"
```

Standard format for transition gates:
```markdown
## N. Gate: transitions.<from>-to-<to>

Read `.beastmode/config.yaml` → check `transitions.<from>-to-<to>`.
Default: `human`. Execute ONLY the matching option below.
Remove non-matching options from the task list.

### N.1 human — Suggest Next Step

Print and STOP:
Next step: `/beastmode:<next-skill> <artifact-path>`

### N.2 auto — Chain to Next Phase

Estimate context remaining. If >= threshold (default 60%):
Call `Skill(skill="beastmode:<next-skill>", args="<artifact-path>")`
If below threshold, print session-restart instructions and STOP.
```

### 3. Phase File Updates (14 gates across 12 files)

| File | Gates to Convert |
|------|-----------------|
| `skills/design/phases/0-prime.md` | `design.existing-design-choice` (INTERACTIVE) |
| `skills/design/phases/1-execute.md` | `design.gray-area-selection` (INTERACTIVE), `design.gray-area-discussion` (INTERACTIVE), `design.section-review` (INTERACTIVE) |
| `skills/design/phases/2-validate.md` | `design.design-approval` (APPROVAL) — also remove conflicting HARD-GATE |
| `skills/design/phases/3-checkpoint.md` | `transitions.design-to-plan` (TRANSITION) |
| `skills/plan/phases/2-validate.md` | `plan.plan-approval` (APPROVAL) — also remove conflicting HARD-GATE |
| `skills/plan/phases/3-checkpoint.md` | `transitions.plan-to-implement` (TRANSITION) |
| `skills/implement/phases/1-execute.md` | `implement.architectural-deviation` (CONDITIONAL), `implement.blocked-task-decision` (CONDITIONAL) |
| `skills/implement/phases/2-validate.md` | `implement.validation-failure` (CONDITIONAL) |
| `skills/implement/phases/3-checkpoint.md` | `transitions.implement-to-validate` (TRANSITION) |
| `skills/validate/phases/3-checkpoint.md` | `transitions.validate-to-release` (TRANSITION) |
| `skills/release/phases/1-execute.md` | `release.version-confirmation` (APPROVAL), `release.product-md-approval` (CONDITIONAL) |

### 4. Shared File Demotion

- `skills/_shared/gate-check.md` — Add "Reference only" header, keep behavior documentation
- `skills/_shared/transition-check.md` — Add "Reference only" header, keep phase-to-skill mapping
- Remove all `@../_shared/gate-check.md` imports from phase files
- Remove all `@../_shared/transition-check.md` imports from phase files

## Gate Inventory

| # | ID | File | Category | Default |
|---|-----|------|----------|---------|
| 1 | `design.existing-design-choice` | design/0-prime | INTERACTIVE | human |
| 2 | `design.gray-area-selection` | design/1-execute | INTERACTIVE | human |
| 3 | `design.gray-area-discussion` | design/1-execute | INTERACTIVE | human |
| 4 | `design.section-review` | design/1-execute | INTERACTIVE | human |
| 5 | `design.design-approval` | design/2-validate | APPROVAL | human |
| 6 | `plan.plan-approval` | plan/2-validate | APPROVAL | human |
| 7 | `implement.architectural-deviation` | implement/1-execute | CONDITIONAL | auto |
| 8 | `implement.blocked-task-decision` | implement/1-execute | CONDITIONAL | auto |
| 9 | `implement.validation-failure` | implement/2-validate | CONDITIONAL | auto |
| 10 | `release.version-confirmation` | release/1-execute | APPROVAL | human |
| 11 | `release.product-md-approval` | release/1-execute | CONDITIONAL | auto |
| 12 | `transitions.design-to-plan` | design/3-checkpoint | TRANSITION | human |
| 13 | `transitions.plan-to-implement` | plan/3-checkpoint | TRANSITION | human |
| 14 | `transitions.implement-to-validate` | implement/3-checkpoint | TRANSITION | auto |
| 15 | `transitions.validate-to-release` | validate/3-checkpoint | TRANSITION | human |

## Files Affected

| File | Change |
|------|--------|
| `skills/_shared/task-runner.md` | ADD gate step detection logic |
| `skills/design/phases/0-prime.md` | CONVERT 1 gate to numbered step, REMOVE @import |
| `skills/design/phases/1-execute.md` | CONVERT 3 gates to numbered steps, REMOVE @imports |
| `skills/design/phases/2-validate.md` | CONVERT 1 gate, REMOVE conflicting HARD-GATE, REMOVE @import |
| `skills/design/phases/3-checkpoint.md` | CONVERT 1 transition to numbered step, REMOVE @import |
| `skills/plan/phases/2-validate.md` | CONVERT 1 gate, REMOVE conflicting HARD-GATE, REMOVE @import |
| `skills/plan/phases/3-checkpoint.md` | CONVERT 1 transition to numbered step, REMOVE @import |
| `skills/implement/phases/1-execute.md` | CONVERT 2 gates to numbered steps, REMOVE @imports |
| `skills/implement/phases/2-validate.md` | CONVERT 1 gate to numbered step, REMOVE @import |
| `skills/implement/phases/3-checkpoint.md` | CONVERT 1 transition to numbered step, REMOVE @import |
| `skills/validate/phases/3-checkpoint.md` | CONVERT 1 transition to numbered step, REMOVE @import |
| `skills/release/phases/1-execute.md` | CONVERT 2 gates to numbered steps, REMOVE @imports |
| `skills/_shared/gate-check.md` | DEMOTE to reference-only |
| `skills/_shared/transition-check.md` | DEMOTE to reference-only |

## Acceptance Criteria

- [ ] `grep -r "HITL-GATE" skills/` returns zero results (all HTML comments removed)
- [ ] `grep -r "## [0-9]*\. Gate:" skills/` returns all 15 gates (11 intra-phase + 4 transitions)
- [ ] Each gate step has exactly 2 substeps: one for `human`, one for `auto`
- [ ] Task runner `task-runner.md` contains gate step detection logic
- [ ] With all gates set to `auto` in config.yaml, /design chains through /plan via Skill tool call
- [ ] With default config (all `human`), existing interactive behavior is preserved
- [ ] No `<HARD-GATE>` blocks conflict with configurable gates
- [ ] `gate-check.md` and `transition-check.md` marked as reference-only
- [ ] All `@../_shared/gate-check.md` imports removed from phase files
- [ ] All `@../_shared/transition-check.md` imports removed from phase files
- [ ] Gate steps use imperative language ("Read config.yaml. Check...")

## Testing Strategy

- Set all gates to `auto` → run `/design` → verify auto-approves and chains to `/plan`
- Set all gates to `human` → run `/design` → verify all interactive gates fire
- Remove `config.yaml` → verify fallback to `human` on all gates
- `grep -c "Gate:" skills/*/phases/*.md` → verify 15 gate steps total
- Verify task runner todo list shows gate pruning (only surviving option visible)

## Deferred Ideas

- Gate presets (`--yolo` = all auto, `--careful` = all human)
- Per-feature gate overrides
- Gate metrics/logging (how often auto vs human fires)
- A `review` mode between `human` and `auto` — Claude proposes, user confirms with Y/n
