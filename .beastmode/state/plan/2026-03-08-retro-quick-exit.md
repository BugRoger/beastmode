# Retro Quick-Exit Removal & Release Phase Normalization — Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Remove the subjective quick-exit check from retro.md and normalize the release phase so retro lives in checkpoint like every other phase.

**Architecture:** Three-file change. retro.md loses its quick-exit section and gains an always-run note. Release execute truncates at step 8 (L0 proposal). Release checkpoint absorbs retro + merge + ship operations from execute.

**Tech Stack:** Markdown prompt engineering

**Design Doc:** .beastmode/state/design/2026-03-08-retro-quick-exit.md

---

### Task 0: Remove Quick-Exit from retro.md
**Parallel-safe:** true

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/_shared/retro.md:13-20`

**Step 1: Replace quick-exit section with always-run note**

Replace lines 13-20 (the `## 2. Quick-Exit Check` section) with:

```markdown
## 2. Always Run

Retro always runs. Context and meta walkers handle empty phases gracefully — context walker returns "No changes needed", meta walker returns "no findings". No skip logic.
```

**Step 2: Renumber subsequent sections**

The section numbering after the replacement stays the same — the new section 2 replaces the old section 2, so sections 3-11 are unaffected.

**Step 3: Verify**

Read `skills/_shared/retro.md` and confirm:
- No "Quick-Exit" text anywhere in the file
- Section 2 is "Always Run"
- Sections 3-11 still have correct numbering
- The `---` separator after section 2 is preserved

---

### Task 1: Truncate release/1-execute.md at Step 8

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/release/phases/1-execute.md:141-190`

**Step 1: Remove steps 8.5 through 12**

Delete everything from line 141 (`## 8.5. Phase Retro`) through end of file (line 190). The file should end after step 8 (Prepare L0 Update Proposal), specifically after line 139:

```
If no changes to Capabilities or How It Works are needed, skip writing the proposal file.
```

Ensure the file ends with a trailing newline.

**Step 2: Verify**

Read `skills/release/phases/1-execute.md` and confirm:
- Last section header is `## 8. Prepare L0 Update Proposal`
- No references to `retro.md`, squash merge, commit, tagging, or marketplace
- File ends cleanly after "skip writing the proposal file."

---

### Task 2: Expand release/3-checkpoint.md with Retro + Merge + Ship

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/release/phases/3-checkpoint.md:1-10`

**Step 1: Replace entire file contents**

Replace the current 3-checkpoint.md with:

```markdown
# 3. Checkpoint

## 1. Phase Retro

@../_shared/retro.md

## 2. Squash Merge to Main

@../_shared/worktree-manager.md#Merge Options

**Important:** For "Merge locally", the squash merge stages changes but does NOT commit. Proceed to step 3 to create the commit.

## 3. Commit Release

Create the single commit with GitHub release style message:

\`\`\`bash
git add -A
git commit -m "Release vX.Y.Z — <Title from CHANGELOG>

## Features
- <feature 1>
- <feature 2>

## Fixes
- <fix 1>

## Artifacts
- Design: .beastmode/state/design/YYYY-MM-DD-<feature>.md
- Plan: .beastmode/state/plan/YYYY-MM-DD-<feature>.md
- Release: .beastmode/state/release/YYYY-MM-DD-<feature>.md
"
\`\`\`

Use the release notes generated in execute step 5 and categorized commits from execute step 4 as the commit body. Omit empty sections (no Fixes if none exist).

## 4. Git Tagging

\`\`\`bash
git tag -a vX.Y.Z -m "Release X.Y.Z"
\`\`\`

Suggest: `git push origin vX.Y.Z`

## 5. Plugin Marketplace Update

Suggest running:
\`\`\`bash
claude plugin marketplace update
claude plugin update beastmode@beastmode-marketplace --scope project
\`\`\`

## 6. Context Report

@../_shared/context-report.md

## 7. Complete

"Release complete."
```

**Step 2: Verify**

Read `skills/release/phases/3-checkpoint.md` and confirm:
- Section 1 is "Phase Retro" with `@../_shared/retro.md`
- Section 2 is "Squash Merge to Main" with worktree-manager reference
- Section 3 is "Commit Release" with the commit template
- Section 4 is "Git Tagging"
- Section 5 is "Plugin Marketplace Update"
- Section 6 is "Context Report" with `@../_shared/context-report.md`
- Section 7 is "Complete"
- Retro comes before merge (ordering constraint from design)
