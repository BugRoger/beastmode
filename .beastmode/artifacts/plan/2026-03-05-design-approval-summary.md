# Design Approval Summary Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Add an executive summary to the design approval gate in the validate phase.

**Architecture:** Insert a new step between anti-pattern check and approval gate in `2-validate.md`. Single file change.

**Tech Stack:** Markdown (skill definition)

**Design Doc:** `.beastmode/state/design/2026-03-05-design-approval-summary.md`

---

### Task 1: Add Executive Summary Step to Validate Phase

**Wave:** 1
**Depends on:** `-`

**Files:**
- Modify: `skills/design/phases/2-validate.md:26-42`

**Step 1: Insert executive summary section after anti-pattern check**

Add new `## 3. Executive Summary` between current step 2 and step 3. Include the template with Goal, Approach, Locked Decisions table, and Acceptance Criteria checklist. Add instruction that this is read-only — no new questions.

```markdown
## 3. Executive Summary

Before asking for approval, present a consolidated executive summary of the design so the user can review the full picture in one place.

Print:

### Executive Summary

**Goal**: [one-sentence goal from the design]

**Approach**: [one-sentence approach summary]

**Locked Decisions:**

| Decision | Choice |
|----------|--------|
| [decision 1] | [choice] |
| [decision 2] | [choice] |
| ... | ... |

**Acceptance Criteria:**
- [ ] [criterion 1]
- [ ] [criterion 2]
- [ ] ...

Render this from the decisions and criteria gathered during the execute phase. Do NOT ask new questions — this is a read-only summary of what was already discussed.
```

**Step 2: Renumber approval gate from step 3 to step 4**

Change `## 3. User Approval Gate` → `## 4. User Approval Gate`

**Step 3: Verify**

Read the file and confirm:
- Steps are numbered 1→2→3→4 sequentially
- Executive summary appears before approval gate
- No content was lost from the original approval gate

---

**Note:** This change was already applied to the worktree during /design. /implement should verify the existing change matches the plan.
