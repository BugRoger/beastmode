# 3. Checkpoint

## 1. Release Retro

Run a context reconciliation pass across all phase artifacts before releasing.

### 1.1 Gather Phase Artifacts

Enumerate all artifact directories for the current feature slug:

```
.beastmode/artifacts/design/
.beastmode/artifacts/plan/
.beastmode/artifacts/implement/
.beastmode/artifacts/validate/  (if exists)
.beastmode/artifacts/release/
```

For each directory, collect all files matching the current feature slug. Build a flat list of all artifact paths.

If no artifacts found, print "Retro: no artifacts found. Skipping." and proceed to Step 2.

### 1.2 Spawn Context Walker

Read the agent prompt from `agents/retro-context.md`.

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

### 1.3 Apply Changes (Bottom-Up)

Apply all proposed changes from the context walker automatically in hierarchy order:

1. **L3 — Records**: Create/append approved records automatically
2. **L2 — Context docs**: Apply L2 edits/creates automatically
3. **L1 — Phase summaries**: Recompute L1 summaries automatically
4. **L0 — BEASTMODE.md**: Apply via step 1.4 below

### 1.4 Apply BEASTMODE.md Updates

If no L0 changes proposed, skip this step.

Apply L0 changes and log.

> **TRANSITION BOUNDARY — Steps below operate from main repo, NOT the feature branch working directory.**

## 2. Commit to Feature Branch

Before merging to main, commit all release artifacts to the feature branch:

```bash
git add -A
git commit -m "release(<feature>): checkpoint"
```

## 3. Squash Merge to Main

```bash
feature_dir=$(pwd)
feature_branch=$(git branch --show-current)
main_repo=$(git rev-parse --show-toplevel)/..

cd "$main_repo"
git checkout main
git pull
git tag "archive/$feature_branch"
git merge --squash "$feature_branch"
```

**Important:** The squash merge stages changes but does NOT commit. Proceed to step 4.

### 3.1. Resolve Conflicts

If the squash merge produces conflicts:

- **Code files** (`.ts`, `.tsx`, `.js`, etc.): resolve with `--theirs` (feature branch has the new implementation)
- **CHANGELOG.md**: resolve with `--ours` (main has the complete history; new entry is added in step 5)
- **Version files** (plugin.json, marketplace.json): resolve with `--ours` (main has the correct current version; bump happens in step 6)
- **Other .beastmode/ files**: resolve with `--theirs` (feature branch has the latest state)

## 4. Compute Version

Read the **current version from main** (not from the worktree):

```bash
current_version=$(grep -o '"version": "[^"]*"' .claude-plugin/plugin.json | head -1 | cut -d'"' -f4)
echo "Current version on main: $current_version"
```

Read the bump type from the release notes YAML frontmatter (written during execute):

```yaml
---
phase: release
slug: <hex>
epic: <feature>
bump: minor
---
```

Apply:
- **major**: increment major, reset minor and patch to 0
- **minor**: increment minor, reset patch to 0
- **patch**: increment patch

## 5. Update CHANGELOG.md

Prepend the new release section to CHANGELOG.md **on main** using the computed version. Use the categorized changes from the release notes generated in execute step 4.

## 6. Bump Version Files

Update version in all files **on main**:
- `.claude-plugin/plugin.json` → `"version": "X.Y.Z"`
- `.claude-plugin/marketplace.json` → version in plugins array

## 7. Update Release Artifacts

Update the release notes **on main** to include the actual computed version:
- `.beastmode/artifacts/release/YYYY-MM-DD-<feature>.md` → replace `**Bump:** type` with `**Version:** vX.Y.Z`

## 8. Commit Release

Create the single commit with GitHub release style message:

```bash
git add -A
git commit -m "Release vX.Y.Z — <Title from CHANGELOG>

## Features
- <feature 1>
- <feature 2>

## Fixes
- <fix 1>

## Artifacts
- Design: .beastmode/artifacts/design/YYYY-MM-DD-<feature>.md
- Plan: .beastmode/artifacts/plan/YYYY-MM-DD-<feature>.md
- Release: .beastmode/artifacts/release/YYYY-MM-DD-<feature>.md
"
```

Use the release notes generated in execute step 4 and categorized commits from execute step 3 as the commit body. Omit empty sections (no Fixes if none exist).

## 9. Git Tagging

```bash
git tag -a vX.Y.Z -m "Release X.Y.Z"
```

Suggest: `git push origin main && git push origin vX.Y.Z`

## 10. Plugin Marketplace Update

Suggest running:
```bash
claude plugin marketplace update
claude plugin update beastmode@beastmode-marketplace --scope user
```

## 11. Complete

"Release complete."
