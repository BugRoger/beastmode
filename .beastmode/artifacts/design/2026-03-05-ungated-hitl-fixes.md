# Design: Ungated HITL Fixes

**Date:** 2026-03-05
**Feature:** `feature/ungated-hitl-fixes`

## Goal

Fix the ungated human interactions that block fully autonomous feature cycles (design → plan → implement → validate → release). Five interactions were identified; three are actionable, two are intentional by design.

## Approach

Three changes:

1. **Retro gate rewrite** — Convert retro.md's old `<!-- HITL-GATE -->` HTML comments and `@gate-check.md` imports to 4 proper `## N. Gate:` steps with per-category config keys
2. **Merge strategy gate** — Add a configurable gate to release step 10 with a separate config key for the default action
3. **Config updates** — 5 new gate entries (4 retro + 1 merge) and 1 new `release.merge-default` key

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Retro gate structure | 4 separate `Gate:` steps (learnings, sops, overrides, context-changes) | Full gate pattern per category, consistent with hitl-adherence. Task runner handles each independently. |
| Retro config | Per-category keys under `gates.retro`, no master switch | Each category has different risk profiles (learnings = safe to auto, SOPs = need review). Per-key gives fine-grained control. |
| Merge strategy config | Separate mode key (`gates.release.merge-strategy`) + default key (`release.merge-default`) | Clean separation of "should I ask?" from "what should auto pick?" |
| Merge auto options | `local` (default), `pr`, `keep`, `discard` | Matches the 4 existing worktree-manager options. Local is the common solo-dev case. |
| Worktree disambiguation | Keep as-is — not a gate | Safety mechanism for ambiguity, not approval. Auto transitions pass state file paths, resolving to a single worktree. |
| Deviation-rules.md Tier 3 | Keep as-is — two-step by design | Agent returns ARCHITECTURAL_STOP, controller routes through `implement.architectural-deviation` gate. Not a conflict. |
| Worktree-manager.md demotion | Add "Reference Only" header to Merge Options section | Same demotion pattern as gate-check.md — keeps documentation, removes execution authority. |

### Claude's Discretion

- Exact step renumbering in retro.md (gates inserted at step 5-8, bottom-up bubble becomes step 9)
- Human-mode prompt wording for retro category approvals
- Whether worktree-manager.md Merge Options section needs content edits beyond the "Reference Only" header

## Components

### 1. Retro Gate Rewrite (`skills/_shared/retro.md`)

Replace section 5 "Apply Changes" (5.1-5.4) with 4 `Gate:` steps:

```markdown
## 5. Gate: retro.learnings

Read `.beastmode/config.yaml` → check `gates.retro.learnings`.
Default: `human`. Execute ONLY the matching option below.

### 5.1 human — Review Learnings

Show learnings to user, then auto-append to `.beastmode/meta/{phase}/learnings.md` under the appropriate date-headed section.

### 5.2 auto — Auto-Append

Auto-append learnings silently.
Log: "Gate `retro.learnings` → auto: appended {N} learnings"

## 6. Gate: retro.sops

Read `.beastmode/config.yaml` → check `gates.retro.sops`.
Default: `human`. Execute ONLY the matching option below.

### 6.1 human — Review SOPs

Present each proposed SOP (including auto-promoted ones) and ask for approval before writing to `.beastmode/meta/{phase}/sops.md`.
On approval of auto-promoted SOPs: annotate source learnings with `→ promoted to SOP`.

### 6.2 auto — Auto-Write SOPs

Auto-write all proposed SOPs.
Log: "Gate `retro.sops` → auto: wrote {N} SOPs"

## 7. Gate: retro.overrides

Read `.beastmode/config.yaml` → check `gates.retro.overrides`.
Default: `human`. Execute ONLY the matching option below.

### 7.1 human — Review Overrides

Present each proposed override and ask for approval before writing to `.beastmode/meta/{phase}/overrides.md`.

### 7.2 auto — Auto-Write Overrides

Auto-write all proposed overrides.
Log: "Gate `retro.overrides` → auto: wrote {N} overrides"

## 8. Gate: retro.context-changes

Read `.beastmode/config.yaml` → check `gates.retro.context-changes`.
Default: `human`. Execute ONLY the matching option below.

### 8.1 human — Review Context Changes

Present each proposed edit with confidence annotations.
Ask per-category: "Apply these context changes? [Y/n]"

### 8.2 auto — Auto-Apply Context Changes

Apply all context changes silently.
Log: "Gate `retro.context-changes` → auto: applied {N} context changes"
```

