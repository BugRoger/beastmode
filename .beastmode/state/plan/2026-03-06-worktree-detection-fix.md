# Worktree Detection Fix Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Fix state file reads failing because worktree entry happens after the read in plan and implement 0-primes.

**Architecture:** Reorder steps in 2 files. Move "Discover and Enter Feature Worktree" before state file reads. No new logic.

**Tech Stack:** Markdown files only.

**Design Doc:** [worktree-detection-fix](../design/2026-03-06-worktree-detection-fix.md)

---

### Task 0: Reorder Plan 0-prime Steps

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `skills/plan/phases/0-prime.md`

**Step 1: Move worktree step before design doc read**

Current step order:
```
## 1. Announce Skill
## 2. Load Project Context
## 3. Check Research Trigger
## 4. Read Design Document
## 5. Discover and Enter Feature Worktree
```

New step order:
```
## 1. Announce Skill
## 2. Load Project Context
## 3. Discover and Enter Feature Worktree
## 4. Check Research Trigger
## 5. Read Design Document
```

Move the entire "Discover and Enter Feature Worktree" section (heading + all content including code block and worktree-manager reference) from step 5 to step 3. Renumber "Check Research Trigger" to 4 and "Read Design Document" to 5. No content changes — only ordering and step numbers.

**Step 2: Verify**

```bash
grep "^## [0-9]" skills/plan/phases/0-prime.md
# Expected output:
# ## 1. Announce Skill
# ## 2. Load Project Context
# ## 3. Discover and Enter Feature Worktree
# ## 4. Check Research Trigger
# ## 5. Read Design Document
```

---

### Task 1: Reorder Implement 0-prime Steps

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `skills/implement/phases/0-prime.md`

**Step 1: Move worktree step before plan read**

Current step order:
```
## 1. Announce Skill
## 2. Load Project Context
## 3. Read Plan
## 4. Discover and Enter Feature Worktree
## 5. Prepare Environment
## 6. Parse Waves
## 7. Load Task Persistence
```

New step order:
```
## 1. Announce Skill
## 2. Load Project Context
## 3. Discover and Enter Feature Worktree
## 4. Read Plan
## 5. Prepare Environment
## 6. Parse Waves
## 7. Load Task Persistence
```

Move the entire "Discover and Enter Feature Worktree" section from step 4 to step 3. Renumber "Read Plan" to 4. Steps 5-7 keep their numbers (no change). No content changes — only ordering and step numbers.

**Step 2: Verify**

```bash
grep "^## [0-9]" skills/implement/phases/0-prime.md
# Expected output:
# ## 1. Announce Skill
# ## 2. Load Project Context
# ## 3. Discover and Enter Feature Worktree
# ## 4. Read Plan
# ## 5. Prepare Environment
# ## 6. Parse Waves
# ## 7. Load Task Persistence
```
