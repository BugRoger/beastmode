# Release Retro Commit Fix — Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Ensure release retro meta changes get committed by moving the retro step before the release commit.

**Architecture:** Move `@../_shared/retro.md` from release 3-checkpoint to 1-execute (before commit step). Renumber both files.

**Tech Stack:** Markdown skill prompts

**Design Doc:** `.beastmode/state/design/2026-03-04-release-retro-commit.md`

---

### Task 0: Move retro to release 1-execute.md before commit step

**Wave:** 1
**Depends on:** `-`

**Files:**
- Modify: `skills/release/phases/1-execute.md`

**Step 1: Insert new step 8 "Phase Retro" between current step 7 and step 8**

After `## 7. Bump Version Files` section, insert:

```markdown
## 8. Phase Retro

@../_shared/retro.md
```

**Step 2: Renumber current steps 8-11 to 9-12**

- `## 8. Commit Release Changes` → `## 9. Commit Release Changes`
- `## 9. Merge and Cleanup` → `## 10. Merge and Cleanup`
- `## 10. Git Tagging` → `## 11. Git Tagging`
- `## 11. Plugin Marketplace Update` → `## 12. Plugin Marketplace Update`

**Step 3: Verify**

Confirm 12 sequential steps numbered 1-12. Step 8 is "Phase Retro", step 9 is "Commit Release Changes".

---

### Task 1: Remove retro from release 3-checkpoint.md

**Wave:** 1
**Depends on:** `-`

**Files:**
- Modify: `skills/release/phases/3-checkpoint.md`

**Step 1: Remove the Phase Retro step and renumber**

Replace the entire file content with:

```markdown
# 3. Checkpoint

## 1. Context Report

@../_shared/context-report.md

## 2. Complete

"Release complete."
```

**Step 2: Verify**

Confirm 2 steps: "Context Report" and "Complete". No retro reference remains.
