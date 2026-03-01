---
name: release
description: Create changelogs and release notes. Outputs to .agents/release/.
---

@../_shared/SESSION-TRACKING.md

# /release

Release management and changelogs.

## Overview

Create release notes, update changelog, bump version.

**Announce:** "I'm using the /release skill to prepare this release."

## Arguments

```
/release [version]
```

If no version provided, suggest next version based on changes.

## Process

1. Analyze commits since last release
2. Generate changelog entries
3. Create release notes
4. Update version (if applicable)
5. Write to `.agents/release/YYYY-MM-DD-<version>.md`

## Output

Writes to: `.agents/release/`

## Session Status Tracking

**On completion:**

1. Get feature name from recent status file or current work
2. Get session path using `get_session_path()` with a unique part of your initial arguments
3. Update `.agents/status/YYYY-MM-DD-<feature>.md`
4. Add entry to "Executed Phases" list
5. Append Release phase section with version and changelog summary
