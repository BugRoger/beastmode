# Worktree-Artifact Alignment Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Enforce 1:1 alignment between worktree names and phase artifact filenames, and prevent any `.beastmode/` writes to main branch.

**Architecture:** Add two new sections to `worktree-manager.md` (Derive Feature Name + Assert Worktree), then update all phases to reference these shared operations. Release gets a two-phase split with an explicit pre-merge/post-merge boundary. Retro gets belt-and-suspenders worktree scoping.

**Tech Stack:** Markdown skill definitions interpreted by Claude Code

**Design Doc:** `.beastmode/state/design/2026-03-08-worktree-artifact-alignment.md`

---

### Task 0: Add Derive Feature Name and Assert Worktree to worktree-manager.md

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/_shared/worktree-manager.md:1-72`

**Step 1: Add Derive Feature Name section after line 3**

Insert new section between the file header (lines 1-3) and the existing "Discover Feature" section (line 5):

```markdown
## Derive Feature Name

Shared derivation used by ALL phases. Single source of truth for feature naming.

Used by: `/design` (worktree creation), all checkpoints (artifact naming), `/plan`, `/implement`, `/validate` 0-prime (feature extraction from artifact paths)

**From user topic** (design phase):

```bash
# Input: "Git Branching Strategy" or "git-branching-strategy"
feature=$(echo "$input" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9-]//g' | sed 's/--*/-/g' | sed 's/^-//;s/-$//')
```

**From artifact path** (plan/implement/validate phases):

```bash
# Input: .beastmode/state/design/2026-03-08-worktree-artifact-alignment.md
# Output: worktree-artifact-alignment
feature=$(basename "$argument" .md | sed 's/^[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}-//')
```

Both derivations MUST produce identical output for the same feature. The worktree directory name, branch name suffix, and artifact filename suffix are always the feature name from this section.
```

**Step 2: Add Assert Worktree section after Enter Worktree (after line 71)**

Insert before the "Merge Options" section:

```markdown
## Assert Worktree

Guards against writing `.beastmode/` files from the main repo. Called before ANY write to `state/`, `context/`, or `meta/`.

Used by: all `3-checkpoint.md` phases (before writes), `retro.md` (before spawning agents), `release/1-execute.md` (before pre-merge work)

```bash
if [[ "$(pwd)" != *".beastmode/worktrees/"* ]]; then
  echo "FATAL: Not in a worktree. Current dir: $(pwd)"
  echo "All .beastmode/ writes must happen from inside a worktree."
  echo "STOPPING — fix your working directory before continuing."
  exit 1
fi
```

If Assert Worktree fails, STOP immediately. Do not attempt to recover or create a worktree — the phase that should have entered the worktree failed to do so.
```

**Step 3: Update Discover Feature to reference Derive Feature Name**

Replace the existing extraction logic in the "Discover Feature" section (lines 11-17) to reference the shared derivation:

Replace:
```markdown
**Case 1: Argument provided** — extract feature name from the state file path:

```bash
# Input: .beastmode/state/design/2026-03-04-worktree-session-discovery.md
# Output: worktree-session-discovery
feature=$(basename "$argument" .md | sed 's/^[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}-//')
```
```

With:
```markdown
**Case 1: Argument provided** — extract feature name using "Derive Feature Name" (from artifact path):

```bash
feature=$(basename "$argument" .md | sed 's/^[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}-//')
```

The extracted `feature` MUST match an existing worktree directory name exactly. If it doesn't, STOP — do not search for similar names or create a new worktree.
```

**Step 4: Update Create Worktree to reference Derive Feature Name**

Replace lines 40-43:

Replace:
```markdown
Used by: `/design` 0-prime

```bash
feature="<feature-name-from-arguments>"
```
```

With:
```markdown
Used by: `/design` 1-execute

Derive the feature name using "Derive Feature Name" (from user topic) above.

```bash
feature="<derived-feature-name>"
```
```

**Step 5: Verify**

Read the complete file and confirm:
- Derive Feature Name section exists between header and Discover Feature
- Assert Worktree section exists between Enter Worktree and Merge Options
- Discover Feature references Derive Feature Name
- Create Worktree references Derive Feature Name

---

### Task 1: Update design/1-execute.md to reference shared derivation

**Wave:** 2
**Parallel-safe:** true
**Depends on:** Task 0

**Files:**
- Modify: `skills/design/phases/1-execute.md:1-18`

**Step 1: Replace worktree creation section**

Replace lines 1-18:

```
# 1. Execute

