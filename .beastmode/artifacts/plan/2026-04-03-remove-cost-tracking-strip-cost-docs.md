---
phase: plan
slug: remove-cost-tracking
epic: remove-cost-tracking
feature: strip-cost-docs
wave: 1
---

# Strip Cost Docs

**Design:** `.beastmode/artifacts/design/2026-04-03-remove-cost-tracking.md`

## User Stories

3. As a contributor, I want design docs and context files to not reference a removed feature, so that documentation reflects reality.

## What to Build

Remove all cost-tracking references from living design and context documentation. Leave historical artifacts (changelogs, release notes) untouched — they describe what happened and should remain accurate.

**Delete standalone cost docs:**
- The cost-separation design doc in the state-scanner context directory
- The cost-tracking design doc in the CLI context directory

**Scrub living context files:**
- Remove cost tracking section from the CLI context doc
- Remove cost/run-log references from the orchestration context doc
- Remove cost tracking references from the product context doc
- Remove "costUsd removed from all types" from the state-scanner type architecture doc
- Remove "remove costUsd from manifest types" from the state-scanner context doc
- Remove cost references from the SDK integration context doc

**Leave untouched:**
- Changelog entries (historical record)
- Old release notes in artifacts/release/ (historical record)
- Old PRD artifacts in artifacts/design/ (historical record)

**Verification:** After all removals, grep `.beastmode/context/` for `costUsd`, `cost_usd`, `cost tracking`, `.beastmode-runs` to confirm no references remain in living docs.

## Acceptance Criteria

- [ ] No standalone cost design docs exist in context directories
- [ ] No cost-tracking references in living context files (cli.md, orchestration.md, product.md, state-scanner.md, type-architecture.md, sdk-integration.md)
- [ ] Historical artifacts (changelog, release notes, old PRDs) are unchanged
- [ ] Grep for cost references in `.beastmode/context/` returns zero hits
