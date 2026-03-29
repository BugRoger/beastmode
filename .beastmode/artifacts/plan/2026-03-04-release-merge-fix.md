# Release Merge Fix Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Eliminate constant merge conflicts in /release by switching from rebase to merge-only and reducing version file sprawl from 5 to 3.

**Architecture:** Two changes — (1) replace `git rebase origin/main` with `git merge` on main, so conflicts resolve once instead of per-commit, and (2) remove hardcoded version strings from README.md and PRODUCT.md, leaving only plugin.json, marketplace.json, and session-start.sh as version-bearing files.

**Tech Stack:** Git, markdown skill files

**Design Doc:** [.beastmode/state/design/2026-03-04-release-merge-fix.md](../design/2026-03-04-release-merge-fix.md)

---

### Task 0: Update release execute phase (rebase removal, version update trim, PRODUCT.md rollup fix)

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `skills/release/phases/1-execute.md`

**Step 1: Replace step 2 (Sync with Main) with WIP Commit**

Replace the entire `## 2. Sync with Main` section (lines 12-28):

```markdown
Rebase the feature branch onto main to pick up the latest version before bumping.

```bash
git fetch origin main
git rebase origin/main
```

If rebase conflicts on version files (plugin.json, marketplace.json, session-start.sh), accept main's version:

```bash
git checkout --theirs .claude-plugin/plugin.json .claude-plugin/marketplace.json hooks/session-start.sh
git add .claude-plugin/plugin.json .claude-plugin/marketplace.json hooks/session-start.sh
git rebase --continue
```

Report: "Synced with main. Feature branch is now up-to-date."
```

With:

```markdown
Stage and commit all uncommitted changes from implement/validate phases so the worktree is clean for merge.

```bash
git add -A
if ! git diff --cached --quiet; then
  git commit -m "WIP: pre-release changes"
fi
```

Report: "Worktree clean. Ready for release."
```

Keep the heading as `## 2. WIP Commit` (rename from "Sync with Main").

**Step 2: Remove "Current Version" update from step 8.5**

In the `## 8.5. Update PRODUCT.md` section, delete item 6:

```
6. Update **Current Version** to the new version and release count
```

The numbered list should end at item 5 ("Update **How It Works** section if the release changes workflow mechanics").

**Step 3: Update step 3 comment**

In `## 3. Determine Version`, the comment on line 33 says `(post-rebase, this is main's version)`. Change it to:

```bash
# Read current version from plugin.json
```

Remove the parenthetical since there's no rebase anymore.

**Step 4: Verify**

Read `skills/release/phases/1-execute.md` and confirm:
- No `git rebase` command anywhere in the file
- Step 2 heading is "WIP Commit"
- Step 7 lists only plugin.json, marketplace.json, session-start.sh (already correct, no change)
- Step 8.5 has no reference to "Current Version"
- No `post-rebase` comment in step 3

---

### Task 1: Remove version badge from README.md

**Wave:** 2
**Parallel-safe:** true
**Depends on:** -

**Files:**
- Modify: `README.md:11`

**Step 1: Delete the version badge line**

Remove this line:

```markdown
[![Version](https://img.shields.io/badge/version-0.6.0-blue?style=flat-square)](https://github.com/BugRoger/beastmode)
```

Keep the GitHub stars and License badge lines intact (lines 9-10).

**Step 2: Verify**

Read README.md and confirm:
- No line containing `version-` or `badge/version` exists
- Stars and License badges remain on consecutive lines

---

### Task 2: Remove Current Version section from PRODUCT.md

**Wave:** 2
**Depends on:** -

**Files:**
- Modify: `.beastmode/PRODUCT.md:35-36`

**Step 1: Delete the Current Version section**

Remove these lines from the end of PRODUCT.md:

```markdown
## Current Version

v0.6.0 — 19 releases
```

The file should end after the `## How It Works` paragraph (with a trailing newline).

**Step 2: Verify**

Read `.beastmode/PRODUCT.md` and confirm:
- No `## Current Version` heading exists
- File ends cleanly after "How It Works" content

---

### Task 3: Remove fast-forward note from worktree manager

**Wave:** 2
**Depends on:** -

**Files:**
- Modify: `skills/_shared/worktree-manager.md:86`

**Step 1: Delete the fast-forward note**

Remove this blockquote from the "Option 1: Merge Locally" section:

```markdown
> **Note:** If the feature branch was rebased onto main (as done by `/release` step 2), this merge is typically a fast-forward.
```

Leave no blank line gap — the `### Option 1: Merge Locally` heading should be followed directly by the code block.

**Step 2: Verify**

Read `skills/_shared/worktree-manager.md` and confirm:
- No mention of "fast-forward" in the file
- "Option 1: Merge Locally" flows directly into the code block

---

### Task 4: Update release meta learnings

**Wave:** 3
**Depends on:** Task 0

**Files:**
- Modify: `.beastmode/meta/RELEASE.md`

**Step 1: Update first learning bullet**

Replace:
```markdown
- **Version conflicts are structural, not accidental** (2026-03-04): Worktrees branch from older commits, so version files are always stale. The release flow must sync with main before bumping. Also, `hooks/session-start.sh` was missing from the version bump list — all version-bearing files must be enumerated explicitly.
```

With:
```markdown
- **Version conflicts are structural, not accidental** (2026-03-04): Worktrees branch from older commits, so version files are always stale. Version-bearing files are limited to 3 (plugin.json, marketplace.json, session-start.sh) to minimize conflict surface.
```

**Step 2: Replace third learning bullet**

Replace:
```markdown
- **Unified cycle commit requires WIP commit before rebase** (2026-03-04): The release sync step (`git rebase origin/main`) fails if the worktree has unstaged changes from the implement/validate phases. Solution: commit all WIP changes first, then rebase. The WIP commit gets squashed into the final release commit via `git commit --amend` or left as a separate pre-release commit. README badge version is a 5th version-bearing file to update alongside plugin.json, marketplace.json, and session-start.sh.
```

With:
```markdown
- **Merge-only eliminates rebase conflicts** (2026-03-04): Rebasing replays each commit, so a single conflict can recur N times. Merge resolves everything once. Combined with reducing version files from 5 to 3 (dropping README badge and PRODUCT.md version), the release merge step is now conflict-free for typical feature branches.
```

**Step 3: Verify**

Read `.beastmode/meta/RELEASE.md` and confirm:
- No reference to "rebase" in learnings
- No reference to "README badge" or "5th version-bearing file"
- New learning about merge-only strategy exists
