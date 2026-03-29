# Remove CONTEXT.md and STATE.md — Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Delete two unused L0 files that consume context budget every session without serving any active skill or hook.

**Architecture:** Direct deletion. No dependencies, no cascading changes.

**Tech Stack:** `rm`

**Design Doc:** `.beastmode/state/design/2026-03-06-remove-context-state-md.md`

---

### Task 0: Delete CONTEXT.md

**Wave:** 1
**Depends on:** -

**Files:**
- Delete: `.beastmode/CONTEXT.md`

**Step 1: Delete the file**

```bash
rm .beastmode/CONTEXT.md
```

**Step 2: Verify**

```bash
test ! -f .beastmode/CONTEXT.md && echo "PASS" || echo "FAIL"
```
Expected: PASS

---

### Task 1: Delete STATE.md

**Wave:** 1
**Depends on:** -
**Parallel-safe:** true

**Files:**
- Delete: `.beastmode/STATE.md`

**Step 1: Delete the file**

```bash
rm .beastmode/STATE.md
```

**Step 2: Verify**

```bash
test ! -f .beastmode/STATE.md && echo "PASS" || echo "FAIL"
```
Expected: PASS
