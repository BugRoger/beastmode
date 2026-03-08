# 3. Checkpoint

## 1. Phase Retro

@../_shared/retro.md

## 2. Squash Merge to Main

@../_shared/worktree-manager.md#Merge Options

**Important:** For "Merge locally", the squash merge stages changes but does NOT commit. Proceed to step 3 to create the commit.

## 3. Commit Release

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

Use the release notes generated in execute step 5 and categorized commits from execute step 4 as the commit body. Omit empty sections (no Fixes if none exist).

## 4. Git Tagging

```bash
git tag -a vX.Y.Z -m "Release X.Y.Z"
```

Suggest: `git push origin vX.Y.Z`

## 5. Plugin Marketplace Update

Suggest running:
```bash
claude plugin marketplace update
claude plugin update beastmode@beastmode-marketplace --scope project
```

## 6. Context Report

@../_shared/context-report.md

## 7. Complete

"Release complete."
