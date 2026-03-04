# 1. Execute

## 1. Enter Worktree

```bash
if [ -n "$worktree_path" ] && [ -d "$worktree_path" ]; then
  cd "$worktree_path"
fi
```

## 2. Sync with Main

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

## 3. Determine Version

```bash
# Read current version from plugin.json (post-rebase, this is main's version)
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

<!-- HITL-GATE: release.version-confirmation | APPROVAL -->
@../_shared/gate-check.md

Increment from `$current_version` (not from tag). Present suggested version via AskUserQuestion with override option.

- **auto**: Claude uses the auto-detected version bump without asking. Log: "Gate `release.version-confirmation` → auto: vX.Y.Z"

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

Save to `.beastmode/state/release/YYYY-MM-DD-vX.Y.Z.md`:

```markdown
# Release vX.Y.Z

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

## 8. Phase Retro

@../_shared/retro.md

## 8.5. Update PRODUCT.md

Roll up L1 summaries and release features into `.beastmode/PRODUCT.md`.

1. Read current `.beastmode/PRODUCT.md`
2. Read all L1 domain summaries (`context/DESIGN.md`, `context/PLAN.md`, `context/IMPLEMENT.md`, `context/VALIDATE.md`, `context/RELEASE.md`, `meta/DESIGN.md`, `meta/PLAN.md`, `meta/IMPLEMENT.md`, `meta/VALIDATE.md`, `meta/RELEASE.md`, `state/DESIGN.md`, `state/PLAN.md`, `state/IMPLEMENT.md`, `state/VALIDATE.md`, `state/RELEASE.md`)
3. Read the release notes generated in step 5
4. Update **Capabilities** section:
   - Add new capabilities from this release's `feat:` commits
   - Remove capabilities for features that were dropped
   - Keep existing entries that are still accurate
   - Format: `- **Bold label**: One-sentence description`
5. Update **How It Works** section if the release changes workflow mechanics
6. Update **Current Version** to the new version and release count

<!-- HITL-GATE: release.product-md-approval | CONDITIONAL -->
@../_shared/gate-check.md

**Significance check:**
- If only Current Version changed → auto-apply silently
- If Capabilities or How It Works changed → present the before/after diff for user approval

- **auto**: Claude auto-applies all changes and logs: "Gate `release.product-md-approval` → auto: updated PRODUCT.md with N new capabilities"

## 9. Commit Release Changes

Stage and commit release artifacts (changelog, version bumps):

```bash
git add -A
git commit -m "feat(<feature>): <summary-from-changelog>

Artifacts:
- Design: .beastmode/state/design/YYYY-MM-DD-<feature>.md
- Plan: .beastmode/state/plan/YYYY-MM-DD-<feature>.md
- Release: .beastmode/state/release/YYYY-MM-DD-vX.Y.Z.md
"
```

## 10. Merge and Cleanup

@../_shared/worktree-manager.md#Merge Options

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
