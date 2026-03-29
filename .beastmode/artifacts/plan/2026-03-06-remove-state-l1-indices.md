# Remove State L1 Indices — Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Remove 5 dead state L1 index files and their only consumer reference.

**Architecture:** Delete files, edit one line in one skill file.

**Tech Stack:** Markdown, rm

**Design Doc:** `.beastmode/state/design/2026-03-06-remove-state-l1-indices.md`

---

### Task 1: Delete State L1 Index Files

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Delete: `.beastmode/state/DESIGN.md`
- Delete: `.beastmode/state/PLAN.md`
- Delete: `.beastmode/state/IMPLEMENT.md`
- Delete: `.beastmode/state/VALIDATE.md`
- Delete: `.beastmode/state/RELEASE.md`

**Step 1: Delete all 5 state L1 files**

```bash
rm .beastmode/state/DESIGN.md
rm .beastmode/state/PLAN.md
rm .beastmode/state/IMPLEMENT.md
rm .beastmode/state/VALIDATE.md
rm .beastmode/state/RELEASE.md
```

**Step 2: Verify L3 artifacts still exist**

```bash
ls .beastmode/state/design/ | head -3
ls .beastmode/state/plan/ | head -3
```
Expected: L3 artifact files still present.

---

### Task 2: Update Release Skill

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/release/phases/1-execute.md:114`

**Step 1: Edit line 114 to remove state L1 references**

Replace:
```
2. Read all L1 domain summaries (`context/DESIGN.md`, `context/PLAN.md`, `context/IMPLEMENT.md`, `context/VALIDATE.md`, `context/RELEASE.md`, `meta/DESIGN.md`, `meta/PLAN.md`, `meta/IMPLEMENT.md`, `meta/VALIDATE.md`, `meta/RELEASE.md`, `state/DESIGN.md`, `state/PLAN.md`, `state/IMPLEMENT.md`, `state/VALIDATE.md`, `state/RELEASE.md`)
```

With:
```
2. Read all L1 domain summaries (`context/DESIGN.md`, `context/PLAN.md`, `context/IMPLEMENT.md`, `context/VALIDATE.md`, `context/RELEASE.md`, `meta/DESIGN.md`, `meta/PLAN.md`, `meta/IMPLEMENT.md`, `meta/VALIDATE.md`, `meta/RELEASE.md`)
```

**Step 2: Verify no remaining state L1 references in skills/**

```bash
grep -r "state/DESIGN\.md\|state/PLAN\.md\|state/IMPLEMENT\.md\|state/VALIDATE\.md\|state/RELEASE\.md" skills/
```
Expected: No matches.
