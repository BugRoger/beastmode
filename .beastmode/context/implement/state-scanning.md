# State Scanning

## Epic Discovery
- ALWAYS discover epics from manifest files (.manifest.json) in `.beastmode/state/` — never from design files or date heuristics
- Flat-file convention: `state/YYYY-MM-DD-<slug>.manifest.json` — no directory-per-slug
- Slug extraction strips date prefix and .manifest.json suffix from filenames
- `resolveIdentifier()` resolves entities by exact ID -> exact slug -> prefix slug (opt-in). Typed accessors `getEpic()` and `getFeature()` replace the removed `store.find()` for direct lookups

## Phase Derivation
- ALWAYS derive current phase from the top-level manifest.phase field — no filesystem marker sniffing, no inference from features or phases map
- Valid phase values: design, plan, implement, validate, release, cancelled
- designPath is optional on EpicState — epics discovered from manifest may not have a design file reference

## Status Display
- Status table columns: Epic, Phase, Progress, Blocked, Last Activity
- Sort by lastUpdated descending, then alphabetically by slug for ties
- Progress shows completed/total only during implement phase, dash otherwise

## Next Action Derivation
- Plan phase: single action dispatching the epic slug
- Implement phase: fan-out action listing pending and in-progress feature slugs
- Validate/Release: single action dispatching the epic slug
- Completed (done) epics return null next action
