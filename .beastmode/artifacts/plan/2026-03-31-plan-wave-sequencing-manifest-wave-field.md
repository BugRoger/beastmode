---
phase: plan
epic: plan-wave-sequencing
feature: manifest-wave-field
wave: 1
---

# Manifest Wave Field

**Design:** `.beastmode/artifacts/design/2026-03-31-plan-wave-sequencing.md`

## User Stories

2. As a developer, I want the watch loop to dispatch features wave-by-wave, so that independent features run in parallel while dependent ones wait.
5. As a developer, I want existing single-wave plans to work unchanged, so that backwards compatibility is preserved without migration.

## What to Build

Add `wave` as a first-class field on the manifest's feature schema and wire it through the existing frontmatter-to-manifest pipeline.

**ManifestFeature type:** Add `wave: number` to the `ManifestFeature` interface in the manifest store. The field is optional at the type level but defaults to `1` at runtime — any feature without an explicit wave is treated as wave 1.

**Stop hook (generate-output):** The existing `scanPlanFeatures()` function reads feature plan frontmatter and builds the output.json feature array. Extend it to extract the `wave` field from each feature plan's YAML frontmatter and include it in the output entry. If `wave` is missing from frontmatter, default to `1`.

**Manifest enrichment:** The `computeSetFeatures()` action in the pipeline machine converts output.json features into ManifestFeature objects. Extend it to carry the `wave` field through. The manifest-store serialization must include `wave` in the persisted JSON.

**Backwards compatibility:** Existing manifests without `wave` fields on features must work unchanged. Any code that reads `feature.wave` should fall back to `1` if the field is undefined. No migration step — the default handles it.

## Acceptance Criteria

- [ ] `ManifestFeature` type includes `wave: number` field
- [ ] Stop hook extracts `wave` from feature plan frontmatter into output.json
- [ ] Missing `wave` in frontmatter defaults to `1` in output.json
- [ ] `computeSetFeatures()` carries `wave` from output.json to ManifestFeature
- [ ] Persisted manifest JSON includes `wave` on each feature
- [ ] Existing manifests without `wave` field load successfully with features defaulting to wave 1
