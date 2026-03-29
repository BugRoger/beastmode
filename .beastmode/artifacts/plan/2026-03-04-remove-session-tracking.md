# Remove Session Tracking — Implementation Plan

**Goal:** Remove session JSONL tracking from beastmode. Replace status-file-based worktree discovery with direct `git worktree list` / path convention.

**Architecture:** Delete `session-tracking.md` and `.beastmode/sessions/`, update all checkpoint files to remove session tracking imports and status file updates, update all 0-prime files and worktree-manager to use `.beastmode/worktrees/<feature>` convention instead of status file parsing, simplify retro to skip session JSONL, clean up context docs.

**Tech Stack:** Markdown, bash (git worktree list)

**Design Doc:** `.beastmode/state/design/2026-03-04-remove-session-tracking.md`

---

## Task 0: Delete session-tracking utility and sessions directory

**Files:**
- Delete: `skills/_shared/session-tracking.md`
- Delete: `.beastmode/sessions/` (entire directory)

**Step 1: Delete session-tracking.md**
```bash
rm skills/_shared/session-tracking.md
```

**Step 2: Delete sessions directory**
```bash
rm -rf .beastmode/sessions/
```

**Step 3: Verify**
Run: `ls skills/_shared/session-tracking.md .beastmode/sessions/ 2>&1`
Expected: "No such file or directory" for both

---

## Task 1: Remove session tracking imports from all checkpoint files

**Files:**
- Modify: `skills/_shared/3-checkpoint-template.md`
- Modify: `skills/design/phases/3-checkpoint.md`
- Modify: `skills/plan/phases/3-checkpoint.md`
- Modify: `skills/implement/phases/3-checkpoint.md`
- Modify: `skills/validate/phases/3-checkpoint.md`
- Modify: `skills/release/phases/3-checkpoint.md`

**Step 1: Edit `skills/_shared/3-checkpoint-template.md`**

Remove the entire "Session Tracking" section:
```markdown
## 3. Session Tracking

@session-tracking.md
```

Renumber: "## 4. Context Report" → "## 3. Context Report", "## 5. Suggest Next Step" → "## 4. Suggest Next Step"

**Step 2: Edit `skills/design/phases/3-checkpoint.md`**

Remove "Update Status" section (writes to `sessions/status/`):
```markdown
## 2. Update Status

Update `.beastmode/sessions/status/YYYY-MM-DD-<topic>.md`:
...
```

Remove "Session Tracking" section:
```markdown
## 4. Session Tracking

@../_shared/session-tracking.md
```

Renumber remaining steps.

**Step 3: Edit `skills/plan/phases/3-checkpoint.md`**

Remove "Update Status" section:
```markdown
## 3. Update Status

Add Plan phase entry to status file.
```

Remove "Session Tracking" section:
```markdown
## 5. Session Tracking

@../_shared/session-tracking.md
```

Renumber remaining steps.

**Step 4: Edit `skills/implement/phases/3-checkpoint.md`**

Remove "Update Status" section:
```markdown
## 1. Update Status

Update `.beastmode/sessions/status/YYYY-MM-DD-<topic>.md`:
- Add Implement phase entry
- Record tasks completed
```

Remove "Session Tracking" section:
```markdown
## 3. Session Tracking

@../_shared/session-tracking.md
```

Renumber remaining steps.

**Step 5: Edit `skills/validate/phases/3-checkpoint.md`**

Remove "Session Tracking" section:
```markdown
## 3. Session Tracking

@../_shared/session-tracking.md
```

Renumber remaining steps.

**Step 6: Edit `skills/release/phases/3-checkpoint.md`**

Remove "Update Status" section:
```markdown
## 1. Update Status

Add Release phase entry to status file. Remove `## Worktree` section if merged or discarded.
```

Remove "Session Tracking" section:
```markdown
## 3. Session Tracking

@../_shared/session-tracking.md
```

Renumber remaining steps.

**Step 7: Verify**
Run: `grep -r "session-tracking" skills/`
Expected: No matches

---

## Task 2: Replace worktree discovery in 0-prime files

Replace all `sessions/status/` based worktree discovery with `.beastmode/worktrees/<feature>` convention.

**Files:**
- Modify: `skills/_shared/0-prime-template.md`
- Modify: `skills/_shared/worktree-manager.md`
- Modify: `skills/plan/phases/0-prime.md`
- Modify: `skills/implement/phases/0-prime.md`
- Modify: `skills/validate/phases/0-prime.md`
- Modify: `skills/release/phases/0-prime.md`

**Step 1: Update `skills/_shared/worktree-manager.md`**

Replace "Enter Worktree" bash block with:
```bash
feature="<feature-name>"
worktree_path=".beastmode/worktrees/$feature"