## 1. Create Feature Worktree

**MANDATORY — do not skip this step.**

Derive `<feature>` from the user's topic (kebab-case, e.g. `git-branching-strategy`).

```bash
mkdir -p .beastmode/worktrees
git worktree add ".beastmode/worktrees/<feature>" -b "feature/<feature>"
cd ".beastmode/worktrees/<feature>"
pwd  # confirm you are in the worktree
```

All subsequent work in this session MUST happen inside the worktree. If `cd` or `pwd` shows you are still in the main repo, STOP and fix it.

See [worktree-manager.md](../_shared/worktree-manager.md) for full reference.
```

With:

```
# 1. Execute

## 1. Create Feature Worktree

**MANDATORY — do not skip this step.**

Derive `<feature>` from the user's topic using [worktree-manager.md](../_shared/worktree-manager.md) → "Derive Feature Name" (from user topic).

Then create the worktree using [worktree-manager.md](../_shared/worktree-manager.md) → "Create Worktree".

All subsequent work in this session MUST happen inside the worktree. If `cd` or `pwd` shows you are still in the main repo, STOP and fix it.
```

**Step 2: Verify**

Read the modified file and confirm the worktree creation now references the shared derivation.

---

### Task 2: Add Assert Worktree to design/3-checkpoint.md

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/design/phases/3-checkpoint.md:1-5`

**Step 1: Add Assert Worktree before the first write**

Replace lines 1-5:

```
# 3. Checkpoint

## 1. Write Design Doc

Save to `.beastmode/state/design/YYYY-MM-DD-<topic>.md`
```

With:

```
# 3. Checkpoint

## 0. Assert Worktree

Before any writes, call [worktree-manager.md](../_shared/worktree-manager.md) → "Assert Worktree". If it fails, STOP.

## 1. Write Design Doc

Save to `.beastmode/state/design/YYYY-MM-DD-<feature>.md` where `<feature>` is the worktree directory name (from "Derive Feature Name").
```

**Step 2: Verify**

Read the modified file and confirm Assert Worktree is step 0 and artifact uses `<feature>` not `<topic>`.

---

### Task 3: Update plan/0-prime.md to reference shared derivation

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/plan/phases/0-prime.md:20-43`

**Step 1: Replace the Discover and Enter section**

Replace lines 20-43:

```
## 3. Discover and Enter Feature Worktree

**MANDATORY — do not skip this step.**

Resolve the feature name and enter the worktree:

1. If arguments contain a state file path → extract feature name from filename (strip date prefix and `.md`)
2. If no arguments → scan `.beastmode/worktrees/` for directories:
   - Exactly one → use it automatically
   - Multiple → list with branch names, ask user to pick via `AskUserQuestion`
   - Zero → print: "No active worktrees found. Run /design to start a new feature, or provide a state file path as argument." and STOP
3. Enter the worktree:

```bash
worktree_path=".beastmode/worktrees/$feature"
if [ ! -d "$worktree_path" ]; then
  echo "Error: Worktree not found at $worktree_path"
  exit 1
fi
cd "$worktree_path"
pwd  # confirm you are in the worktree
```

See [worktree-manager.md](../_shared/worktree-manager.md) for full reference.
```

With:

```
## 3. Discover and Enter Feature Worktree

**MANDATORY — do not skip this step.**

Follow [worktree-manager.md](../_shared/worktree-manager.md):

1. **Discover Feature** — resolve feature name from arguments or filesystem scan. Uses "Derive Feature Name" for extraction. Do NOT search for similarly named worktrees or artifacts.
2. **Enter Worktree** — cd into the worktree and verify with pwd.

The resolved `feature` name is used for all artifact paths in this phase.
```

**Step 2: Verify**

Read the modified file and confirm inline discovery logic is replaced with a reference.

---

### Task 4: Add Assert Worktree to plan/3-checkpoint.md

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/plan/phases/3-checkpoint.md:1-5`

**Step 1: Add Assert Worktree before the first write**

Replace lines 1-5:

