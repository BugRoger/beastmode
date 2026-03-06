# 1. Analyze Changes

## 1. Announce Skill

"I'm using the /release skill to prepare this release."

## 2. Determine Version

If no version provided in arguments, analyze commits and suggest next version based on:
- Breaking changes → major bump
- New features → minor bump
- Bug fixes → patch bump

## 3. Gather Commits

```bash
# Find last release tag
git describe --tags --abbrev=0

# List commits since last release
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```

## 4. Categorize Changes

Group commits by type:
- **Breaking Changes** — API changes, removed features
- **Features** — New functionality
- **Fixes** — Bug fixes
- **Docs** — Documentation updates
- **Chores** — Maintenance, dependencies
