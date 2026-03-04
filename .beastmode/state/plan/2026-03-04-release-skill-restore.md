# Release Skill Restore — Implementation Plan

**Goal:** Replace the 4 current skeletal release phase files with rich functionality covering version detection, commit categorization, changelog generation, interactive merge options, git tagging, and plugin version bumping.

**Architecture:** Modify 4 existing files in `skills/release/phases/` plus update `SKILL.md` description. No new files created — all logic fits within the standardized 0-3 anatomy. Key design move: interactive merge options and git tagging live in Phase 1 (execute), not Phase 3.

**Tech Stack:** Markdown skill files, bash commands, AskUserQuestion for merge options

**Design Doc:** `.beastmode/state/design/2026-03-04-release-skill-restore.md`

---

## Task 0: Update SKILL.md Description

**Files:**
- Modify: `skills/release/SKILL.md`

**Step 1: Update description and phase labels**

Replace YAML frontmatter description with:
```yaml
---
name: release
description: Create changelogs and release notes — releasing, documenting, shipping. Use after validate. Detects version, categorizes commits, generates changelog, commits, merges or creates PR.
---
```

Update phase listing to:
```markdown
0. [Prime](phases/0-prime.md) — Load artifacts, determine version
1. [Execute](phases/1-execute.md) — Categorize, changelog, commit, merge/PR, tag
2. [Validate](phases/2-validate.md) — Verify release completeness
3. [Checkpoint](phases/3-checkpoint.md) — Retro, status update
```

**Step 2: Verify**

Run: `cat skills/release/SKILL.md`
Expected: Updated descriptions visible, 4 phases listed

---

## Task 1: Rewrite 0-prime.md with Version Detection

**Files:**
- Modify: `skills/release/phases/0-prime.md`

**Step 1: Replace entire file with version detection logic**

New content:
- Announce skill
- Load `.beastmode/context/RELEASE.md` and `.beastmode/meta/RELEASE.md`
- Load artifacts from status file (design doc, plan doc, validation report)
- Enter worktree via status file path extraction
- Determine version:
  - `git describe --tags --abbrev=0` to find last tag (default `v0.0.0`)
  - `git log <last-tag>..HEAD --oneline` to list commits
  - Detect: any `BREAKING CHANGE` → major; any `feat:` → minor; otherwise → patch
  - Present suggested version via AskUserQuestion, allow override

**Step 2: Verify**

Run: `grep -c "Determine Version" skills/release/phases/0-prime.md`
Expected: 1

---

## Task 2: Rewrite 1-execute.md with Full Release Logic

**Files:**
- Modify: `skills/release/phases/1-execute.md`

**Step 1: Replace entire file with 9-section execute phase**

Sections:
1. **Categorize Commits** — Parse conventional commits into: Breaking Changes, Features, Fixes, Docs, Chores
2. **Generate Release Notes** — Save to `.beastmode/state/release/YYYY-MM-DD-vX.Y.Z.md` with Highlights, Breaking Changes, Features, Fixes, Full Changelog
3. **Update CHANGELOG.md** — Prepend new section if file exists
4. **Bump Plugin Version** — Update `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`
5. **Stage All Changes** — `git add -A`
6. **Create Unified Commit** — `feat(<topic>): <summary>` with cycle artifact references
7. **Present Merge Options** — AskUserQuestion with 4 options:
   - Merge locally (merge to main, delete worktree/branch)
   - Push and create PR (formatted body with artifacts)
   - Keep as-is (print manual commands)
   - Discard (require typed confirmation)
8. **Git Tagging** — `git tag -a vX.Y.Z -m "Release X.Y.Z"` + suggest push
9. **Plugin Marketplace Update** — Suggest `claude plugin marketplace update` commands

**Step 2: Verify**

Run: `grep -c "^## " skills/release/phases/1-execute.md`
Expected: 9

---

## Task 3: Rewrite 2-validate.md with Release Verification

**Files:**
- Modify: `skills/release/phases/2-validate.md`

**Step 1: Replace with 5-point verification**

Sections:
1. Verify release notes file exists in `.beastmode/state/release/`
2. Verify CHANGELOG.md updated (if exists)
3. Verify plugin version files bumped
4. Verify unified commit created
5. Validation gate: stop if any check fails, proceed if clean

**Step 2: Verify**

Run: `grep -c "Verify" skills/release/phases/2-validate.md`
Expected: 4 or more

---

## Task 4: Rewrite 3-checkpoint.md for Retro Only

**Files:**
- Modify: `skills/release/phases/3-checkpoint.md`

**Step 1: Replace with retro-focused checkpoint**

Sections:
1. Update status file (add Release phase entry, remove Worktree section if merged/discarded)
2. Capture learnings in `.beastmode/meta/RELEASE.md`
3. Session tracking (`@../_shared/session-tracking.md`)
4. Context report (`@../_shared/context-report.md`)
5. Complete message

Key change: NO merge/cleanup logic — that moved to Phase 1.

**Step 2: Verify**

Run: `grep "merge\|worktree remove\|branch -d" skills/release/phases/3-checkpoint.md`
Expected: No matches (merge logic is in 1-execute.md now)