```
# 3. Checkpoint

## 1. Save Plan

Save to `.beastmode/state/plan/YYYY-MM-DD-<feature-name>.md`
```

With:

```
# 3. Checkpoint

## 0. Assert Worktree

Before any writes, call [worktree-manager.md](../_shared/worktree-manager.md) → "Assert Worktree". If it fails, STOP.

## 1. Save Plan

Save to `.beastmode/state/plan/YYYY-MM-DD-<feature>.md` where `<feature>` is the worktree directory name.
```

**Step 2: Verify**

Read the modified file.

---

### Task 5: Update implement/0-prime.md to reference shared derivation

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/implement/phases/0-prime.md:20-41`

**Step 1: Replace the Discover and Enter section**

Replace lines 20-41:

```
## 3. Discover and Enter Feature Worktree

**MANDATORY — do not skip this step.**

Resolve the feature name and enter the worktree:

1. If arguments contain a state file path → extract feature name from filename (strip date prefix and `.md`)
2. If no arguments → scan `.beastmode/worktrees/` for directories:
   - Exactly one → use it automatically
   - Multiple → list with branch names, ask user to pick via `AskUserQuestion`
   - Zero → print: "No active worktrees found. Run /design to start a new feature, or provide a state file path as argument." and STOP
3. Enter the worktree:

    worktree_path=".beastmode/worktrees/$feature"
    if [ ! -d "$worktree_path" ]; then
      echo "Error: Worktree not found at $worktree_path"
      exit 1
    fi
    cd "$worktree_path"
    pwd  # confirm you are in the worktree

See [worktree-manager.md](../_shared/worktree-manager.md) for full reference.
```

With:

```
## 3. Discover and Enter Feature Worktree

**MANDATORY — do not skip this step.**

Follow [worktree-manager.md](../_shared/worktree-manager.md):

1. **Discover Feature** — resolve feature name from arguments or filesystem scan. Uses "Derive Feature Name" for extraction. Do NOT search for similarly named worktrees or artifacts.
2. **Enter Worktree** — cd into the worktree and verify with pwd.

The resolved `feature` name is used for all artifact paths in this phase.
```

**Step 2: Verify**

Read the modified file.

---

### Task 6: Add Assert Worktree to implement/3-checkpoint.md

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/implement/phases/3-checkpoint.md:1-5`

**Step 1: Add Assert Worktree before the first write**

Replace lines 1-5:

```
# 3. Checkpoint

## 1. Save Deviation Log

If deviations were tracked during execution, save to `.beastmode/state/implement/YYYY-MM-DD-<feature>-deviations.md`:
```

With:

```
# 3. Checkpoint

## 0. Assert Worktree

Before any writes, call [worktree-manager.md](../_shared/worktree-manager.md) → "Assert Worktree". If it fails, STOP.

## 1. Save Deviation Log

If deviations were tracked during execution, save to `.beastmode/state/implement/YYYY-MM-DD-<feature>-deviations.md` where `<feature>` is the worktree directory name:
```

**Step 2: Verify**

Read the modified file.

---

### Task 7: Update validate/0-prime.md to reference shared derivation

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/validate/phases/0-prime.md:20-43`

**Step 1: Replace the Discover and Enter section**

Replace lines 20-43:

```
## 3. Discover and Enter Feature Worktree

**MANDATORY — do not skip this step.**

Resolve the feature name and enter the worktree:

1. If arguments contain a state file path → extract feature name from filename (strip date prefix and `.md`)
2. If no arguments → scan `.beastmode/worktrees/` for directories:
   - Exactly one → use it automatically
   - Multiple → list with branch names, ask user to pick via `AskUserQuestion`
   - Zero → print: "No active worktrees found. Run /design to start a new feature, or provide a state file path as argument." and STOP
3. Enter the worktree:

```bash
worktree_path=".beastmode/worktrees/$feature"
if [ ! -d "$worktree_path" ]; then
  echo "Error: Worktree not found at $worktree_path"
  exit 1
fi
cd "$worktree_path"
pwd  # confirm you are in the worktree
```

See [worktree-manager.md](../_shared/worktree-manager.md) for full reference.
```

With:

```
## 3. Discover and Enter Feature Worktree

**MANDATORY — do not skip this step.**

Follow [worktree-manager.md](../_shared/worktree-manager.md):

