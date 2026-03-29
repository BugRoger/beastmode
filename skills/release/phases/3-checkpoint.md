# 3. Checkpoint

## 1. Phase Retro

@../_shared/retro.md

## 1.5. Write Phase Output

Write the phase output contract file to `.beastmode/state/release/YYYY-MM-DD-<feature>.output.json`:

```json
{
  "status": "completed",
  "artifacts": {
    "bump": "minor",
    "changelog": ".beastmode/state/release/YYYY-MM-DD-<feature>.md"
  }
}
```

- The `bump` is the bump type (major/minor/patch) determined during execute
- The `changelog` path points to the release notes file (if one was generated)
- If no changelog was written, omit the `changelog` field from artifacts

---

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
- **Version files** (plugin.json, marketplace.json, session-start.sh): resolve with `--ours` (main has the correct current version; bump happens in step 6)
- **Other .beastmode/ files**: resolve with `--theirs` (feature branch has the latest state)

## 4. Compute Version

Read the **current version from main** (not from the worktree):

```bash
current_version=$(grep -o '"version": "[^"]*"' .claude-plugin/plugin.json | head -1 | cut -d'"' -f4)
echo "Current version on main: $current_version"
```

Read the bump type from the release notes (or output.json). Apply:
- **major**: increment major, reset minor and patch to 0
- **minor**: increment minor, reset patch to 0
- **patch**: increment patch

## 5. Update CHANGELOG.md

Prepend the new release section to CHANGELOG.md **on main** using the computed version. Use the categorized changes from the release notes generated in execute step 4.

## 6. Bump Version Files

Update version in all files **on main**:
- `.claude-plugin/plugin.json` → `"version": "X.Y.Z"`
- `.claude-plugin/marketplace.json` → version in plugins array
- `hooks/session-start.sh` → banner line `BEASTMODE vX.Y.Z`

## 7. Update Release Artifacts

Update the release notes and output.json **on main** to include the actual computed version:
- `.beastmode/state/release/YYYY-MM-DD-<feature>.md` → replace `**Bump:** type` with `**Version:** vX.Y.Z`
- `.beastmode/state/release/YYYY-MM-DD-<feature>.output.json` → replace `"bump": "type"` with `"version": "vX.Y.Z"`

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
- Design: .beastmode/state/design/YYYY-MM-DD-<feature>.md
- Plan: .beastmode/state/plan/YYYY-MM-DD-<feature>.md
- Release: .beastmode/state/release/YYYY-MM-DD-<feature>.md
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
claude plugin update beastmode@beastmode-marketplace --scope project
```

## 11. Complete

"Release complete."
