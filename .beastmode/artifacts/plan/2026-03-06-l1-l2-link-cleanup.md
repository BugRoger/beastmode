# L1-L2 Link Cleanup Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Remove all L2 file path references from L1 documents and add enforcement to the retro agent.

**Architecture:** Two components -- retro agent rule addition (prevents future violations) and L1 file cleanup (removes existing violations). All changes are text edits to markdown files.

**Tech Stack:** Markdown, git

**Design Doc:** `.beastmode/state/design/2026-03-06-l1-l2-link-cleanup.md`

---

### Task 0: Add L1 format rule to retro agent

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `agents/retro-context.md:58,87-94`

**Step 1: Clarify L1 section format in New Area Recognition**

In `agents/retro-context.md`, update step 4 (New Area Recognition) line 58.

Change:
```
   - Parent L1 section: summary to add to `context/{PHASE}.md`
```

To:
```
   - Parent L1 section: heading + summary paragraph + numbered rules to add to `context/{PHASE}.md` (no L2 file path — L1 sections are self-contained)
```

**Step 2: Add L1 format rule to Rules section**

In `agents/retro-context.md`, after the last rule (line 94: `- **No confidence scoring** — ...`), add:

```
- **L1 format** — L1 sections contain heading + summary paragraph + numbered rules only. No L2 file paths, no @imports, no cross-level references of any kind
```

**Step 3: Verify**

Read `agents/retro-context.md` and confirm:
- Step 4 mentions "no L2 file path"
- Rules section has the new L1 format rule
- No other content was changed

---

### Task 1: Remove L2 paths from context/DESIGN.md

**Wave:** 2
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `.beastmode/context/DESIGN.md:12,24,33,42,50,59`

**Step 1: Remove all 6 bare L2 path lines**

Delete these lines (each is a standalone line containing only a path):
- Line 12: `design/product.md`
- Line 24: `design/architecture.md`
- Line 33: `design/task-runner.md`
- Line 42: `design/release-workflow.md`
- Line 50: `design/phase-transitions.md`
- Line 59: `design/tech-stack.md`

Also remove any resulting double blank lines (collapse to single blank line between sections).

**Step 2: Verify**

Grep for `/\.md$/` pattern in the file. No matches expected.
Confirm all section headings, summary paragraphs, and numbered rules are intact.

---

### Task 2: Remove L2 paths from context/VALIDATE.md

**Wave:** 2
**Depends on:** -

**Files:**
- Modify: `.beastmode/context/VALIDATE.md:11`

**Step 1: Remove bare L2 path line**

Delete line 11: `validate/quality-gates.md`

Collapse any resulting double blank lines.

**Step 2: Verify**

Grep for `/\.md$/` pattern. No matches expected.

---

### Task 3: Remove L2 paths from context/PLAN.md

**Wave:** 2
**Depends on:** -

**Files:**
- Modify: `.beastmode/context/PLAN.md:13,22`

**Step 1: Remove bare L2 path lines**

Delete:
- Line 13: `plan/conventions.md`
- Line 22: `plan/structure.md`

Collapse any resulting double blank lines.

**Step 2: Verify**

Grep for `/\.md$/` pattern. No matches expected.

---

### Task 4: Remove L2 paths from context/IMPLEMENT.md

**Wave:** 2
**Depends on:** -

**Files:**
- Modify: `.beastmode/context/IMPLEMENT.md:13,22`

**Step 1: Remove bare L2 path lines**

Delete:
- Line 13: `implement/agents.md`
- Line 22: `implement/testing.md`

Collapse any resulting double blank lines.

**Step 2: Verify**

Grep for `/\.md$/` pattern. No matches expected.

---

### Task 5: Remove L2 paths from context/RELEASE.md

**Wave:** 2
**Depends on:** -

**Files:**
- Modify: `.beastmode/context/RELEASE.md:13`

**Step 1: Remove bare L2 path line**

Delete line 13: `release/versioning.md`

Collapse any resulting double blank lines.

**Step 2: Verify**

Grep for `/\.md$/` pattern. No matches expected.

---

### Task 6: Remove L2 paths from meta/DESIGN.md

**Wave:** 2
**Depends on:** -

**Files:**
- Modify: `.beastmode/meta/DESIGN.md:7,11,15`

**Step 1: Remove bare L2 path lines**

Delete:
- Line 7: `design/sops.md`
- Line 11: `design/overrides.md`
- Line 15: `design/learnings.md`

Collapse any resulting double blank lines.

**Step 2: Verify**

Grep for `/\.md$/` pattern. No matches expected.

---

### Task 7: Remove L2 paths from meta/VALIDATE.md

**Wave:** 2
**Depends on:** -

**Files:**
- Modify: `.beastmode/meta/VALIDATE.md:7,11,15`

**Step 1: Remove bare L2 path lines**

Delete:
- Line 7: `validate/sops.md`
- Line 11: `validate/overrides.md`
- Line 15: `validate/learnings.md`

Collapse any resulting double blank lines.

**Step 2: Verify**

Grep for `/\.md$/` pattern. No matches expected.

---

### Task 8: Remove L2 paths from meta/PLAN.md

**Wave:** 2
**Depends on:** -

**Files:**
- Modify: `.beastmode/meta/PLAN.md:7,11,15`

**Step 1: Remove bare L2 path lines**

Delete:
- Line 7: `plan/sops.md`
- Line 11: `plan/overrides.md`
- Line 15: `plan/learnings.md`

Collapse any resulting double blank lines.

**Step 2: Verify**

Grep for `/\.md$/` pattern. No matches expected.

---

### Task 9: Remove L2 paths from meta/IMPLEMENT.md

**Wave:** 2
**Depends on:** -

**Files:**
- Modify: `.beastmode/meta/IMPLEMENT.md:7,11,15`

**Step 1: Remove bare L2 path lines**

Delete:
- Line 7: `implement/sops.md`
- Line 11: `implement/overrides.md`
- Line 15: `implement/learnings.md`

Collapse any resulting double blank lines.

**Step 2: Verify**

Grep for `/\.md$/` pattern. No matches expected.

---

### Task 10: Remove L2 paths from meta/RELEASE.md

**Wave:** 2
**Depends on:** -

**Files:**
- Modify: `.beastmode/meta/RELEASE.md:7,11,15`

**Step 1: Remove bare L2 path lines**

Delete:
- Line 7: `release/sops.md`
- Line 11: `release/overrides.md`
- Line 15: `release/learnings.md`

Collapse any resulting double blank lines.

**Step 2: Verify**

Grep for `/\.md$/` pattern. No matches expected.

---

### Task 11: Final cross-file verification

**Wave:** 3
**Depends on:** Task 0-10

**Files:**
- Read: all L1 files in `.beastmode/context/` and `.beastmode/meta/`
- Read: `agents/retro-context.md`

**Step 1: Grep all L1 files for residual L2 paths**

Run: `grep -rn '[a-z]*/[a-z]*\.md' .beastmode/context/*.md .beastmode/meta/*.md`
Expected: No output (zero matches).

**Step 2: Verify retro agent has new rule**

Read `agents/retro-context.md` and confirm the L1 format rule is present in the Rules section.

**Step 3: Diff check**

Run: `git diff --stat`
Expected: 11 files changed (10 L1 files + 1 retro agent). Only deletions in L1 files, only additions in retro-context.md.