1. **Discover Feature** — resolve feature name from arguments or filesystem scan. Uses "Derive Feature Name" for extraction. Do NOT search for similarly named worktrees or artifacts.
2. **Enter Worktree** — cd into the worktree and verify with pwd.

The resolved `feature` name is used for all artifact paths in this phase.
```

**Step 2: Verify**

Read the modified file.

---

### Task 8: Add Assert Worktree to validate/3-checkpoint.md

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/validate/phases/3-checkpoint.md:1-5`

**Step 1: Add Assert Worktree before the first write**

Replace lines 1-5:

```
# 3. Checkpoint

## 1. Save Report

Save to `.beastmode/state/validate/YYYY-MM-DD-<feature>.md`
```

With:

```
# 3. Checkpoint

## 0. Assert Worktree

Before any writes, call [worktree-manager.md](../_shared/worktree-manager.md) → "Assert Worktree". If it fails, STOP.

## 1. Save Report

Save to `.beastmode/state/validate/YYYY-MM-DD-<feature>.md` where `<feature>` is the worktree directory name.
```

**Step 2: Verify**

Read the modified file.

---

### Task 9: Add Assert Worktree + absolute path injection to retro.md

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/_shared/retro.md:1-42`

**Step 1: Add Assert Worktree pre-flight before Context Reconciliation**

Replace lines 22-41 (the `---` separator through the Context Walker session context):

```
---

## Context Reconciliation

### 3. Spawn Context Walker

Launch 1 agent:

**Context Walker** — read prompt from `agents/retro-context.md`

Include in agent prompt:

```
## Session Context
- **Phase**: {current phase}
- **Feature**: {feature name}
- **Artifact**: {path to new state artifact}
- **L1 context path**: `.beastmode/context/{PHASE}.md`
- **Worktree root**: {current working directory}
```
```

With:

```
---

## Pre-Flight

### 2.5. Assert Worktree

Before spawning any agents, call [worktree-manager.md](worktree-manager.md) → "Assert Worktree". If it fails, print "Retro skipped: not in a worktree." and proceed to next checkpoint step.

Capture the worktree root as an absolute path:

```bash
worktree_root=$(pwd)
```

All agent writes MUST use `$worktree_root` as the base path for `.beastmode/context/` and `.beastmode/meta/` operations.

---

## Context Reconciliation

### 3. Spawn Context Walker

Launch 1 agent:

**Context Walker** — read prompt from `agents/retro-context.md`

Include in agent prompt:

```
## Session Context
- **Phase**: {current phase}
- **Feature**: {feature name}
- **Artifact**: {path to new state artifact}
- **L1 context path**: `.beastmode/context/{PHASE}.md`
- **Worktree root**: {worktree_root absolute path}
- **IMPORTANT**: All file writes MUST be relative to the worktree root path above. Do NOT write to paths outside this directory.
```
```

**Step 2: Update Meta Walker session context similarly**

Replace lines 96-104 (Meta Walker session context):

```
```
## Session Context
- **Phase**: {current phase}
- **Feature**: {feature name}
- **L1 meta path**: `.beastmode/meta/{PHASE}.md`
- **Artifacts**: {list of state artifact paths}
- **Worktree root**: {current working directory}
```
```

With:

```
```
## Session Context
- **Phase**: {current phase}
- **Feature**: {feature name}
- **L1 meta path**: `.beastmode/meta/{PHASE}.md`
- **Artifacts**: {list of state artifact paths}
- **Worktree root**: {worktree_root absolute path}
- **IMPORTANT**: All file writes MUST be relative to the worktree root path above. Do NOT write to paths outside this directory.
```
```

**Step 3: Verify**

Read the complete retro.md and confirm:
- Assert Worktree section exists before Context Reconciliation
- worktree_root captured as absolute path
- Both agent session contexts use `{worktree_root absolute path}` with IMPORTANT instruction

---

### Task 10: Rewrite release/0-prime.md and release/1-execute.md for two-phase split

**Wave:** 3
**Depends on:** Task 0, Task 9

**Files:**
- Modify: `skills/release/phases/0-prime.md:20-33`
- Modify: `skills/release/phases/1-execute.md:1-9`

**Step 1: Update release/0-prime.md worktree discovery**

Replace lines 20-33:

```
## 3. Load Artifacts

