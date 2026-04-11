---
phase: plan
slug: f2d907
epic: fix-tree-log-rendering
feature: feature-status
wave: 1
---

# feature-status

**Design:** .beastmode/artifacts/design/2026-04-11-fix-tree-log-rendering.md

## User Stories

2. As a pipeline operator, I want dispatched features to show [in-progress] instead of [pending], so that the tree accurately reflects what's running.

## What to Build

buildTreeState seeds feature nodes from the EnrichedEpic skeleton with their persisted status (typically "pending" at dispatch time). When a session exists that matches a skeleton-seeded feature by slug, the feature's display status should be upgraded from "pending" to "in-progress". The session's existence is the signal — not the presence of entries.

In the session iteration loop, after finding an existing skeleton feature node, check whether the feature's current status is "pending" and if so, upgrade it to "in-progress". This is a runtime-only display status — no store persistence change needed.

Unit tests should verify:
- A skeleton-seeded feature with status "pending" becomes "in-progress" when a matching session exists
- A skeleton-seeded feature with a non-pending status (e.g., "completed", "blocked") is NOT overwritten
- Features without matching sessions retain their skeleton status

## Integration Test Scenarios

<!-- No behavioral scenarios — skip gate classified this feature as non-behavioral -->

## Acceptance Criteria

- [ ] Features with matching sessions display as "in-progress" instead of "pending"
- [ ] Non-pending statuses (completed, blocked) are not overwritten by session presence
- [ ] Features without sessions retain their store-seeded status
- [ ] Existing buildTreeState tests pass (updated as needed)
- [ ] New unit test covers the status upgrade logic
