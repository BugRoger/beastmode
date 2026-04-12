---
phase: plan
epic-id: bm-c861
epic-slug: github-sync-bug-fixes-c861
feature-name: Remove Phase Badge
wave: 1
---

# Remove Phase Badge

**Design:** .beastmode/artifacts/design/2026-04-12-github-sync-bug-fixes-c861.md

## User Stories

1. As a user viewing an epic issue on GitHub, I want the body to not repeat the phase that's already shown in the labels, so that the issue body is clean and focused on content.

## What to Build

Remove the `**Phase:**` line from all issue body renderers. The phase is already conveyed via GitHub labels (`phase/design`, `phase/plan`, etc.), making the body badge redundant.

Two call sites produce the badge:

1. **Epic body formatter** — the function that builds the full epic issue body pushes a `**Phase:** ${phase}` section as the very first element. Remove that push entirely. The `phase` field on the input interface should remain (it's used elsewhere for label construction and sync logic), but the body formatter should no longer render it.

2. **Early issue stub** — the design-phase stub body hardcodes `**Phase:** design` as a literal string prefix. Remove the phase prefix from the stub body string. The stub should begin directly with the italicized placeholder text.

Update existing tests: the test that asserts the phase badge IS present in formatted bodies needs to flip — it should assert the badge is ABSENT. Search for any other test assertions that check for `**Phase:**` in body output and invert them.

## Integration Test Scenarios

<!-- No behavioral scenarios -- skip gate classified this feature as non-behavioral -->

## Acceptance Criteria

- [ ] `formatEpicBody()` output does not contain `**Phase:**` for any phase value
- [ ] Early issue stub body does not contain `**Phase:**`
- [ ] Existing body-format tests pass with inverted phase badge assertions
- [ ] `EpicBodyInput` interface still has `phase` field (used by other consumers)
