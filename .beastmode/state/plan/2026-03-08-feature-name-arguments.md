# Feature Name Arguments Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Change all phase transition arguments from file paths to feature names, and add artifact resolution by convention glob inside worktrees.

**Architecture:** Update worktree-manager.md with path rejection in Discover Feature, add new Resolve Artifact section. Update 4 checkpoint transition gates and 2 prime artifact-read steps to use feature names instead of file paths.

**Tech Stack:** Markdown skill files interpreted by Claude Code

**Design Doc:** `.beastmode/state/design/2026-03-08-feature-name-arguments.md`

---

### Task 0: Update Discover Feature in worktree-manager.md

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/_shared/worktree-manager.md:28-59`

**Step 1: Replace Case 1 (argument provided) with feature-name-only validation**

In `skills/_shared/worktree-manager.md`, replace the current "Case 1: Argument provided" block with path rejection and direct feature name usage:

```markdown
**Case 1: Argument provided** — validate it is a feature name, not a file path:

If the argument contains `/` or `.md`, print:

```
ERROR: Argument looks like a file path. Use the feature name instead:
  /beastmode:<phase> <feature-name>

Example: /beastmode:plan deferred-ideas
```

STOP. Do not attempt to extract a feature name from a path.

Otherwise, use the argument directly as the feature name:

```bash
feature="$argument"
```
```

**Step 2: Update Derive Feature Name section**

In the same file, update the "From artifact path" subsection header under "Derive Feature Name" to clarify it is only used internally (by checkpoints for artifact naming), not for argument parsing:

```markdown
**From artifact path** (internal — used by checkpoints for artifact naming, NOT for argument parsing):
```

**Step 3: Verify**

Read the modified file and confirm:
- Case 1 rejects arguments containing `/` or `.md`
- Case 1 uses argument directly as feature name when valid
- Cases 2 and 3 are unchanged

---

### Task 1: Add Resolve Artifact section to worktree-manager.md

**Wave:** 1
**Depends on:** Task 0

**Files:**
- Modify: `skills/_shared/worktree-manager.md` (insert after "Discover Feature" section, before "Create Worktree")

**Step 1: Insert the Resolve Artifact section**

Add after the "Discover Feature" section and before the "Create Worktree" section:

```markdown
## Resolve Artifact

Used by: `/plan` 0-prime (type=design), `/implement` 0-prime (type=plan), `/release` 0-prime (type=plan)

Finds the phase input artifact by convention glob inside the worktree. MUST be called AFTER entering the worktree.

```bash
type="<artifact-type>"  # design, plan, implement, or validate
feature="<feature-name>"

# Convention: artifacts are YYYY-MM-DD-<feature>.md
matches=$(ls .beastmode/state/$type/*-$feature.md 2>/dev/null)

if [ -z "$matches" ]; then
  echo "ERROR: No $type artifact found for feature '$feature'"
  echo "Expected: .beastmode/state/$type/*-$feature.md"
  exit 1
fi

# If multiple, take latest (date prefix sorts chronologically)
artifact=$(echo "$matches" | tail -1)
```

Report: "Resolved `$type` artifact: `$artifact`"
```

**Step 2: Verify**

Read the file and confirm the section exists between "Discover Feature" and "Create Worktree".

---

### Task 2: Update design checkpoint transition

**Wave:** 2
**Parallel-safe:** true
**Depends on:** Task 0

**Files:**
- Modify: `skills/design/phases/3-checkpoint.md:41-65`

**Step 1: Update the transition gate**

Replace the entire `## 5. [GATE|transitions.design-to-plan]` section with:

```markdown
## 5. [GATE|transitions.design-to-plan]

Read `.beastmode/config.yaml` → resolve mode for `transitions.design-to-plan`.
Default: `human`.

### [GATE-OPTION|human] Suggest Next Step

Print:

Next: `/beastmode:plan <feature>`

STOP. No additional output.

### [GATE-OPTION|auto] Chain to Next Phase

Estimate context remaining. If >= threshold (default 60%):
Call `Skill(skill="beastmode:plan", args="<feature>")`

If below threshold, print:

Start a new session and run:

`/beastmode:plan <feature>`

STOP. No additional output.
```

Where `<feature>` is the worktree directory name (same value used for the artifact filename).

**Step 2: Verify**

Read the file. Confirm no file paths remain in the transition output — only `<feature>`.

