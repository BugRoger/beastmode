# 3. Checkpoint

## 0. Assert Worktree

Before any writes, call [worktree-manager.md](../_shared/worktree-manager.md) → "Assert Worktree". If it fails, STOP.

## 1. Sync GitHub

Read `.beastmode/config.yaml`. If `github.enabled` is `false` or missing, or the manifest has no `github` block, skip this step.

@../_shared/github.md

Use warn-and-continue for all GitHub calls (see Error Handling Convention in github.md).

1. **Advance Epic to Done** — set the Epic's phase label and close it:

```bash
gh issue edit <epic-number> --remove-label "phase/validate" --add-label "phase/done"
gh issue close <epic-number>
```

2. **Add Epic to Project** — call the "Add to Project + Set Status" operation from github.md with the epic URL and status `"Done"`.

## 2. Phase Retro

@../_shared/retro.md

---

> **TRANSITION BOUNDARY — Steps below operate from main repo, NOT the worktree.**

## 3. Squash Merge to Main

@../_shared/worktree-manager.md#Merge Options

**Important:** For "Merge locally", the squash merge stages changes but does NOT commit. Proceed to step 4 to create the commit.

## 4. Commit Release

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

## 5. Git Tagging

```bash
git tag -a vX.Y.Z -m "Release X.Y.Z"
```

Suggest: `git push origin vX.Y.Z`

## 6. Plugin Marketplace Update

Suggest running:
```bash
claude plugin marketplace update
claude plugin update beastmode@beastmode-marketplace --scope project
```

## 7. Complete

"Release complete."
