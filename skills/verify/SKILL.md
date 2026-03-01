---
name: verify
description: Run verification and create reports. Outputs to .agent/verify/.
---

@../references/session-tracking.md

# /verify

Verification and testing reports.

## Overview

Run tests, check coverage, verify the implementation matches the plan.

**Announce:** "I'm using the /verify skill to verify this implementation."

## Arguments

```
/verify [feature-name]
```

If no feature provided, look for most recent status file in `.agent/status/`.

## Process

1. Identify feature from argument or recent status file
2. Run test suite
3. Check test coverage
4. Verify against plan requirements
5. Write report to `.agent/verify/YYYY-MM-DD-<feature>.md`

## Output

Writes to: `.agent/verify/`

## Workflow

Part of: bootstrap → prime → research → design → plan → implement → status → **verify** → release → retro

## Session Status Tracking

**On completion:**

1. Get feature name from argument or infer from recent status
2. Get session path using `get_session_path()` with a unique part of your initial arguments
3. Update `.agent/status/YYYY-MM-DD-<feature>.md`
4. Add entry to "Executed Phases" list
5. Append Verify phase section with test results summary
