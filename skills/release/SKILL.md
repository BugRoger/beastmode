---
name: release
description: Create changelogs and release notes — releasing, documenting, shipping. Use after validate. Detects version, categorizes commits, generates changelog, commits, merges or creates PR.
---

# /release

Detect version, categorize commits, generate changelog, commit, merge or PR, tag.

<HARD-GATE>
No release without passing validation.
</HARD-GATE>

## Guiding Principles

- **Version computed from main, not worktree** — the worktree's plugin.json is stale; read current version post-merge from main
- **Squash merge preserves archive tag** — always tag the feature branch before squash merge so detailed commit history survives
- **Bump type auto-detected, not user-prompted** — commit message conventions determine major/minor/patch automatically
- **Warn-and-continue for non-blocking failures** — report problems, attempt fixes, only hard-stop on critical validation failures
- **All user input via `AskUserQuestion`** — freeform print-and-wait is invisible to HITL hooks; every question the user must answer goes through `AskUserQuestion`

## Phase 0: Prime

### 1. Resolve Epic Name

The epic name comes from the skill arguments. Use it directly for all artifact paths in this phase.

### 2. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does and what the user's role is.

### 3. Load Project Context

Read (if they exist):
- `.beastmode/context/RELEASE.md`

Follow L2 convention paths (`context/release/{domain}.md`) when relevant to the current topic.
Prior decisions, conventions, and learnings inform this phase — don't re-decide what's already been decided.

### 4. Load Artifacts

Locate:
- Design doc path (`.beastmode/artifacts/design/YYYY-MM-DD-<epic-name>.md`)
- Plan doc path (`.beastmode/artifacts/plan/YYYY-MM-DD-<epic-name>.md`)
- Validation report path (`.beastmode/artifacts/validate/YYYY-MM-DD-<epic-name>.md`)

## Phase 1: Execute

### 1. Stage Uncommitted Changes

Stage all uncommitted changes from implement/validate phases so they're included in the squash merge.

```bash
git add -A
```

Report: "All changes staged. Ready for release."

### 2. Determine Version Bump Type

```bash
# List commits on this feature branch for bump detection
last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
git log ${last_tag}..HEAD --oneline
```

Detect version bump **type** from commit messages:
- Any `BREAKING CHANGE` or `!:` suffix → **major** bump
- Any `feat:` or `feat(` prefix → **minor** bump
- Otherwise → **patch** bump

**Important:** Do NOT read `plugin.json` for the current version — the worktree's copy is stale. The actual version bump happens post-merge on main in the checkpoint phase.

Use the auto-detected bump type without asking.

### 3. Categorize Commits

```bash
last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
git log ${last_tag}..HEAD --oneline
```

Group commits by type:
- **Breaking Changes** — `BREAKING CHANGE`, `!:` suffix
- **Features** — `feat:` or `feat(`
- **Fixes** — `fix:` or `fix(`
- **Docs** — `docs:` or `docs(`
- **Chores** — `chore:`, `refactor:`, `ci:`, `build:`

### 4. Generate Release Notes

Save to `.beastmode/artifacts/release/YYYY-MM-DD-<epic-name>.md` using the Release Notes Template (see Reference section).

Omit empty sections (e.g., no Breaking Changes → skip that heading).

Use `**Bump:** major|minor|patch` instead of a concrete version — the actual version is computed post-merge from main's current state.

## Phase 2: Validate

### 1. Verify Release Notes

Check that release notes file exists in `.beastmode/artifacts/release/` with correct feature name and bump type.

### 2. Verify Commit Categorization

Check that release notes contain categorized commits (Features, Fixes, etc.) with no empty sections.

### 3. Validation Gate

If any check fails:
- Report specific problems
- Do NOT proceed to checkpoint

If all clean:
- Report: "Release verified. Proceeding to checkpoint."

## Phase 3: Checkpoint

### 1. Release Retro

Run a context reconciliation pass across all phase artifacts before releasing.

1. **Gather Phase Artifacts** — Enumerate all artifact directories for the current feature slug:

   ```
   .beastmode/artifacts/design/
   .beastmode/artifacts/plan/
   .beastmode/artifacts/implement/
   .beastmode/artifacts/validate/  (if exists)
   .beastmode/artifacts/release/
   ```

   For each directory, collect all files matching the current feature slug. Build a flat list of all artifact paths.

   Additionally, include any `hitl-log.md` files found in the phase artifact directories. These contain HITL decision logs from the pipeline run and do not follow the slug-naming convention.

   If no artifacts found, print "Retro: no artifacts found. Skipping." and proceed to Step 2.

2. **Spawn Context Walker** — Spawn a general-purpose agent as the context walker. It receives the phase artifacts and L1 context path, analyzes for promotable learnings, and proposes hierarchy updates.

   Build the session context block providing ALL phase artifacts:

   ```
   ## Session Context
   - **Phase**: release
   - **Feature**: <feature name>
   - **Artifacts**: <list of ALL phase artifact paths for this feature>
   - **L1 context path**: `.beastmode/context/` (all phase directories)
   - **Working directory**: <current working directory>
   ```

   Spawn: `Agent(subagent_type="general-purpose", prompt=<agent prompt + session context>)`

   Wait for completion.

   If context walker returned "No changes needed", print "Retro: no changes needed." and proceed to Step 2.

