# Ungated HITL Fixes Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Fix ungated human interactions blocking fully autonomous feature cycles.

**Architecture:** Convert retro.md's old HTML-comment gates to 4 proper Gate: steps with per-category config, add a merge strategy gate to release with configurable default action, update config.yaml with 5 new gates + 1 config key, and demote worktree-manager.md Merge Options to reference-only.

**Tech Stack:** Markdown, YAML

**Design Doc:** `.beastmode/state/design/2026-03-05-ungated-hitl-fixes.md`

---

### Task 0: Update config.yaml with new gates and release config

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `.beastmode/config.yaml`

**Step 1: Add retro gates, merge-strategy gate, and release config**

Replace the entire content of `.beastmode/config.yaml` with:

```yaml
# .beastmode/config.yaml
# Gate modes: human (stop for user) | auto (Claude decides)

gates:
  design:
    existing-design-choice: human    # INTERACTIVE — prior design found, ask what to do
    gray-area-selection: human       # INTERACTIVE — which areas to discuss
    gray-area-discussion: human      # INTERACTIVE — question loop per area
    section-review: human            # INTERACTIVE — section-by-section review
    design-approval: human           # APPROVAL — approve before documenting

  plan:
    plan-approval: auto              # APPROVAL — approve before saving

  implement:
    architectural-deviation: auto    # CONDITIONAL — tier 3 deviation decision
    blocked-task-decision: auto      # CONDITIONAL — blocked task with dependents
    validation-failure: auto         # CONDITIONAL — fix loop exhausted

  release:
    version-confirmation: human      # APPROVAL — version bump override
    merge-strategy: human            # APPROVAL — merge/PR/keep/discard

  retro:
    learnings: human                 # INTERACTIVE — show then auto-append
    sops: human                      # APPROVAL — require approval
    overrides: human                 # APPROVAL — require approval
    context-changes: human           # APPROVAL — require approval

transitions:
  design-to-plan: auto               # TRANSITION
  plan-to-implement: auto            # TRANSITION
  implement-to-validate: auto        # TRANSITION
  validate-to-release: auto          # TRANSITION

  context_threshold: 60              # % remaining context required to auto-advance

release:
  merge-default: local               # local | pr | keep | discard
```

**Step 2: Verify**

Run: `grep -c "retro:" .beastmode/config.yaml`
Expected: 1

Run: `grep "merge-default" .beastmode/config.yaml`
Expected: `  merge-default: local`

---

### Task 1: Rewrite retro.md section 5 with 4 Gate steps

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `skills/_shared/retro.md:64-115`

**Step 1: Replace section 5 "Apply Changes" and section 6 "Bottom-Up Summary Bubble"**

Replace lines 64-115 of `skills/_shared/retro.md` (from `## 5. Apply Changes` through end of file) with:

```markdown
## 5. Gate: retro.learnings

Read `.beastmode/config.yaml` → check `gates.retro.learnings`.
Default: `human`. Execute ONLY the matching option below.
Remove non-matching options from the task list.

### 5.1 human — Review Learnings

Show learnings to user, then auto-append to `.beastmode/meta/{phase}/learnings.md` under the appropriate date-headed section.

### 5.2 auto — Auto-Append Learnings

Auto-append learnings silently.
Log: "Gate `retro.learnings` → auto: appended {N} learnings"

## 6. Gate: retro.sops

Read `.beastmode/config.yaml` → check `gates.retro.sops`.
Default: `human`. Execute ONLY the matching option below.
Remove non-matching options from the task list.

### 6.1 human — Review SOPs

Present each proposed SOP (including auto-promoted ones) and ask for approval before writing to `.beastmode/meta/{phase}/sops.md`.
On approval of auto-promoted SOPs: annotate source learning entries in `learnings.md` with `→ promoted to SOP`.

### 6.2 auto — Auto-Write SOPs

Auto-write all proposed SOPs.
On auto-promoted SOPs: annotate source learning entries in `learnings.md` with `→ promoted to SOP`.
Log: "Gate `retro.sops` → auto: wrote {N} SOPs"

## 7. Gate: retro.overrides

Read `.beastmode/config.yaml` → check `gates.retro.overrides`.
Default: `human`. Execute ONLY the matching option below.
Remove non-matching options from the task list.

### 7.1 human — Review Overrides

Present each proposed override and ask for approval before writing to `.beastmode/meta/{phase}/overrides.md`.

### 7.2 auto — Auto-Write Overrides

Auto-write all proposed overrides.
Log: "Gate `retro.overrides` → auto: wrote {N} overrides"

## 8. Gate: retro.context-changes

Read `.beastmode/config.yaml` → check `gates.retro.context-changes`.
Default: `human`. Execute ONLY the matching option below.
Remove non-matching options from the task list.

### 8.1 human — Review Context Changes

Present each proposed edit with confidence annotations.
Ask per-category: "Apply these context changes? [Y/n]"

### 8.2 auto — Auto-Apply Context Changes

Apply all context changes silently.
Log: "Gate `retro.context-changes` → auto: applied {N} context changes"

If no findings from either agent, report: "Phase retro: no changes needed." and skip gates 5-8.

## 9. Bottom-Up Summary Bubble

After applying L2 changes, propagate summaries upward:

1. **Update L1 summaries** — For each L1 file in the current domain (`context/{PHASE}.md`, `meta/{PHASE}.md`, `state/{PHASE}.md`):
   - Re-read all L2 @imported files
   - Rewrite the section summary (2-3 sentences) to reflect current L2 content
   - Rewrite the top-level summary paragraph to reflect all sections

2. **Prune stale entries** — In L2 "Related Decisions" sections:
   - Verify each linked state file still exists
   - Remove entries where the link target is missing
   - Flag entries where the one-liner no longer matches the linked file's goal

L0 (PRODUCT.md) updates are handled by /release step 8.5, not by the retro bubble.
```

