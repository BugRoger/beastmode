# Worktree Session Discovery Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Add worktree discovery logic so phases can find and enter the correct feature worktree in a new session.

**Architecture:** Add a "Discover Feature" section to the shared worktree-manager.md. Update the 3 phase 0-prime files (plan, implement, validate) to reference the discovery flow instead of hardcoded `feature="<feature-name>"`.

**Tech Stack:** Markdown prompt files (Claude Code plugin system)

**Design Doc:** [.beastmode/state/design/2026-03-04-worktree-session-discovery.md](.beastmode/state/design/2026-03-04-worktree-session-discovery.md)

---

### Task 0: Add "Discover Feature" section to worktree-manager.md

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/_shared/worktree-manager.md:1-39`

**Step 1: Add Discover Feature section**

Insert a new `## Discover Feature` section between the file header and `## Create Worktree`. This section handles three cases: argument provided (extract feature name from filename), no argument with worktrees on disk (list + prompt), no argument with zero worktrees (guidance error).

New section content to insert after line 2 (`Shared worktree operations...`):

```markdown
## Discover Feature

Used by: `/plan`, `/implement`, `/validate` 0-prime — before entering worktree.

Resolves the feature name from arguments or filesystem scan.

**Case 1: Argument provided** — extract feature name from the state file path:

\`\`\`bash
# Input: .beastmode/state/design/2026-03-04-worktree-session-discovery.md
# Output: worktree-session-discovery
feature=$(basename "$argument" .md | sed 's/^[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}-//')
\`\`\`

**Case 2: No argument, worktrees exist** — scan and prompt:

\`\`\`bash
ls .beastmode/worktrees/
\`\`\`

- If exactly one directory → use it automatically
- If multiple directories → list all with branch names using `AskUserQuestion`, let user pick
- Format: `1. <feature-name> (feature/<feature-name>)`

**Case 3: No argument, zero worktrees** — print guidance:

\`\`\`
No active worktrees found. Run /design to start a new feature,
or provide a state file path as argument.
\`\`\`

After discovery, pass the resolved `feature` name to "Enter Worktree" below.
```

**Step 2: Verify**

Read the file and confirm:
- "Discover Feature" section is between the header and "Create Worktree"
- All three cases are documented
- The "Enter Worktree" section still follows unchanged

---

### Task 1: Update plan 0-prime.md to use discovery flow

**Wave:** 2
**Parallel-safe:** true
**Depends on:** Task 0

**Files:**
- Modify: `skills/plan/phases/0-prime.md:25-46`

**Step 1: Replace inline worktree logic with discovery reference**

Replace the current `## 5. Enter Feature Worktree` section (lines 25-46) with:

```markdown
## 5. Discover and Enter Feature Worktree

**MANDATORY — do not skip this step.**

Resolve the feature name and enter the worktree:

1. If arguments contain a state file path → extract feature name from filename (strip date prefix and `.md`)
2. If no arguments → scan `.beastmode/worktrees/` for directories:
   - Exactly one → use it automatically
   - Multiple → list with branch names, ask user to pick via `AskUserQuestion`
   - Zero → print: "No active worktrees found. Run /design to start a new feature, or provide a state file path as argument." and STOP
3. Enter the worktree:

\`\`\`bash
worktree_path=".beastmode/worktrees/$feature"
if [ ! -d "$worktree_path" ]; then
  echo "Error: Worktree not found at $worktree_path"
  exit 1
fi
cd "$worktree_path"
pwd  # confirm you are in the worktree
\`\`\`

See @../_shared/worktree-manager.md for full reference.
```

**Step 2: Verify**

Read the file and confirm:
- The discovery logic is present (3 cases: argument, scan, zero)
- The enter logic still checks directory exists before cd
- The @import reference to worktree-manager.md is preserved

---

### Task 2: Update implement 0-prime.md to use discovery flow

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/implement/phases/0-prime.md:18-35`

**Step 1: Replace inline worktree logic with discovery reference**

Replace the current `## 4. Enter Feature Worktree` section (lines 18-35) with:

```markdown
## 4. Discover and Enter Feature Worktree

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

See @../_shared/worktree-manager.md for full reference.
```

**Step 2: Verify**

Read the file and confirm the discovery logic is present and the remaining steps (5-7) are unchanged.

---

### Task 3: Update validate 0-prime.md to use discovery flow

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `skills/validate/phases/0-prime.md:13-32`

**Step 1: Replace inline worktree logic with discovery reference**

Replace the current `## 3. Enter Feature Worktree` section (lines 13-32) with:

```markdown
## 3. Discover and Enter Feature Worktree

**MANDATORY — do not skip this step.**

Resolve the feature name and enter the worktree:

1. If arguments contain a state file path → extract feature name from filename (strip date prefix and `.md`)
2. If no arguments → scan `.beastmode/worktrees/` for directories:
   - Exactly one → use it automatically
   - Multiple → list with branch names, ask user to pick via `AskUserQuestion`
   - Zero → print: "No active worktrees found. Run /design to start a new feature, or provide a state file path as argument." and STOP
3. Enter the worktree:

\`\`\`bash
worktree_path=".beastmode/worktrees/$feature"
if [ ! -d "$worktree_path" ]; then
  echo "Error: Worktree not found at $worktree_path"
  exit 1
fi
cd "$worktree_path"
pwd  # confirm you are in the worktree
\`\`\`

See @../_shared/worktree-manager.md for full reference.
```

**Step 2: Verify**

Read the file and confirm the discovery logic is present and step 4 (Identify Test Strategy) is unchanged.