3. **Apply Changes (Bottom-Up)** — Apply all proposed changes from the context walker automatically in hierarchy order:

   1. **L3 — Records**: Create/append approved records automatically
   2. **L2 — Context docs**: Apply L2 edits/creates automatically
   3. **L1 — Phase summaries**: Recompute L1 summaries automatically
   4. **L0 — BEASTMODE.md**: Apply via sub-step 4 below

4. **Apply BEASTMODE.md Updates** — If no L0 changes proposed, skip this step. Apply L0 changes and log.

> **TRANSITION BOUNDARY — Steps below operate from main repo, NOT the feature branch working directory.**

### 2. Commit to Feature Branch

Before merging to main, commit all release artifacts to the feature branch:

```bash
git add -A
git commit -m "release(<epic-name>): checkpoint"
```

### 3. Squash Merge to Main

```bash
feature_dir=$(pwd)
feature_branch=$(git branch --show-current)
main_repo=$(git rev-parse --show-toplevel)/..

# Navigate to main repo, checkout main, pull latest
cd "$main_repo"
git checkout main
git pull

# Archive tag BEFORE rebase — preserves original pre-rebase commit history
git tag "archive/$feature_branch"

# Navigate back to feature worktree for rebase
cd "$feature_dir"
git rebase main
```

If the rebase encounters conflicts, resolve them interactively per commit:
1. Examine each conflicted file
2. Resolve the conflict (edit the file to produce the correct merged content)
3. `git add <resolved-file>`
4. `git rebase --continue`
5. Repeat until rebase completes

After rebase completes:

```bash
# Navigate back to main repo for squash merge
cd "$main_repo"
git merge --squash "$feature_branch"
```

**Important:** The squash merge stages changes but does NOT commit. Proceed to step 4.

If the squash merge produces conflicts after rebase, resolve as follows:

- **CHANGELOG.md**: resolve with `--ours` (main has the complete history; new entry is added in step 5)
- **Version files** (plugin.json, marketplace.json): resolve with `--ours` (main has the correct current version; bump happens in step 6)
- **All other files**: any remaining conflicts after rebase indicate genuine divergence — fail loudly and report for manual review. Do NOT auto-resolve with `--theirs`.

### 4. Compute Version

Read the **current version from main** (not from the worktree):

```bash
current_version=$(grep -o '"version": "[^"]*"' .claude-plugin/plugin.json | head -1 | cut -d'"' -f4)
echo "Current version on main: $current_version"
```

Read the bump type from the release notes YAML frontmatter (written during execute):

```yaml
---
phase: release
slug: <epic-id>
epic: <epic-name>
bump: minor
---
```

Apply:
- **major**: increment major, reset minor and patch to 0
- **minor**: increment minor, reset patch to 0
- **patch**: increment patch

### 5. Update CHANGELOG.md

Prepend the new release section to CHANGELOG.md **on main** using the computed version. Use the categorized changes from the release notes generated in execute step 4.

### 6. Bump Version Files

Update version in all files **on main**:
- `.claude-plugin/plugin.json` → `"version": "X.Y.Z"`
- `.claude-plugin/marketplace.json` → version in plugins array

### 7. Update Release Artifacts

Update the release notes **on main** to include the actual computed version:
- `.beastmode/artifacts/release/YYYY-MM-DD-<epic-name>.md` → replace `**Bump:** type` with `**Version:** vX.Y.Z`

### 8. Commit Release

Create the single commit with GitHub release style message using the Commit Message Template (see Reference section).

Use the release notes generated in execute step 4 and categorized commits from execute step 3 as the commit body. Omit empty sections (no Fixes if none exist).

### 9. Git Tagging

```bash
git tag -a vX.Y.Z -m "Release X.Y.Z"
```

Suggest: `git push origin main && git push origin vX.Y.Z`

### 10. Plugin Marketplace Update

Suggest running:
```bash
claude plugin marketplace update
claude plugin update beastmode@beastmode-marketplace --scope user
```

### 11. Complete

"Release complete."

## Constraints

- Do NOT read `plugin.json` for version from the worktree — the worktree's copy is stale
- Do NOT proceed to checkpoint if validation fails
- The squash merge stages changes but does NOT commit — these are separate steps
- NEVER skip the archive tag before squash merge — it preserves detailed commit history
- ALWAYS rebase the feature branch onto main before squash merge — prevents stale fork point from overwriting intermediate main commits
- After rebase, code file conflicts during squash merge are genuine divergence — do NOT auto-resolve with `--theirs`

## Reference

### Release Notes Template

```markdown
# Release: <epic-name>

**Bump:** minor
**Date:** YYYY-MM-DD

## Highlights

[1-2 sentence summary of key changes]

## Breaking Changes

- [Change description]

## Features

- [Feature description]

## Fixes

- [Fix description]

## Full Changelog

[Link to commit comparison or list all commits]
```

### Commit Message Template

```bash
git add -A
git commit -m "Release vX.Y.Z — <Title from CHANGELOG>

## Features
- <feature 1>
- <feature 2>

## Fixes
- <fix 1>

## Artifacts
- Design: .beastmode/artifacts/design/YYYY-MM-DD-<epic-name>.md
- Plan: .beastmode/artifacts/plan/YYYY-MM-DD-<epic-name>.md
- Release: .beastmode/artifacts/release/YYYY-MM-DD-<epic-name>.md
"
```