Remove:
- All `<!-- HITL-GATE: ... -->` HTML comments
- All `@gate-check.md` imports

Renumber existing step 6 "Bottom-Up Summary Bubble" to step 9.

### 2. Merge Strategy Gate (`skills/release/phases/1-execute.md`)

Convert step 10 "Merge and Cleanup" from `@../_shared/worktree-manager.md#Merge Options` to a proper gate:

```markdown
## 10. Gate: release.merge-strategy

Read `.beastmode/config.yaml` → check `gates.release.merge-strategy`.
Default: `human`. Execute ONLY the matching option below.

### 10.1 human — Ask User

Present merge options via AskUserQuestion:
- Merge locally (Recommended)
- Push and create PR
- Keep as-is
- Discard

Execute chosen option per worktree-manager.md reference.

### 10.2 auto — Execute Configured Default

Read `release.merge-default` from config.yaml (default: `local`).
Execute the matching option:
- `local`: Merge to main, delete worktree and branch
- `pr`: Push branch, create PR, keep worktree
- `keep`: Print manual merge commands
- `discard`: Force delete worktree and branch

Log: "Gate `release.merge-strategy` → auto: {action}"
```

### 3. Worktree-Manager Demotion (`skills/_shared/worktree-manager.md`)

Add "Reference Only" header to "Merge Options" section:

```markdown
## Merge Options (Reference Only)

> This section is reference documentation. The active merge gate is in `release/phases/1-execute.md` step 10.
```

### 4. Config Updates (`.beastmode/config.yaml`)

```yaml
gates:
  retro:
    learnings: human            # INTERACTIVE — show then auto-append
    sops: human                 # APPROVAL — require approval
    overrides: human            # APPROVAL — require approval
    context-changes: human      # APPROVAL — require approval
  release:
    merge-strategy: human       # APPROVAL — merge/PR/keep/discard

release:
  merge-default: local          # local | pr | keep | discard
```

## Gate Inventory (Updated)

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
| 16 | `retro.learnings` | _shared/retro.md | INTERACTIVE | human |
| 17 | `retro.sops` | _shared/retro.md | APPROVAL | human |
| 18 | `retro.overrides` | _shared/retro.md | APPROVAL | human |
| 19 | `retro.context-changes` | _shared/retro.md | APPROVAL | human |
| 20 | `release.merge-strategy` | release/1-execute | APPROVAL | human |

## Files Affected

| File | Change |
|------|--------|
| `skills/_shared/retro.md` | REWRITE section 5: replace 5.1-5.4 with 4 Gate steps, renumber step 6→9 |
| `skills/release/phases/1-execute.md` | CONVERT step 10 to Gate step with human/auto substeps |
| `skills/_shared/worktree-manager.md` | DEMOTE "Merge Options" to reference-only |
| `.beastmode/config.yaml` | ADD 5 gate entries (4 retro + 1 merge) + `release.merge-default: local` |

## Acceptance Criteria

- [ ] `grep -r "HITL-GATE" skills/` returns zero results
- [ ] `grep -r "@gate-check.md" skills/_shared/retro.md` returns zero results
- [ ] retro.md has 4 `Gate:` steps (retro.learnings, retro.sops, retro.overrides, retro.context-changes)
- [ ] Each retro gate has human/auto substeps
- [ ] release 1-execute step 10 is a `Gate: release.merge-strategy` step with human/auto substeps
- [ ] config.yaml has 5 new gate entries and `release.merge-default: local`
- [ ] With all retro gates set to `auto`, retro applies all findings silently
- [ ] With `release.merge-strategy: auto` and `release.merge-default: local`, release merges locally without asking
- [ ] worktree-manager.md "Merge Options" section has "Reference Only" header
- [ ] Total gate count: 20

## Testing Strategy

- Set all retro gates to `auto` → run a phase → verify retro applies silently
- Set all retro gates to `human` → run a phase → verify per-category prompts fire
- Set `release.merge-strategy: auto` + `release.merge-default: local` → run /release → verify auto-merge
- Set `release.merge-strategy: auto` + `release.merge-default: pr` → run /release → verify PR creation
- `grep -c "Gate:" skills/_shared/retro.md` → verify 4 gate steps
- `grep -c "Gate:" skills/release/phases/1-execute.md` → verify gate count increased by 1
- Verify task runner processes retro gates during checkpoint expansion

## Deferred Ideas

- Gate presets (`--yolo` = all auto, `--careful` = all human) — from hitl-adherence deferred list
- Retro master switch (gates.retro.apply-changes) that bypasses all per-category keys
- Per-feature gate overrides
