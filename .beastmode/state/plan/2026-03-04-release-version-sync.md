# Release Version Sync — Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Eliminate version conflicts during release merge by rebasing onto main before bumping version.

**Architecture:** Insert a "Sync with Main" step early in release 1-execute.md, switch version detection from git tags to plugin.json, and add hooks/session-start.sh to the version bump list. Optionally annotate worktree-manager.md about fast-forward after rebase.

**Tech Stack:** Markdown skill prompts, bash, git

**Design Doc:** `.beastmode/state/design/2026-03-04-release-version-sync.md`

---

### Task 0: Add "Sync with Main" step and renumber release 1-execute.md

**Wave:** 1
**Depends on:** `-`

**Files:**
- Modify: `skills/release/phases/1-execute.md`

**Step 1: Insert new step 2 after "Enter Worktree"**

After the existing `## 1. Enter Worktree` section, insert a new step 2 before the current step 2:

```markdown
## 2. Sync with Main

Rebase the feature branch onto main to pick up the latest version before bumping.

\`\`\`bash
git fetch origin main
git rebase origin/main
\`\`\`

If rebase conflicts on version files (plugin.json, marketplace.json, session-start.sh), accept main's version:

\`\`\`bash
git checkout --theirs .claude-plugin/plugin.json .claude-plugin/marketplace.json hooks/session-start.sh
git add .claude-plugin/plugin.json .claude-plugin/marketplace.json hooks/session-start.sh
git rebase --continue
\`\`\`

Report: "Synced with main. Feature branch is now up-to-date."
```

**Step 2: Renumber all subsequent steps**

Steps 2–10 become steps 3–11. Update all `## N.` headings accordingly:
- `## 2. Determine Version` → `## 3. Determine Version`
- `## 3. Categorize Commits` → `## 4. Categorize Commits`
- `## 4. Generate Release Notes` → `## 5. Generate Release Notes`
- `## 5. Update CHANGELOG.md` → `## 6. Update CHANGELOG.md`
- `## 6. Bump Plugin Version` → `## 7. Bump Version Files`
- `## 7. Commit Release Changes` → `## 8. Commit Release Changes`
- `## 8. Merge and Cleanup` → `## 9. Merge and Cleanup`
- `## 9. Git Tagging` → `## 10. Git Tagging`
- `## 10. Plugin Marketplace Update` → `## 11. Plugin Marketplace Update`

**Step 3: Verify**

Confirm the file has 11 steps numbered sequentially from 1 to 11.

---

### Task 1: Switch version detection from git tags to plugin.json

**Wave:** 1
**Depends on:** `Task 0`

**Files:**
- Modify: `skills/release/phases/1-execute.md` (step 3, formerly step 2)

**Step 1: Replace the "Determine Version" step content**

Replace the current version detection code block and logic in the new step 3 with:

```markdown
## 3. Determine Version

\`\`\`bash
# Read current version from plugin.json (post-rebase, this is main's version)
current_version=$(grep -o '"version": "[^"]*"' .claude-plugin/plugin.json | head -1 | cut -d'"' -f4)
echo "Current version: $current_version"

# List commits since last release tag for bump detection
last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
git log ${last_tag}..HEAD --oneline
\`\`\`

Detect version bump from commit messages:
- Any `BREAKING CHANGE` or `!:` suffix → **major** bump
- Any `feat:` or `feat(` prefix → **minor** bump
- Otherwise → **patch** bump

Increment from `$current_version` (not from tag). Present suggested version via AskUserQuestion with override option.
```

**Step 2: Verify**

Confirm step 3 reads version from `plugin.json` and increments from `$current_version`.

---

### Task 2: Add hooks/session-start.sh to version bump step

**Wave:** 1
**Depends on:** `Task 0`

**Files:**
- Modify: `skills/release/phases/1-execute.md` (step 7, formerly step 6)

**Step 1: Update the bump step to include session-start.sh**

Replace the content of the renamed step 7 ("Bump Version Files") with:

```markdown
## 7. Bump Version Files

Update version in all three files:
- `.claude-plugin/plugin.json` → `"version": "X.Y.Z"`
- `.claude-plugin/marketplace.json` → version in plugins array
- `hooks/session-start.sh` → banner line `BEASTMODE vX.Y.Z`
```

**Step 2: Verify**

Confirm step 7 lists all three files: plugin.json, marketplace.json, and session-start.sh.

---

### Task 3: Annotate worktree-manager.md about fast-forward after rebase

**Wave:** 2
**Depends on:** `-`

**Files:**
- Modify: `skills/_shared/worktree-manager.md`

**Step 1: Add fast-forward note to Option 1**

After the `### Option 1: Merge Locally` heading and before the code block, add:

```markdown
> **Note:** If the feature branch was rebased onto main (as done by `/release` step 2), this merge is typically a fast-forward.
```

**Step 2: Verify**

Confirm the note appears between the heading and the bash code block in Option 1.
