# Fix Auto-Transitions via Explicit Skill Tool Calls

## Goal

Make auto-transitions between skills actually work by instructing Claude to call the `Skill` tool with the fully-qualified skill name when the transition gate is set to `auto`.

## Approach

Update `transition-check.md` to explicitly instruct Claude to invoke the next skill using `Skill(skill="beastmode:<next>", args="<artifact>")`. Each checkpoint's "Phase Transition" section already has the next skill and artifact info — the transition-check just needs to use them correctly. Drop the `/compact` reference (can't be called programmatically). Update implement and validate checkpoints to pass the feature slug.

## Key Decisions

### Locked Decisions

- **Direct Skill tool call** — When auto mode, Claude calls `Skill(skill="beastmode:<next-skill>", args="<artifact-path>")`. Follows Superpowers' proven pattern (researched from github.com/pcvelz/superpowers).
- **Drop `/compact` reference** — `/compact` is a built-in CLI command and can't be reliably invoked programmatically. Remove from transition-check. Trust Claude Code's built-in context compression.
- **Keep context threshold check** — Still estimate context remaining and bail out with session-restart instructions when below threshold.
- **Fully-qualified skill names** — Use `beastmode:plan`, `beastmode:implement`, `beastmode:validate`, `beastmode:release` (plugin namespace prefix required for Skill tool).
- **All transitions pass feature slug** — Every transition passes `YYYY-MM-DD-<feature>.md` as artifact argument, including implement→validate and validate→release.

### Claude's Discretion

- How to estimate context remaining (heuristic is fine)
- Exact wording of the session-restart message

## Component Breakdown

### 1. `skills/_shared/transition-check.md` — Rewrite auto mode

- Remove `/compact` step
- Add explicit `Skill` tool call instruction with `skill` and `args` parameters
- Keep context threshold check with bailout
- Update phase-to-skill mapping table with fully-qualified names and artifact paths

### 2. `skills/implement/phases/3-checkpoint.md` — Add feature slug

- Change `Next skill: /validate` to `Next skill: beastmode:validate YYYY-MM-DD-<feature>.md`

### 3. `skills/validate/phases/3-checkpoint.md` — Add feature slug

- Change `Next skill: /release` to `Next skill: beastmode:release YYYY-MM-DD-<feature>.md`

## Files Affected

| File | Change |
|------|--------|
| `skills/_shared/transition-check.md` | REWRITE auto mode: Skill tool call, drop /compact |
| `skills/implement/phases/3-checkpoint.md` | UPDATE: Pass feature slug as artifact |
| `skills/validate/phases/3-checkpoint.md` | UPDATE: Pass feature slug as artifact |

## Phase-to-Skill Mapping

| Transition | Skill Tool Call | Artifact |
|---|---|---|
| design-to-plan | `beastmode:plan` | `.beastmode/state/design/YYYY-MM-DD-<feature>.md` |
| plan-to-implement | `beastmode:implement` | `.beastmode/state/plan/YYYY-MM-DD-<feature>.md` |
| implement-to-validate | `beastmode:validate` | `YYYY-MM-DD-<feature>.md` |
| validate-to-release | `beastmode:release` | `YYYY-MM-DD-<feature>.md` |

## Acceptance Criteria

- [ ] All 4 transitions pass the feature artifact slug (YYYY-MM-DD-feature.md) as args
- [ ] With all transitions `auto`, completing /design chains through /plan via Skill tool call
- [ ] With all transitions `auto`, completing /plan chains through /implement via Skill tool call
- [ ] With all transitions `auto`, completing /implement chains through /validate via Skill tool call
- [ ] With all transitions `auto`, completing /validate chains through /release via Skill tool call
- [ ] When context is below threshold, prints session-restart instructions with correct artifact path
- [ ] When transition is `human`, prints next step with artifact path and stops (existing behavior preserved)
- [ ] No references to `/compact` remain in transition-check.md

## Testing Strategy

- Run `/design` with all transitions set to `auto` — verify it chains through to `/plan`
- Set `context_threshold: 99` to force the bailout path — verify session-restart message appears
- Verify `grep -r "compact" skills/_shared/transition-check.md` returns nothing

## Deferred Ideas

- None — this is a focused fix
