# Session Status Tracking Implementation Plan

**Goal:** Add session status tracking to all workflow phases, recording Claude session paths for traceability

**Architecture:** Each phase skill appends to `.agents/status/YYYY-MM-DD-<feature>.md` on completion, using a shared reference file for session detection logic

**Tech Stack:** Markdown skills, bash for session detection, jq for JSONL parsing

**Design Doc:** [.agents/design/2026-03-01-session-tracking.md](.agents/design/2026-03-01-session-tracking.md)

---

## Task 0: Create Shared Session Tracking Reference

**Files:**
- Create: `skills/references/session-tracking.md`

**Step 1: Create the shared reference file**

Create `skills/references/session-tracking.md`:

```markdown
# Session Status Tracking

## Session Detection

Get the Claude session JSONL path for the current session:

```bash
get_session_path() {
  local FIRST_MSG="$1"  # Unique text from skill's initial arguments
  local PROJECT_PATH="$HOME/.claude/projects/$(pwd | sed 's|/|-|g; s|\.|-|g')"

  for f in "$PROJECT_PATH"/*.jsonl; do
    if grep "$FIRST_MSG" "$f" 2>/dev/null | jq -e 'select(.parentUuid == null)' >/dev/null 2>&1; then
      echo "$f"
      return
    fi
  done
}
```

## Status File Update

On phase completion, update `.agents/status/YYYY-MM-DD-<feature>.md`:

1. **Create file if not exists** with header:
   ```markdown
   # Session: <feature> — YYYY-MM-DD

   ## Context
   - **Feature**: <feature-name>
   - **Related artifacts**:
     - Design: .agents/design/YYYY-MM-DD-<feature>.md
     - Plan: .agents/plan/YYYY-MM-DD-<feature>.md

   ### Executed Phases

   ---

   ## Findings for Retro
   <!-- Accumulated across phases -->
   ```

2. **Add to Executed Phases list**:
   ```markdown
   - [<Phase> — HH:MM](#phase--hhmm) · `<session-path>`
   ```

3. **Append phase section** before "Findings for Retro":
   ```markdown
   ## <Phase> — HH:MM
   **Claude Session**: `<session-path>`
   **Summary:** <what was accomplished>
   **Decisions:** <key decisions made>
   **Issues:** <problems encountered or "None">
   ```

## Feature Name Inference

| Phase | Source |
|-------|--------|
| `/design` | From arguments or user-provided topic |
| `/plan` | From design doc filename |
| `/implement` | From plan doc filename |
| `/verify` | From recent status file or explicit |
| `/release` | From recent status file or explicit |
```

**Step 2: Commit**

```bash
git add skills/references/session-tracking.md
git commit -m "feat: add shared session tracking reference"
```

---

## Task 1: Update /design Skill

**Files:**
- Modify: `skills/design/SKILL.md`

**Step 1: Add session tracking reference import**

Add after the frontmatter (line 4):

```markdown
@../references/session-tracking.md
```

**Step 2: Add completion instructions**

Add new section before "## Workflow" (around line 96):

```markdown
## Session Status Tracking

**On completion (after writing design doc):**

1. Infer feature name from the design doc filename
2. Get session path using `get_session_path()` with a unique part of your initial arguments
3. Create/update `.agents/status/YYYY-MM-DD-<feature>.md`
4. Add entry to "Executed Phases" list
5. Append Design phase section with Summary/Decisions/Issues

**Example session detection:**
```bash
# Use unique text from your /design arguments
SESSION_PATH=$(get_session_path "your unique argument text here")
```
```

**Step 3: Commit**

```bash
git add skills/design/SKILL.md
git commit -m "feat(design): add session status tracking on completion"
```

---

## Task 2: Update /plan Skill

**Files:**
- Modify: `skills/plan/SKILL.md`

**Step 1: Add session tracking reference import**

Add after the frontmatter (line 4):

```markdown
@../references/session-tracking.md
```

**Step 2: Add completion instructions**

Add new section before "## Workflow" (around line 205):

```markdown
## Session Status Tracking

**On completion (after writing plan doc):**

1. Extract feature name from plan doc filename (e.g., `2026-03-01-session-tracking.md` → `session-tracking`)
2. Get session path using `get_session_path()` with a unique part of your initial arguments
3. Update `.agents/status/YYYY-MM-DD-<feature>.md`
4. Add entry to "Executed Phases" list
5. Append Plan phase section with Summary/Decisions/Issues

**Feature extraction from path:**
```bash
# From .agents/plan/2026-03-01-session-tracking.md
FEATURE=$(basename "$PLAN_PATH" .md | sed 's/^[0-9-]*//')
DATE=$(basename "$PLAN_PATH" .md | grep -oE '^[0-9]{4}-[0-9]{2}-[0-9]{2}')
```
```

**Step 3: Commit**

```bash
git add skills/plan/SKILL.md
git commit -m "feat(plan): add session status tracking on completion"
```

---

## Task 3: Update /implement Skill

**Files:**
- Modify: `skills/implement/SKILL.md`

**Step 1: Add session tracking reference import**

Add after the frontmatter (line 4):

```markdown
@../references/session-tracking.md
```

**Step 2: Add completion instructions**

Add new section before "## Workflow" (around line 109):

```markdown
## Session Status Tracking

**On completion (Phase 4: Complete, after merge):**

1. Extract feature name from plan doc filename
2. Get session path using `get_session_path()` with a unique part of your initial arguments
3. Update `.agents/status/YYYY-MM-DD-<feature>.md`
4. Add entry to "Executed Phases" list
5. Append Implement phase section with:
   - Summary: tasks completed, merge status
   - Decisions: any implementation choices made
   - Issues: blockers encountered, how resolved
```

**Step 3: Commit**

```bash
git add skills/implement/SKILL.md
git commit -m "feat(implement): add session status tracking on completion"
```

---

## Task 4: Update /verify Skill

**Files:**
- Modify: `skills/verify/SKILL.md`

**Step 1: Replace stub with full implementation**

Replace entire file content:

```markdown
---
name: verify
description: Run verification and create reports. Outputs to .agents/verify/.
---

# /verify

@../references/session-tracking.md

Verification and testing reports.

## Overview

Run tests, check coverage, verify the implementation matches the plan.

**Announce:** "I'm using the /verify skill to verify this implementation."

## Arguments

```
/verify [feature-name]
```

If no feature provided, look for most recent status file in `.agents/status/`.

## Process

1. Identify feature from argument or recent status file
2. Run test suite
3. Check test coverage
4. Verify against plan requirements
5. Write report to `.agents/verify/YYYY-MM-DD-<feature>.md`

## Session Status Tracking

**On completion:**

1. Get feature name from argument or infer from recent status
2. Get session path using `get_session_path()`
3. Update `.agents/status/YYYY-MM-DD-<feature>.md`
4. Add entry to "Executed Phases" list
5. Append Verify phase section with test results summary

## Output

Writes to: `.agents/verify/`

## Workflow

Part of: bootstrap → prime → research → design → plan → implement → status → **verify** → release → retro
```

**Step 2: Commit**

```bash
git add skills/verify/SKILL.md
git commit -m "feat(verify): implement skill with session status tracking"
```

---

## Task 5: Update /release Skill

**Files:**
- Modify: `skills/release/SKILL.md`

**Step 1: Replace stub with full implementation**

Replace entire file content:

```markdown
---
name: release
description: Create changelogs and release notes. Outputs to .agents/release/.
---

# /release

@../references/session-tracking.md

Release management and changelogs.

## Overview

Create release notes, update changelog, bump version.

**Announce:** "I'm using the /release skill to prepare this release."

## Arguments

```
/release [version]
```

If no version provided, suggest next version based on changes.

## Process

1. Analyze commits since last release
2. Generate changelog entries
3. Create release notes
4. Update version (if applicable)
5. Write to `.agents/release/YYYY-MM-DD-<version>.md`

## Session Status Tracking

**On completion:**

1. Get feature name from recent status file or current work
2. Get session path using `get_session_path()`
3. Update `.agents/status/YYYY-MM-DD-<feature>.md`
4. Add entry to "Executed Phases" list
5. Append Release phase section with version and changelog summary

## Output

Writes to: `.agents/release/`

## Workflow

Part of: bootstrap → prime → research → design → plan → implement → status → verify → **release** → retro
```

**Step 2: Commit**

```bash
git add skills/release/SKILL.md
git commit -m "feat(release): implement skill with session status tracking"
```

---

## Task 6: Update /retro Skill and Remove Template

**Files:**
- Delete: `skills/retro/templates/session-record.md`
- Modify: `skills/retro/SKILL.md`
- Modify: `skills/retro/references/retro.md`

**Step 1: Delete the template file**

```bash
rm skills/retro/templates/session-record.md
rmdir skills/retro/templates 2>/dev/null || true
```

**Step 2: Update retro.md to read from .agents/status/**

Edit `skills/retro/references/retro.md` line 9, change:

```markdown
1. **Find session records**: `ls .agents/status/*-session.md 2>/dev/null`
```

To:

```markdown
1. **Find session records**: `ls .agents/status/*.md 2>/dev/null`
```

**Step 3: Update SKILL.md Session Artifacts section**

The SKILL.md already references `.agents/status/` correctly (line 32-33). No changes needed there.

**Step 4: Commit**

```bash
git add -A skills/retro/
git commit -m "feat(retro): remove template, read status from .agents/status/"
```

---

## Task 7: Implement /status Skill as Viewer

**Files:**
- Modify: `skills/status/SKILL.md`

**Step 1: Replace stub with full implementation**

Replace entire file content:

```markdown
---
name: status
description: Track current project state and milestones. Reads/writes .agents/status/.
---

# /status

View and manage session status files.

## Overview

Display current session status, list all sessions, or show specific session details.

**Announce:** "I'm using the /status skill to check session status."

## Arguments

```
/status              # Show current/most recent session
/status list         # List all session files
/status <feature>    # Show specific session status
```

## Commands

### Default (no args)
Show the most recently modified status file in `.agents/status/`.

### list
List all status files with their features and dates:
```bash
ls -lt .agents/status/*.md 2>/dev/null
```

### <feature>
Show status for a specific feature:
```bash
cat .agents/status/*-<feature>.md 2>/dev/null
```

## Output Format

When displaying status, show:
- Feature name and date
- Executed phases with timestamps
- Current phase (last in list)
- Link to Claude session for each phase

## Output

Reads from: `.agents/status/`

## Workflow

Part of: bootstrap → prime → research → design → plan → implement → **status** → verify → release → retro
```

**Step 2: Commit**

```bash
git add skills/status/SKILL.md
git commit -m "feat(status): implement skill as session status viewer"
```

---

## Task 8: Create References Directory and Final Commit

**Files:**
- Create: `skills/references/` directory (if not exists)

**Step 1: Ensure references directory exists**

```bash
mkdir -p skills/references
```

**Step 2: Verify all files are committed**

```bash
git status
```

**Step 3: Final verification**

Check that all skills have the session tracking reference:
```bash
grep -l "session-tracking.md" skills/*/SKILL.md
```

Expected output should include: design, plan, implement, verify, release

**Step 4: Tag completion**

```bash
git log --oneline -10
```

Verify commits are in order:
1. feat: add shared session tracking reference
2. feat(design): add session status tracking on completion
3. feat(plan): add session status tracking on completion
4. feat(implement): add session status tracking on completion
5. feat(verify): implement skill with session status tracking
6. feat(release): implement skill with session status tracking
7. feat(retro): remove template, read status from .agents/status/
8. feat(status): implement skill as session status viewer