**Step 2: Verify no old patterns remain**

Run: `grep "HITL-GATE" skills/_shared/retro.md`
Expected: no output (zero matches)

Run: `grep "@gate-check.md" skills/_shared/retro.md`
Expected: no output (zero matches)

Run: `grep -c "Gate:" skills/_shared/retro.md`
Expected: 4

---

### Task 2: Convert release step 10 to merge strategy gate

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `skills/release/phases/1-execute.md:161-163`

**Step 1: Replace step 10 "Merge and Cleanup"**

Replace lines 161-163 of `skills/release/phases/1-execute.md`:

```
## 10. Merge and Cleanup

@../_shared/worktree-manager.md#Merge Options
```

With:

```markdown
## 10. Gate: release.merge-strategy

Read `.beastmode/config.yaml` → check `gates.release.merge-strategy`.
Default: `human`. Execute ONLY the matching option below.
Remove non-matching options from the task list.

### 10.1 human — Ask User

Present merge options via AskUserQuestion:
- **Merge locally (Recommended)** — Merge to main, delete worktree and branch
- **Push and create PR** — Push branch, create PR, keep worktree
- **Keep as-is** — Print manual merge/cleanup commands
- **Discard** — Require typed confirmation, force delete

Execute chosen option per worktree-manager.md reference.

### 10.2 auto — Execute Configured Default

Read `release.merge-default` from `.beastmode/config.yaml` (default: `local`).

Execute the matching option:

**local:**
```bash
worktree_abs=$(pwd)
feature_branch=$(git branch --show-current)
main_repo=$(git rev-parse --show-toplevel)/..

cd "$main_repo"
git checkout main
git pull
git merge "$feature_branch"
git worktree remove "$worktree_abs"
git branch -d "$feature_branch"
```

**pr:**
```bash
git push -u origin "$feature_branch"
gh pr create --title "feat(<feature>): <summary>" --body "## Summary
<from changelog>

## Artifacts
- Design: .beastmode/state/design/YYYY-MM-DD-<feature>.md
- Plan: .beastmode/state/plan/YYYY-MM-DD-<feature>.md

Generated by beastmode"
```

**keep:**
Print manual merge/cleanup commands and STOP.

**discard:**
```bash
cd "$main_repo"
git checkout main
git worktree remove "$worktree_abs" --force
git branch -D "$feature_branch"
```

Log: "Gate `release.merge-strategy` → auto: {action}"
```

**Step 2: Verify**

Run: `grep "Gate: release.merge-strategy" skills/release/phases/1-execute.md`
Expected: `## 10. Gate: release.merge-strategy`

Run: `grep "@../_shared/worktree-manager.md#Merge Options" skills/release/phases/1-execute.md`
Expected: no output (import removed)

---

### Task 3: Demote worktree-manager.md Merge Options to reference-only

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `skills/_shared/worktree-manager.md:73-75`

**Step 1: Add "Reference Only" header to Merge Options section**

Replace lines 73-75 of `skills/_shared/worktree-manager.md`:

```
## Merge Options

Used by: `/release` 1-execute
```

With:

```markdown
## Merge Options (Reference Only)

> This section is reference documentation. The active merge gate is in `release/phases/1-execute.md` step 10.
>
> Previously used by: `/release` 1-execute
```

**Step 2: Verify**

Run: `grep "Reference Only" skills/_shared/worktree-manager.md`
Expected: `## Merge Options (Reference Only)`