if [ ! -d "$worktree_path" ]; then
  echo "Error: Worktree not found at $worktree_path"
  exit 1
fi

cd "$worktree_path"
pwd
```

Remove "Status File Format" section and "Read Worktree from Status" section.

**Step 2: Update `skills/_shared/0-prime-template.md`**

Replace "Enter Cycle Worktree" bash block with:
```bash
# Derive feature from design/plan doc filename or arguments
feature="<feature-name>"
worktree_path=".beastmode/worktrees/$feature"

if [ -n "$worktree_path" ] && [ -d "$worktree_path" ]; then
  cd "$worktree_path"
  echo "Working in cycle worktree at $worktree_path"
fi
```

**Step 3: Update `skills/plan/phases/0-prime.md`**

Replace bash block with:
```bash
feature="<feature-name>"  # from design doc filename
worktree_path=".beastmode/worktrees/$feature"
if [ ! -d "$worktree_path" ]; then
  echo "Error: Worktree not found at $worktree_path"
  exit 1
fi
cd "$worktree_path"
pwd
```

**Step 4: Update `skills/implement/phases/0-prime.md`**

Same pattern as Step 3.

**Step 5: Update `skills/validate/phases/0-prime.md`**

Same pattern as Step 3.

**Step 6: Update `skills/release/phases/0-prime.md`**

Replace bash block with:
```bash
# Find active worktree
worktree_line=$(git worktree list | grep ".beastmode/worktrees/" | head -1)
worktree_path=$(echo "$worktree_line" | awk '{print $1}')
worktree_branch=$(echo "$worktree_line" | grep -o '\[.*\]' | tr -d '[]')
```

**Step 7: Verify**
Run: `grep -r "sessions/status" skills/`
Expected: No matches

---

## Task 3: Simplify retro to remove session JSONL references

**Files:**
- Modify: `skills/_shared/retro.md`
- Modify: `skills/_shared/retro/context-agent.md`
- Modify: `skills/_shared/retro/meta-agent.md`

**Step 1: Edit `skills/_shared/retro.md`**

In "## 1. Gather Phase Context", replace step 2 with:
```markdown
2. Read phase artifacts (design doc, plan doc) from `.beastmode/state/`
```

In "## 3. Spawn Review Agents", remove "Session JSONL" line from session context template.

**Step 2: Edit `skills/_shared/retro/context-agent.md`**

Remove:
```markdown
- Session JSONL (if available) for decisions made in conversation
```

**Step 3: Edit `skills/_shared/retro/meta-agent.md`**

Remove:
```markdown
- Session JSONL (if available) for actual conversation flow
- Phase timing from session tracking
```

**Step 4: Verify**
Run: `grep -ri "jsonl\|session file\|session path" skills/_shared/retro*`
Expected: No matches

---

## Task 4: Update status skill

**Files:**
- Modify: `skills/status/phases/1-display.md`

**Step 1: Rewrite status display**

Replace `sessions/status/` references with `git worktree list` and `.beastmode/state/` based lookups.

Default: show active worktrees + recent state files.
Feature: show state files matching feature name.

Remove "Links to Claude sessions for each phase" from display output.

**Step 2: Verify**
Run: `grep -r "sessions/status" skills/status/`
Expected: No matches

---

## Task 5: Update context docs

**Files:**
- Modify: `.beastmode/context/design/architecture.md`
- Modify: `.beastmode/context/plan/structure.md`
- Modify: `.beastmode/context/implement/agents.md`

**Step 1: Edit `architecture.md`**

Remove "Session JSONL Access for Retro Inspection" key decision block.

**Step 2: Edit `structure.md`**

Remove "session" from `_shared/` description. Remove `sessions/` from `.beastmode/` contents.

**Step 3: Edit `agents.md`**

Remove "Status file coordination" bullet.

**Step 4: Verify**
Run: `grep -ri "session jsonl\|sessions/" .beastmode/context/`
Expected: No matches

---

## Task 6: Final verification

**Step 1: Full sweep**
Run: `grep -r "sessions/status\|session-tracking\|Session JSONL\|session_path\|get_session_path\|Session Files\|Session Detection" . --include="*.md" | grep -v ".beastmode/state/" | grep -v node_modules`
Expected: No matches