Find worktree path and branch from active worktrees:
- Design doc path
- Plan doc path
- Validation report path

```bash
# Find active feature worktree
worktree_line=$(git worktree list | grep ".beastmode/worktrees/" | head -1)
worktree_path=$(echo "$worktree_line" | awk '{print $1}')
worktree_branch=$(echo "$worktree_line" | grep -o '\[.*\]' | tr -d '[]')
```
```

With:

```
## 3. Discover and Enter Feature Worktree

**MANDATORY — do not skip this step.**

Follow [worktree-manager.md](../_shared/worktree-manager.md):

1. **Discover Feature** — resolve feature name from arguments or filesystem scan. Uses "Derive Feature Name" for extraction. Do NOT search for similarly named worktrees or artifacts.
2. **Enter Worktree** — cd into the worktree and verify with pwd.

## 4. Load Artifacts

From the worktree, locate:
- Design doc path (`.beastmode/state/design/YYYY-MM-DD-<feature>.md`)
- Plan doc path (`.beastmode/state/plan/YYYY-MM-DD-<feature>.md`)
- Validation report path (`.beastmode/state/validate/YYYY-MM-DD-<feature>.md`)
```

**Step 2: Replace release/1-execute.md step 1 (Enter Worktree)**

Replace lines 1-9:

```
# 1. Execute

## 1. Enter Worktree

```bash
if [ -n "$worktree_path" ] && [ -d "$worktree_path" ]; then
  cd "$worktree_path"
fi
```
```

With:

```
# 1. Execute

## 0. Assert Worktree (Pre-Merge Phase)

All steps from here through step 8.5 (Phase Retro) MUST execute inside the worktree.

Call [worktree-manager.md](../_shared/worktree-manager.md) → "Assert Worktree". If it fails, STOP.

> **Transition boundary:** Steps 9-12 (Squash Merge through Plugin Marketplace Update) operate from the main repo, NOT the worktree. This is the only legitimate point where work leaves the worktree.
```

**Step 3: Verify**

Read both files and confirm:
- release/0-prime.md uses Discover Feature + Enter Worktree pattern
- release/1-execute.md has Assert Worktree as step 0 with explicit transition boundary note
- The silent fallback (`if [ -n ... ]`) is gone

---

### Task 11: Final cross-file verification

**Wave:** 4
**Depends on:** Task 1, Task 2, Task 3, Task 4, Task 5, Task 6, Task 7, Task 8, Task 9, Task 10

**Files:**
- Read: all modified files

**Step 1: Verify worktree-manager.md has all new sections**

Read `skills/_shared/worktree-manager.md` and confirm:
- [ ] "Derive Feature Name" section exists
- [ ] "Assert Worktree" section exists
- [ ] "Discover Feature" references Derive Feature Name
- [ ] "Create Worktree" references Derive Feature Name

**Step 2: Verify all checkpoints have Assert Worktree**

Read all `3-checkpoint.md` files and confirm each has `## 0. Assert Worktree`:
- [ ] `design/phases/3-checkpoint.md`
- [ ] `plan/phases/3-checkpoint.md`
- [ ] `implement/phases/3-checkpoint.md`
- [ ] `validate/phases/3-checkpoint.md`
- [ ] `release/phases/1-execute.md` (step 0)

**Step 3: Verify all 0-prime files reference shared operations**

Read all `0-prime.md` files and confirm they reference worktree-manager.md:
- [ ] `plan/phases/0-prime.md` — no inline discovery logic
- [ ] `implement/phases/0-prime.md` — no inline discovery logic
- [ ] `validate/phases/0-prime.md` — no inline discovery logic
- [ ] `release/phases/0-prime.md` — uses Discover Feature + Enter Worktree

**Step 4: Verify retro.md has belt + suspenders**

Read `skills/_shared/retro.md` and confirm:
- [ ] Assert Worktree before spawning agents
- [ ] worktree_root captured as absolute path
- [ ] Both agent contexts include absolute path + IMPORTANT instruction

**Step 5: Verify no inline worktree creation or entry logic remains**

Grep all phase files for patterns that indicate inline worktree logic:
- `git worktree add` should only appear in worktree-manager.md
- `strip date prefix` should only appear in worktree-manager.md
- `if [ ! -d "$worktree_path" ]` should only appear in worktree-manager.md
