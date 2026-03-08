# 1. Execute

## 1. Enter Worktree

```bash
if [ -n "$worktree_path" ] && [ -d "$worktree_path" ]; then
  cd "$worktree_path"
fi
```

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
