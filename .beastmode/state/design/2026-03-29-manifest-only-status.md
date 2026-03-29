## Problem Statement

`beastmode status` discovers epics by scanning design files (116 total), then looks for manifests. Pre-manifest epics (100+) all show as "release" with dashes across every column, burying the 12 actual active epics in noise. The status table is unusable.

## Solution

Switch epic discovery from design-file-first to manifest-file-first. Only epics with a manifest.json appear in the status table. Additionally, converge the duplicate inline scanner in watch-command.ts and simplify phase derivation to use manifest.phases instead of marker files.

## User Stories

1. As a user running `beastmode status`, I see only active epics (those with manifests) so the table is actionable instead of 100+ rows of noise
2. As the watch loop, I use the same canonical scanner as status so there's one code path for epic discovery
3. As a maintainer, the scanner has no dead code paths (MANIFEST_EPOCH, marker files, legacy artifact checks, run log parsing for cost) so the codebase stays lean

## Implementation Decisions

- Epic discovery pivots on manifest files: scan pipeline/ and state/plan/ for *.manifest.json, not state/design/*.md
- Slug extraction from manifest filenames uses same regex: strip date prefix, strip .manifest.json suffix
- Pipeline manifests take precedence over plan manifests for the same slug (dedup)
- Phase derivation uses manifest.phases map (phases.release, phases.validate, etc.) instead of marker files or legacy state/ dir artifacts
- Remove MANIFEST_EPOCH constant and pre-manifest era detection — no manifest means no epic
- Remove hasPhaseMarker(), hasLegacyArtifact(), dateFromDesign() — dead code after the switch
- Remove readRunLog() and aggregateCost() from state-scanner.ts — cost was never populated
- Remove costUsd from EpicState interface — always zero
- Drop Cost column from status table — never had data
- Last Activity uses manifest.lastUpdated instead of run log scanning
- designPath on EpicState becomes optional — resolved by looking up design file after manifest discovery
- Delete scanEpicsInline() from watch-command.ts — canonical scanEpics() now does the same thing
- watch-command.ts delegates directly to state-scanner.scanEpics() with no inline fallback

## Testing Decisions

- Update existing state-scanner.test.ts to reflect manifest-first discovery
- Key test cases:
  - Empty pipeline + plan dirs returns empty array
  - Manifest in pipeline only is discovered
  - Manifest in plan only is discovered
  - Same slug in both dirs: pipeline wins
  - Manifest with no features: phase = plan
  - All features completed + phases.validate = completed: phase = release (ready to ship)
  - All features completed + phases.release = completed: phase = release (done)
  - Features in-progress: phase = implement
  - Blocked feature: blocked = true
- Remove tests that depend on design-file-first discovery or marker file phase detection

## Out of Scope

- Cost tracking improvements (re-add column when SDK reports costs)
- Design-phase visibility for unplanned epics (conscious exclusion)
- Changes to manifest format or CLI manifest writing

## Further Notes

Expected result: status table drops from ~116 rows to ~12 rows. The watch loop also benefits since scanEpicsInline was a workaround for the design-file-first scanner being wrong for orchestration.

## Deferred Ideas

- `beastmode status --all` flag to optionally include design-only epics
- Cost column backed by SDK cost reporting when available
