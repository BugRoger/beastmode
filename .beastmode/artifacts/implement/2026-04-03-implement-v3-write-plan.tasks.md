# Write Plan — Implementation Tasks

## Goal

Replace the implicit Decompose step (Execute step 0) in `skills/implement/SKILL.md` with a visible Write Plan step that produces a `.tasks.md` document. Remove all `.tasks.json` references. Switch task persistence to checkbox tracking.

## Architecture

- Single file modification: `skills/implement/SKILL.md`
- The `.tasks.md` is a new artifact format at `.beastmode/artifacts/implement/YYYY-MM-DD-<epic>-<feature>.tasks.md`
- No YAML frontmatter in `.tasks.md` (avoids spurious output.json from stop hook)
- Checkbox tracking (`- [ ]` / `- [x]`) replaces JSON status mutations
- Self-review pass runs after writing: spec coverage, placeholder scan, type/name consistency

## Tech Stack

- Markdown (skill document authoring)
- No runtime code — this is a skill definition change

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `skills/implement/SKILL.md` | Modify | Replace Execute step 0, update wave loop resume, update task persistence, update references |

---

### Task 0: Replace Execute Step 0 (Decompose) with Write Plan

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/implement/SKILL.md:68-93`

- [ ] **Step 1: Replace the "Decompose Feature into Tasks" section header and preamble**

Replace lines 70-76 (the `### 0. Decompose Feature into Tasks` header through the numbered list opening) with the new Write Plan section header and description.

Old text to replace:
```
### 0. Decompose Feature into Tasks

Before dispatching, create a detailed task breakdown from the architectural feature plan.

1. **Read feature plan** — user stories, what to build, acceptance criteria
2. **Read architectural decisions** from the design doc — these are constraints
3. **Explore codebase** — identify exact files, patterns, test structure, dependencies
```

New text:
```
### 0. Write Plan

Before dispatching, produce a detailed `.tasks.md` document from the feature plan. This is the inspection point between "plan says what to build" and "agent writes code."

1. **Read feature plan** — user stories, what to build, acceptance criteria
2. **Read architectural decisions** from the design doc — these are constraints
3. **Explore codebase** — identify exact files, patterns, test structure, dependencies
```

- [ ] **Step 2: Replace task creation instructions and .tasks.json persistence with .tasks.md format**

Replace lines 77-93 (the task creation step 4 and the .tasks.json save step 5) with the new .tasks.md document structure.

Old text to replace:
````
4. **Create tasks** using the Task Format (see below):
   - Map each aspect of "What to Build" to one or more tasks
   - Include exact file paths discovered from codebase exploration
   - Include complete code in steps
   - Assign wave numbers based on dependencies
   - Include verification steps with expected output
5. **Save internal plan** to `.beastmode/artifacts/plan/YYYY-MM-DD-<epic-name>-<feature-name>.tasks.json`:
   ```json
   {
     "featurePlan": "<path-to-feature-plan.md>",
     "tasks": [
       {"id": 0, "subject": "Task 0: ...", "status": "pending"},
       {"id": 1, "subject": "Task 1: ...", "status": "pending"}
     ],
     "lastUpdated": "<timestamp>"
   }
   ```
````

New text:
````
4. **Create tasks** using the Task Format (see Reference section):
   - Map each aspect of "What to Build" to one or more tasks
   - Include exact file paths discovered from codebase exploration
   - Include complete code in steps — no placeholders
   - Assign wave numbers based on dependencies
   - Include verification steps with expected output
5. **Write `.tasks.md`** to `.beastmode/artifacts/implement/YYYY-MM-DD-<epic-name>-<feature-name>.tasks.md`:

   The document has three sections and NO YAML frontmatter (the stop hook scans `artifacts/<phase>/` for `.md` files with frontmatter and generates `.output.json` — the `.tasks.md` must not trigger this):

   **Header section** — goal, architecture, tech stack, duplicated from the feature plan (not referenced). Makes the document self-contained for agents.

   **File Structure section** — every file to be created or modified with its responsibility. Decomposition decisions are locked here, before individual task definitions.

   **Task definitions** — bite-sized TDD tasks following the Task Format (see Reference section). Each task uses checkbox tracking for cross-session resume:

   ```markdown
   - [ ] **Step 1: Write the failing test**
   [complete test code]

   - [ ] **Step 2: Run test to verify it fails**
   Run: `[exact command]`
   Expected: FAIL with "[message]"
   ```

   The controller resumes from the first unchecked step (`- [ ]`).

6. **Self-review pass** — before proceeding to dispatch, verify the `.tasks.md`:
   - **Spec coverage**: every acceptance criterion from the feature plan maps to at least one task
   - **Placeholder scan**: grep for TBD, TODO, "add appropriate", "similar to Task N", ellipsis (`...`) in code blocks — these are plan failures
   - **Type/name consistency**: identifiers used across tasks are consistent (no typos, no renamed-but-not-updated references)
   - Fix violations inline — no approval gate
