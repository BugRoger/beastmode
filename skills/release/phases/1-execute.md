# 1. Execute

## 1. Categorize Commits

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

## 2. Generate Release Notes

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

## 3. Update CHANGELOG.md

If the project has a CHANGELOG.md, prepend the new release section.

## 4. Bump Plugin Version

Update version in both files:
- `.claude-plugin/plugin.json` → `"version": "X.Y.Z"`
- `.claude-plugin/marketplace.json` → version in plugins array

## 5. Commit Release Changes

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

## 6. Merge and Cleanup

@../_shared/worktree-manager.md#Merge Options

## 7. Git Tagging

```bash
git tag -a vX.Y.Z -m "Release X.Y.Z"
```

Suggest: `git push origin vX.Y.Z`

## 8. Plugin Marketplace Update

Suggest running:
```bash
claude plugin marketplace update
claude plugin update beastmode@beastmode-marketplace --scope project
```
