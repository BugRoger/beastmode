# Task-Runner Adherence Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Make task-runner execution verifiable by tightening the HARD-GATE contract in all 5 skill files.

**Architecture:** Each SKILL.md gets its HARD-GATE block rewritten to specify TodoWrite as the first required tool call, replacing the weak "Read and execute" wording. Per-skill constraint lines are preserved.

**Tech Stack:** Markdown

**Design Doc:** .beastmode/state/design/2026-03-08-task-runner-adherence.md

---

### Task 1: Rewrite design SKILL.md HARD-GATE

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `skills/design/SKILL.md:10-14`

**Step 1: Replace HARD-GATE block**

Replace lines 10-14:

```markdown
<HARD-GATE>
Read @_shared/task-runner.md. Parse and execute the phases below.

No implementation until design is approved. [→ Why](references/constraints.md)
</HARD-GATE>
```

With:

```markdown
<HARD-GATE>
Execute @_shared/task-runner.md now.

Your FIRST tool call MUST be TodoWrite with parsed phases from below.
Do not output anything else first.
Do not skip this for "simple" tasks.

No implementation until design is approved. [→ Why](references/constraints.md)
</HARD-GATE>
```

**Step 2: Verify**

Read `skills/design/SKILL.md` and confirm:
- Line 11 says "Execute" not "Read"
- "FIRST tool call MUST be TodoWrite" is present
- "No implementation until design is approved" constraint line is preserved
- Phase list (lines 18-21) is unchanged

---

### Task 2: Rewrite plan SKILL.md HARD-GATE

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/plan/SKILL.md:10-14`

**Step 1: Replace HARD-GATE block**

Replace lines 10-14:

```markdown
<HARD-GATE>
Read @_shared/task-runner.md. Parse and execute the phases below.

No EnterPlanMode or ExitPlanMode — this skill manages its own flow. [→ Why](references/constraints.md)
</HARD-GATE>
```

With:

```markdown
<HARD-GATE>
Execute @_shared/task-runner.md now.

Your FIRST tool call MUST be TodoWrite with parsed phases from below.
Do not output anything else first.
Do not skip this for "simple" tasks.

No EnterPlanMode or ExitPlanMode — this skill manages its own flow. [→ Why](references/constraints.md)
</HARD-GATE>
```

**Step 2: Verify**

Read `skills/plan/SKILL.md` and confirm:
- "Execute" not "Read"
- "FIRST tool call MUST be TodoWrite" present
- "No EnterPlanMode or ExitPlanMode" constraint preserved
- Phase list unchanged

---

### Task 3: Rewrite implement SKILL.md HARD-GATE

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/implement/SKILL.md:10-14`

**Step 1: Replace HARD-GATE block**

Replace lines 10-14:

```markdown
<HARD-GATE>
Read @_shared/task-runner.md. Parse and execute the phases below.

No EnterPlanMode or ExitPlanMode — worktree isolation only. [→ Why](references/constraints.md)
</HARD-GATE>
```

With:

```markdown
<HARD-GATE>
Execute @_shared/task-runner.md now.

Your FIRST tool call MUST be TodoWrite with parsed phases from below.
Do not output anything else first.
Do not skip this for "simple" tasks.

No EnterPlanMode or ExitPlanMode — worktree isolation only. [→ Why](references/constraints.md)
</HARD-GATE>
```

**Step 2: Verify**

Read `skills/implement/SKILL.md` and confirm:
- "Execute" not "Read"
- "FIRST tool call MUST be TodoWrite" present
- "No EnterPlanMode or ExitPlanMode — worktree isolation only" constraint preserved
- Phase list unchanged

---

### Task 4: Rewrite validate SKILL.md HARD-GATE

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/validate/SKILL.md:10-14`

**Step 1: Replace HARD-GATE block**

Replace lines 10-14:

```markdown
<HARD-GATE>
Read @_shared/task-runner.md. Parse and execute the phases below.

No release without passing validation. [→ Why](references/quality-gates.md)
</HARD-GATE>
```

With:

```markdown
<HARD-GATE>
Execute @_shared/task-runner.md now.

Your FIRST tool call MUST be TodoWrite with parsed phases from below.
Do not output anything else first.
Do not skip this for "simple" tasks.

No release without passing validation. [→ Why](references/quality-gates.md)
</HARD-GATE>
```

**Step 2: Verify**

Read `skills/validate/SKILL.md` and confirm:
- "Execute" not "Read"
- "FIRST tool call MUST be TodoWrite" present
- "No release without passing validation" constraint preserved
- Phase list unchanged

---

### Task 5: Rewrite release SKILL.md HARD-GATE

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/release/SKILL.md:10-12`

**Step 1: Replace HARD-GATE block**

Replace lines 10-12:

```markdown
<HARD-GATE>
Read @_shared/task-runner.md. Parse and execute the phases below.
</HARD-GATE>
```

With:

```markdown
<HARD-GATE>
Execute @_shared/task-runner.md now.

Your FIRST tool call MUST be TodoWrite with parsed phases from below.
Do not output anything else first.
Do not skip this for "simple" tasks.
</HARD-GATE>
```

Note: release has no per-skill constraint line — the HARD-GATE only had the task-runner reference.

**Step 2: Verify**

Read `skills/release/SKILL.md` and confirm:
- "Execute" not "Read"
- "FIRST tool call MUST be TodoWrite" present
- Phase list unchanged
- No constraint line was accidentally added or removed