````

- [ ] **Step 3: Verify the replacement is correct**

Read the modified file and confirm:
- Section header is `### 0. Write Plan`
- `.tasks.json` reference is gone from step 5
- `.tasks.md` path points to `artifacts/implement/` (not `artifacts/plan/`)
- Self-review pass is step 6
- No YAML frontmatter warning is present

---

### Task 1: Update Wave Loop Resume and Task Persistence

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/implement/SKILL.md:107-161`

- [ ] **Step 1: Update "Identify Runnable Tasks" to use checkbox resume**

Replace line 110:
```
   - Task is not already completed (from .tasks.json resume)
```

With:
```
   - Task is not already completed (all checkboxes `- [x]` in .tasks.md)
```

- [ ] **Step 2: Update "Update Task Persistence" to use checkbox mutations**

Replace lines 156-160 (the entire "Update Task Persistence" subsection):

Old text:
```
5. **Update Task Persistence** — After each task completes (or is blocked):

   1. Update `.beastmode/artifacts/plan/YYYY-MM-DD-<epic-name>-<feature-name>.tasks.json`:
      - Set task status to `completed` or `blocked`
      - Set `lastUpdated` timestamp
```

New text:
```
5. **Update Task Persistence** — After each task completes (or is blocked):

   1. Update `.beastmode/artifacts/implement/YYYY-MM-DD-<epic-name>-<feature-name>.tasks.md`:
      - Toggle completed steps from `- [ ]` to `- [x]`
      - If task is blocked, add `**Status: BLOCKED**` after the task header
```

- [ ] **Step 3: Verify the replacements**

Read the modified file and confirm:
- Line ~110 references `.tasks.md` checkbox state, not `.tasks.json`
- Lines ~156-160 reference `.tasks.md` with checkbox mutations, not `.tasks.json` with JSON updates
- No remaining `.tasks.json` references in the wave loop section

---

### Task 2: Update Reference Section — Decompose References

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/implement/SKILL.md:419-501`

- [ ] **Step 1: Update the Task Format intro line**

Replace line 421:
```
> Used by /implement's Decompose step to create detailed task breakdowns from feature plans.
```

With:
```
> Used by /implement's Write Plan step to create the `.tasks.md` document from feature plans.
```

- [ ] **Step 2: Update Step 5 in the Task Structure example**

Replace lines 468-472 (the Step 5 inside the Task Structure code block):

Old text:
```
**Step 5: Verify**

Run all related tests to confirm nothing broke.
No commit needed — unified commit at /release.
```

New text:
```
**Step 5: Commit**

```bash
git add [specific files]
git commit -m "feat(<feature>): [specific message]"
```
```

- [ ] **Step 3: Update Parallel-Safe Flag references**

Replace line 482:
```
**Parallel-Safe Flag** — After all tasks are written, /implement's Decompose step analyzes file overlap per wave and may add:
```

With:
```
**Parallel-Safe Flag** — After all tasks are written, /implement's Write Plan step analyzes file overlap per wave and may add:
```

Replace line 490:
```
- Written by the Decompose step — not by the human planner
```

With:
```
- Written by the Write Plan step — not by the human planner
```

- [ ] **Step 4: Verify all Decompose references are gone**

Grep the entire file for "Decompose" — should return zero matches.

---

### Task 3: Update Parse Waves Reference

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/implement/SKILL.md:95-101`

- [ ] **Step 1: Update Parse Waves intro**

Replace line 97:
```
Extract wave numbers and dependencies from the tasks created in Decompose:
```

With:
```
Extract wave numbers and dependencies from the `.tasks.md`:
```

- [ ] **Step 2: Verify**

Read lines 95-101 and confirm the reference to Decompose is gone.

---

### Task 4: Final Verification

**Wave:** 2
**Depends on:** Task 0, Task 1, Task 2, Task 3

**Files:**
- Verify: `skills/implement/SKILL.md`

- [ ] **Step 1: Verify no .tasks.json references remain**

```bash
grep -n "tasks\.json" skills/implement/SKILL.md
```

Expected: zero matches.

- [ ] **Step 2: Verify no Decompose references remain**

```bash
grep -n "Decompose" skills/implement/SKILL.md
```

Expected: zero matches.

- [ ] **Step 3: Verify all acceptance criteria are met**

1. Execute step 0 is "Write Plan" producing `.tasks.md` — check section header
2. `.tasks.md` contains header, file structure, and task definitions with complete code blocks — check step 5
3. No YAML frontmatter in `.tasks.md` — check the warning text
4. Checkbox tracking used for resume — check step 5 and "Identify Runnable Tasks"
5. Self-review pass runs after writing — check step 6
6. `.tasks.json` references removed entirely — grep confirms zero
7. Task persistence uses checkbox mutations — check "Update Task Persistence"
