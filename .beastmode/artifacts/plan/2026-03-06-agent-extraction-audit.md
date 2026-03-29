# Agent Extraction Audit Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Centralize all agent prompts into `agents/` with `{phase}-{role}.md` naming, remove dead code, fix missing researcher reference.

**Architecture:** Move files, rename files, update @import paths. No behavioral changes.

**Tech Stack:** Markdown files, @import path references

**Design Doc:** `.beastmode/state/design/2026-03-06-agent-extraction-audit.md`

---

### Task 0: Delete dead agents/discovery.md

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Delete: `agents/discovery.md`

**Step 1: Delete the file**

```bash
rm agents/discovery.md
```

**Step 2: Verify no references exist**

Run: `grep -r "agents/discovery" skills/ agents/`
Expected: No matches (only state/ files may reference it historically)

---

### Task 1: Rename agents/researcher.md to agents/common-researcher.md

**Wave:** 1
**Depends on:** -

**Files:**
- Delete: `agents/researcher.md`
- Create: `agents/common-researcher.md`

**Step 1: Move the file**

```bash
mv agents/researcher.md agents/common-researcher.md
```

**Step 2: Verify file exists at new path**

Run: `ls agents/common-researcher.md`
Expected: File exists

---

### Task 2: Move 5 discovery agents to agents/

**Wave:** 1
**Depends on:** -

**Files:**
- Delete: `skills/beastmode/references/discovery-agents/stack-agent.md`
- Delete: `skills/beastmode/references/discovery-agents/structure-agent.md`
- Delete: `skills/beastmode/references/discovery-agents/conventions-agent.md`
- Delete: `skills/beastmode/references/discovery-agents/architecture-agent.md`
- Delete: `skills/beastmode/references/discovery-agents/testing-agent.md`
- Create: `agents/init-stack.md`
- Create: `agents/init-structure.md`
- Create: `agents/init-conventions.md`
- Create: `agents/init-architecture.md`
- Create: `agents/init-testing.md`

**Step 1: Move all 5 files**

```bash
mv skills/beastmode/references/discovery-agents/stack-agent.md agents/init-stack.md
mv skills/beastmode/references/discovery-agents/structure-agent.md agents/init-structure.md
mv skills/beastmode/references/discovery-agents/conventions-agent.md agents/init-conventions.md
mv skills/beastmode/references/discovery-agents/architecture-agent.md agents/init-architecture.md
mv skills/beastmode/references/discovery-agents/testing-agent.md agents/init-testing.md
```

**Step 2: Verify all files exist at new paths**

Run: `ls agents/init-*.md`
Expected: 5 files listed

**Step 3: Verify common-instructions.md stays put**

Run: `ls skills/beastmode/references/discovery-agents/common-instructions.md`
Expected: File still exists

---

### Task 3: Move implementer agent to agents/

**Wave:** 1
**Depends on:** -

**Files:**
- Delete: `skills/implement/references/implementer-agent.md`
- Create: `agents/implement-implementer.md`

**Step 1: Move the file**

```bash
mv skills/implement/references/implementer-agent.md agents/implement-implementer.md
```

**Step 2: Verify file exists at new path**

Run: `ls agents/implement-implementer.md`
Expected: File exists

---

### Task 4: Update @import paths in skills/beastmode/subcommands/init.md

**Wave:** 2
**Parallel-safe:** true
**Depends on:** Task 2

**Files:**
- Modify: `skills/beastmode/subcommands/init.md:107-108`

**Step 1: Update agent prompt template path**

In `skills/beastmode/subcommands/init.md`, change line 107 from:

```
Read agent prompt template from `@../references/discovery-agents/{agent}-agent.md`
```

to:

```
Read agent prompt template from `@../../../agents/init-{agent}.md`
```

**Step 2: Verify the change**

Run: `grep "agents/init-" skills/beastmode/subcommands/init.md`
Expected: Match on the updated line

---

### Task 5: Update @import path in skills/design/phases/0-prime.md

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `skills/design/phases/0-prime.md:35`

**Step 1: Update researcher reference**

In `skills/design/phases/0-prime.md`, change line 35 from:

```
2. Spawn Explore agent with `@../../agents/researcher.md`
```

to:

```
2. Spawn Explore agent with `@../../agents/common-researcher.md`
```

**Step 2: Verify the change**

Run: `grep "common-researcher" skills/design/phases/0-prime.md`
Expected: Match on the updated line

---

### Task 6: Update @import path in skills/_shared/0-prime-template.md

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `skills/_shared/0-prime-template.md:26`

**Step 1: Update researcher reference**

In `skills/_shared/0-prime-template.md`, change line 26 from:

```
If triggered, spawn Explore agent with `@../../agents/researcher.md`.
```

to:

```
If triggered, spawn Explore agent with `@../../agents/common-researcher.md`.
```

**Step 2: Verify the change**

Run: `grep "common-researcher" skills/_shared/0-prime-template.md`
Expected: Match on the updated line

---

### Task 7: Add researcher reference to skills/plan/phases/0-prime.md

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `skills/plan/phases/0-prime.md:52`

**Step 1: Add explicit researcher reference**

In `skills/plan/phases/0-prime.md`, change line 52 from:

```
If triggered, spawn Explore agent, save findings, summarize to user and continue to next step.
```

to:

```
If triggered, spawn Explore agent with `@../../agents/common-researcher.md`, save findings, summarize to user and continue to next step.
```

**Step 2: Verify the change**

Run: `grep "common-researcher" skills/plan/phases/0-prime.md`
Expected: Match on the updated line

---

### Task 8: Update @import path in skills/implement/phases/1-execute.md

**Wave:** 2
**Depends on:** Task 3

**Files:**
- Modify: `skills/implement/phases/1-execute.md:36`

**Step 1: Update implementer reference**

In `skills/implement/phases/1-execute.md`, change line 36 from:

```
   - Read `@../references/implementer-agent.md` for the agent role
```

to:

```
   - Read `@../../agents/implement-implementer.md` for the agent role
```

**Step 2: Verify the change**

Run: `grep "implement-implementer" skills/implement/phases/1-execute.md`
Expected: Match on the updated line

---

### Task 9: Final verification -- no broken references

**Wave:** 3
**Depends on:** Task 4, Task 5, Task 6, Task 7, Task 8

**Files:**
- (none -- verification only)

**Step 1: Verify no references to old paths remain in skills/**

Run: `grep -r "discovery-agents/.*-agent.md" skills/`
Expected: No matches

Run: `grep -r "references/implementer-agent" skills/`
Expected: No matches

Run: `grep -r "agents/researcher\.md" skills/ agents/`
Expected: No matches (only `common-researcher.md` should exist)

**Step 2: Verify final agents/ directory structure**

Run: `ls agents/`
Expected:
```
common-researcher.md
implement-implementer.md
init-architecture.md
init-conventions.md
init-stack.md
init-structure.md
init-testing.md
retro-context.md
retro-meta.md
```

**Step 3: Verify agents/discovery.md is gone**

Run: `ls agents/discovery.md`
Expected: No such file
