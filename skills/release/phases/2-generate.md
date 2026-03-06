# 2. Generate Release Notes

## 1. Create Changelog Entries

Format each commit as a changelog entry:
- Use conventional commit prefixes
- Link to PRs/issues if available
- Group by category

## 2. Write Release Notes

Save to `.agents/release/YYYY-MM-DD-<version>.md`:

```markdown
# Release <version>

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

[Link to commit comparison]
```

## 3. Update CHANGELOG.md

If project has a CHANGELOG.md, prepend the new release section.
