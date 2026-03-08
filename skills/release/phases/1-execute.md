# 1. Execute

## 0. Assert Worktree (Pre-Merge Phase)

All steps from here through step 8.5 (Phase Retro) MUST execute inside the worktree.

Call [worktree-manager.md](../_shared/worktree-manager.md) → "Assert Worktree". If it fails, STOP.

> **Transition boundary:** Steps 9-12 (Squash Merge through Plugin Marketplace Update) operate from the main repo, NOT the worktree. This is the only legitimate point where work leaves the worktree.

## 2. Stage Uncommitted Changes

Stage all uncommitted changes from implement/validate phases so they're included in the squash merge.

```bash
git add -A
```

Report: "All changes staged. Ready for release."

## 3. Determine Version

```bash
# Read current version from plugin.json
current_version=$(grep -o '"version": "[^"]*"' .claude-plugin/plugin.json | head -1 | cut -d'"' -f4)
echo "Current version: $current_version"

# List commits since last release tag for bump detection
last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
git log ${last_tag}..HEAD --oneline
```

Detect version bump from commit messages:
- Any `BREAKING CHANGE` or `!:` suffix → **major** bump
- Any `feat:` or `feat(` prefix → **minor** bump
- Otherwise → **patch** bump

### 3.1 [GATE|release.version-confirmation]

Read `.beastmode/config.yaml` → resolve mode for `release.version-confirmation`.
Default: `human`.

#### [GATE-OPTION|human] Ask User

Increment from `$current_version`. Present suggested version via AskUserQuestion with override option.

#### [GATE-OPTION|auto] Auto-Detect

Use the auto-detected version bump without asking.
Log: "Gate `release.version-confirmation` → auto: vX.Y.Z"

## 4. Categorize Commits

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

## 5. Generate Release Notes

Save to `.beastmode/state/release/YYYY-MM-DD-<feature>.md`:

```markdown
# Release: <feature>

**Version:** vX.Y.Z
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

Omit empty sections (e.g., no Breaking Changes → skip that heading).

## 6. Update CHANGELOG.md

If the project has a CHANGELOG.md, prepend the new release section.

## 7. Bump Version Files

Update version in all three files:
- `.claude-plugin/plugin.json` → `"version": "X.Y.Z"`
- `.claude-plugin/marketplace.json` → version in plugins array
- `hooks/session-start.sh` → banner line `BEASTMODE vX.Y.Z`

## 8. Prepare L0 Update Proposal

Roll up L1 summaries and release features into an L0 update proposal.

1. Read current `.beastmode/BEASTMODE.md`
2. Read all L1 domain summaries (`context/DESIGN.md`, `context/PLAN.md`, `context/IMPLEMENT.md`, `context/VALIDATE.md`, `context/RELEASE.md`, `meta/DESIGN.md`, `meta/PLAN.md`, `meta/IMPLEMENT.md`, `meta/VALIDATE.md`, `meta/RELEASE.md`)
3. Read the release notes generated in step 5
4. Prepare proposed **Capabilities** section:
   - Add new capabilities from this release's `feat:` commits
   - Remove capabilities for features that were dropped
   - Keep existing entries that are still accurate
   - Format: `- **Bold label**: One-sentence description`
5. Prepare proposed **How It Works** section if the release changes workflow mechanics

Save the proposal to `.beastmode/state/release/YYYY-MM-DD-<feature>-l0-proposal.md`:

```markdown
# L0 Update Proposal — <feature> (vX.Y.Z)

## Proposed Capabilities

- **Bold label**: One-sentence description
- ...

## Proposed How It Works

[Only if changed, otherwise omit this section]
```

If no changes to Capabilities or How It Works are needed, skip writing the proposal file.

## 8.5. Phase Retro

@../_shared/retro.md

---

> **TRANSITION BOUNDARY — Steps below operate from main repo, NOT the worktree.**

## 9. Squash Merge to Main

@../_shared/worktree-manager.md#Merge Options

**Important:** For "Merge locally", the squash merge stages changes but does NOT commit. Proceed to step 10 to create the commit.

## 10. Commit Release

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

Use the release notes generated in step 5 and categorized commits from step 4 as the commit body. Omit empty sections (no Fixes if none exist).

## 11. Git Tagging

```bash
git tag -a vX.Y.Z -m "Release X.Y.Z"
```

Suggest: `git push origin vX.Y.Z`

## 12. Plugin Marketplace Update

Suggest running:
```bash
claude plugin marketplace update
claude plugin update beastmode@beastmode-marketplace --scope project
```