---

### Task 3: Update plan prime artifact read

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `skills/plan/phases/0-prime.md:40-43`

**Step 1: Replace step 5 with Resolve Artifact**

Replace:
```markdown
## 5. Read Design Document

Read the design doc from arguments (e.g., `.beastmode/state/design/YYYY-MM-DD-<topic>.md`).
```

With:
```markdown
## 5. Read Design Document

Resolve the design artifact using [worktree-manager.md](../_shared/worktree-manager.md) → "Resolve Artifact" with type=`design` and the feature name from step 3.

Read the resolved file path.
```

**Step 2: Verify**

Read the file. Confirm step 5 references Resolve Artifact, not argument file paths.

---

### Task 4: Update plan checkpoint transition

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/plan/phases/3-checkpoint.md:34-63`

**Step 1: Update the transition gate**

Replace the `## 5. [GATE|transitions.plan-to-implement]` section with:

```markdown
## 5. [GATE|transitions.plan-to-implement]

Read `.beastmode/config.yaml` → resolve mode for `transitions.plan-to-implement`.
Default: `human`.

<HARD-GATE>
DO NOT call EnterPlanMode or ExitPlanMode.
</HARD-GATE>

### [GATE-OPTION|human] Suggest Next Step

Print:

Next: `/beastmode:implement <feature>`

STOP. No additional output.

### [GATE-OPTION|auto] Chain to Next Phase

Estimate context remaining. If >= threshold (default 60%):
Call `Skill(skill="beastmode:implement", args="<feature>")`

If below threshold, print:

Start a new session and run:

`/beastmode:implement <feature>`

STOP. No additional output.
```

**Step 2: Verify**

Read the file. Confirm no file paths in transition output.

---

### Task 5: Update implement prime artifact read

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `skills/implement/phases/0-prime.md:31-34`

**Step 1: Replace step 4 with Resolve Artifact**

Replace:
```markdown
## 4. Read Plan

Load the plan from arguments (e.g., `.beastmode/state/plan/YYYY-MM-DD-<topic>.md`).
```

With:
```markdown
## 4. Read Plan

Resolve the plan artifact using [worktree-manager.md](../_shared/worktree-manager.md) → "Resolve Artifact" with type=`plan` and the feature name from step 3.

Read the resolved file path.
```

**Step 2: Verify**

Read the file. Confirm step 4 references Resolve Artifact.

---

### Task 6: Update implement checkpoint transition

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/implement/phases/3-checkpoint.md:37-61`

**Step 1: Update the transition gate**

Replace the `## 4. [GATE|transitions.implement-to-validate]` section with:

```markdown
## 4. [GATE|transitions.implement-to-validate]

Read `.beastmode/config.yaml` → resolve mode for `transitions.implement-to-validate`.
Default: `human`.

### [GATE-OPTION|human] Suggest Next Step

Print:

Next: `/beastmode:validate <feature>`

STOP. No additional output.

### [GATE-OPTION|auto] Chain to Next Phase

Estimate context remaining. If >= threshold (default 60%):
Call `Skill(skill="beastmode:validate", args="<feature>")`

If below threshold, print:

Start a new session and run:

`/beastmode:validate <feature>`

STOP. No additional output.
```

**Step 2: Verify**

Read the file. Confirm no file paths in transition output.

---

### Task 7: Update validate checkpoint transition

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/validate/phases/3-checkpoint.md:19-53`

**Step 1: Update the transition gate**

Replace the `## 4. [GATE|transitions.validate-to-release]` section with:

```markdown
## 4. [GATE|transitions.validate-to-release]

If FAIL:
```
Validation failed. Fix issues and re-run:
`/beastmode:validate`
```
STOP — do not proceed to transition check.

If PASS:

Read `.beastmode/config.yaml` → resolve mode for `transitions.validate-to-release`.
Default: `human`.

### [GATE-OPTION|human] Suggest Next Step

Print:

Next: `/beastmode:release <feature>`

STOP. No additional output.

### [GATE-OPTION|auto] Chain to Next Phase

Estimate context remaining. If >= threshold (default 60%):
Call `Skill(skill="beastmode:release", args="<feature>")`

If below threshold, print:

Start a new session and run:

`/beastmode:release <feature>`

STOP. No additional output.
```

**Step 2: Verify**

Read the file. Confirm no file paths in transition output.
