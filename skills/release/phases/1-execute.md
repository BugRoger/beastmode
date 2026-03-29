# 1. Execute

## 1. Stage Uncommitted Changes

Stage all uncommitted changes from implement/validate phases so they're included in the squash merge.

```bash
git add -A
```

Report: "All changes staged. Ready for release."

## 2. Determine Version Bump Type

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

### 2.1 [GATE|release.version-confirmation]

Read `.beastmode/config.yaml` → resolve mode for `release.version-confirmation`.
Default: `human`.

#### [GATE-OPTION|human] Ask User

Present detected bump type (major/minor/patch) via AskUserQuestion with override option.

#### [GATE-OPTION|auto] Auto-Detect

Use the auto-detected bump type without asking.
Log: "Gate `release.version-confirmation` → auto: <bump-type>"

## 3. Categorize Commits

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

## 4. Generate Release Notes

Save to `.beastmode/state/release/YYYY-MM-DD-<feature>.md`:

```markdown
# Release: <feature>

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

Omit empty sections (e.g., no Breaking Changes → skip that heading).

Use `**Bump:** major|minor|patch` instead of a concrete version — the actual version is computed post-merge from main's current state.
