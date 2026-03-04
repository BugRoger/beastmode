# Fix Auto-Transitions Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Make auto-transitions between skills work by using explicit Skill tool calls instead of ambiguous "invoke" instructions.

**Architecture:** Rewrite `transition-check.md` auto mode to call `Skill(skill="beastmode:<next>", args="<artifact>")`. Update all checkpoints to use fully-qualified skill names and pass feature slugs. Drop `/compact` reference.

**Tech Stack:** Claude Code plugin system, markdown skill definitions

**Design Doc:** `.beastmode/state/design/2026-03-04-fix-auto-transitions.md`

---

### Task 0: Rewrite transition-check.md auto mode

**Wave:** 1
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `skills/_shared/transition-check.md`

**Step 1: Replace the auto mode section**

Replace the current `### auto mode` section (lines 27-38) with explicit Skill tool call instructions. Remove the `/compact` reference entirely.

Current content to replace:
```markdown
### auto mode
1. Check context remaining (estimate from conversation length)
2. Read `transitions.context_threshold` (default: 60)
3. If context remaining >= threshold:
   - Run `/compact` to condense current context
   - Invoke the next skill: `/next-skill <artifact-path>`
4. If context remaining < threshold:
   - Print:
     ```
     Context is low (~X% remaining). Start a new session and run:
     /next-skill <artifact-path>
     ```
   - STOP
```

New content:
```markdown
### auto mode
1. Estimate context remaining (heuristic from conversation length)
2. Read `transitions.context_threshold` (default: 60)
3. If context remaining >= threshold:
   - Call the Skill tool to invoke the next skill:
     `Skill(skill="beastmode:<next-skill>", args="<artifact-path>")`
   - The `<next-skill>` and `<artifact-path>` come from the Phase-to-Skill Mapping table below and the checkpoint's "Next skill" line
4. If context remaining < threshold:
   - Print:
     ```
     Context is low (~X% remaining). Start a new session and run:
     /beastmode:<next-skill> <artifact-path>
     ```
   - STOP
```

**Step 2: Update the Phase-to-Skill Mapping table**

Replace the current table (lines 42-47) with fully-qualified names and artifact paths:

Current:
```markdown
| Transition | Next Skill | Artifact |
|-----------|------------|----------|
| design-to-plan | /plan | `.beastmode/state/design/YYYY-MM-DD-<feature>.md` |
| plan-to-implement | /implement | `.beastmode/state/plan/YYYY-MM-DD-<feature>.md` |
| implement-to-validate | /validate | (no artifact needed) |
| validate-to-release | /release | (no artifact needed) |
```

New:
```markdown
| Transition | Next Skill | Artifact |
|-----------|------------|----------|
| design-to-plan | `beastmode:plan` | `.beastmode/state/design/YYYY-MM-DD-<feature>.md` |
| plan-to-implement | `beastmode:implement` | `.beastmode/state/plan/YYYY-MM-DD-<feature>.md` |
| implement-to-validate | `beastmode:validate` | `YYYY-MM-DD-<feature>.md` |
| validate-to-release | `beastmode:release` | `YYYY-MM-DD-<feature>.md` |
```

**Step 3: Verify**

Run: `grep -c "compact" skills/_shared/transition-check.md`
Expected: 0 (no references to /compact remain)

Run: `grep "beastmode:" skills/_shared/transition-check.md`
Expected: All 4 fully-qualified skill names appear

---

### Task 1: Update implement checkpoint to pass feature slug

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/implement/phases/3-checkpoint.md:38-39`

**Step 1: Update the "Next skill" line**

Current (line 38-39):
```markdown
Next skill: `/validate`
```

New:
```markdown
Next skill: `beastmode:validate YYYY-MM-DD-<feature>.md`
```

**Step 2: Verify**

Run: `grep "Next skill" skills/implement/phases/3-checkpoint.md`
Expected: Contains `beastmode:validate YYYY-MM-DD-<feature>.md`

---

### Task 2: Update validate checkpoint to pass feature slug

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/validate/phases/3-checkpoint.md:29`

**Step 1: Update the "Next skill" line**

Current (line 29):
```markdown
Next skill: `/release`
```

New:
```markdown
Next skill: `beastmode:release YYYY-MM-DD-<feature>.md`
```

**Step 2: Verify**

Run: `grep "Next skill" skills/validate/phases/3-checkpoint.md`
Expected: Contains `beastmode:release YYYY-MM-DD-<feature>.md`

---

### Task 3: Update design checkpoint with fully-qualified name

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/design/phases/3-checkpoint.md:42`

**Step 1: Update the "Next skill" line**

Current (line 42):
```markdown
Next skill: `/plan .beastmode/state/design/YYYY-MM-DD-<topic>.md`
```

New:
```markdown
Next skill: `beastmode:plan .beastmode/state/design/YYYY-MM-DD-<topic>.md`
```

**Step 2: Verify**

Run: `grep "Next skill" skills/design/phases/3-checkpoint.md`
Expected: Contains `beastmode:plan`

---

### Task 4: Update plan checkpoint with fully-qualified name

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/plan/phases/3-checkpoint.md:39`

**Step 1: Update the "Next skill" line**

Current (line 39):
```markdown
Next skill: `/implement .beastmode/state/plan/YYYY-MM-DD-<feature-name>.md`
```

New:
```markdown
Next skill: `beastmode:implement .beastmode/state/plan/YYYY-MM-DD-<feature-name>.md`
```

**Step 2: Verify**

Run: `grep "Next skill" skills/plan/phases/3-checkpoint.md`
Expected: Contains `beastmode:implement`
