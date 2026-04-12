---
phase: design
epic-id: quick-quartz-f284
epic-slug: frontmatter-contract-alignment
---

## Problem Statement

The artifact frontmatter contract is undocumented, inconsistently named, and redundant. Session-start passes context via env vars and metadata fields using one naming convention (`epic-slug`, `feature-slug`). Skills echo that context back as frontmatter using a different naming convention (`slug`, `epic`, `feature`, `id`). Session-stop then re-reads the echoed fields from frontmatter instead of from the env vars it already has. The result is 14 echo fields across 5 phases carrying zero new information, three naming conventions for the same concepts, and no documented contract for what frontmatter is actually for.

## Solution

Define an explicit frontmatter contract: frontmatter carries identity echoes (using the same field names as metadata-in) plus skill decisions only. Content fields (problem, solution, description) move from frontmatter to artifact markdown body sections. Session-stop passes frontmatter through to output.json as a dumb translator. Reconcile reads output.json for decisions and artifacts directly for content. All field names are aligned across env vars, metadata-in, frontmatter, and output.json.

## User Stories

1. As a skill author, I want frontmatter field names to match the metadata-in field names, so that I copy names verbatim instead of translating between `epic-slug` and `epic`/`slug`/`id`.
2. As the session-stop hook, I want to pass frontmatter fields through to output.json without interpretation, so that session-stop remains a dumb translator with no business logic.
3. As the reconcile step, I want to read content (problem, solution, description) directly from artifact markdown body sections instead of output.json, so that output.json carries only decisions and status.
4. As the reconcile step during design, I want to compare `epic-slug` from output.json against the store's current slug and trigger a rename when they differ, so that the skill's proposed epic name flows into the store through a single rename path.
5. As a contributor, I want the frontmatter contract documented in a context file and inline in skill templates, so that I know exactly which fields each phase must write and which consumers read.
6. As the test suite, I want test fixtures updated to use the aligned field names, so that tests validate the documented contract.

## Implementation Decisions

### Pipeline loop architecture

The five-step loop that governs all phase execution:

1. CLI reads the store, picks the next work item
2. session-start primes context into the Claude session (env vars + metadata)
3. Skill does the work, writes markdown with frontmatter
4. session-stop translates frontmatter into output.json (dumb pass-through)
5. CLI detects the JSON, updates the store (reconcile), advances phase, loops

Session-stop is a translator. Reconcile is the brain.

### Unified field naming

All layers use the same names:

| Env var | Metadata-in | Frontmatter | output.json |
|---|---|---|---|
| `BEASTMODE_PHASE` | `phase` | `phase` | `phase` (implicit) |
| `BEASTMODE_EPIC_ID` | `epic-id` | `epic-id` | `epic-id` |
| `BEASTMODE_EPIC_SLUG` | `epic-slug` | `epic-slug` | `epic-slug` |
| `BEASTMODE_FEATURE_ID` | `feature-id` | `feature-id` | `feature-id` |
| `BEASTMODE_FEATURE_SLUG` | `feature-slug` | `feature-slug` | `feature-slug` |

### Frontmatter contract per phase

Fields marked DECISION are produced by the skill. All others are identity echoes.

**design:**
```yaml
phase: design
epic-id: <hex>
epic-slug: <skill-proposed-slug>   # DECISION — may differ from env var
```

**plan** (per feature file):
```yaml
phase: plan
epic-id: <id>
epic-slug: <slug>
feature-slug: <name>               # DECISION
wave: <N>                           # DECISION
```

**implement:**
```yaml
phase: implement
epic-id: <id>
epic-slug: <slug>
feature-id: <id>
feature-slug: <slug>
status: completed|error             # DECISION
```

**validate:**
```yaml
phase: validate
epic-id: <id>
epic-slug: <slug>
status: passed|failed               # DECISION
failed-features: a,b                # DECISION (only when status: failed)
```

**release:**
```yaml
phase: release
epic-id: <id>
epic-slug: <slug>
bump: major|minor|patch             # DECISION
```

### Session-stop behavior

Session-stop is a dumb pass-through:
- Scans artifacts for frontmatter
- Writes all frontmatter fields verbatim to output.json
- For plan phase: aggregates multiple plan artifacts into features[] array (with epic-slug, feature-slug, wave, plan filename — no description)
- No env var comparison, no identity/decision distinction, no rename logic

### Reconcile behavior changes

Reconcile (CLI) is the brain. Changes:

1. **Design phase**: Reads `epic-slug` from output.json. Compares against store slug. Renames if different. Reads design artifact body directly for `## Problem` and `## Solution` sections. Writes concatenated summary to `epic.summary` in store.
2. **Plan phase**: Reads features[] from output.json for `feature-slug`, `wave`, plan filename. Reads plan artifact body directly for `## Description` section. Writes to `feature.description` in store.
3. **All phases**: Field names in output.json change from old (`epic`, `slug`, `feature`, `failedFeatures`) to new (`epic-id`, `epic-slug`, `feature-slug`, `failed-features`).

### Content extraction pattern

Reconcile uses the existing `section-extractor` / `artifact-reader` pipeline to extract content from markdown body sections:
- `## Problem` → `epic.summary` (design)
- `## Solution` → `epic.summary` (design)
- Feature description → `feature.description` (plan)

GitHub sync reads these from the store as before. No change to GitHub sync's data source.

### Removed fields

These old field names are removed from frontmatter:
- `slug` (was an alias for `epic-id` or `epic-slug` depending on context)
- `epic` (was the human name, replaced by `epic-slug`)
- `feature` (replaced by `feature-slug`)
- `id` (replaced by `epic-id`)
- `failedFeatures` (replaced by `failed-features`)
- `problem`, `solution`, `description` (content lives in markdown body, not frontmatter)

These fields are removed from output.json:
- `summary` object (problem/solution no longer passed through output.json)
- `features[].description` (no longer passed through output.json)

### Systems that need changes

1. **`cli/src/hooks/session-stop.ts`** — `ArtifactFrontmatter` interface field renames; `buildOutput` uses new field names; `scanPlanFeatures` uses new field names, drops description from output
2. **`cli/src/hooks/session-start.ts`** — Verify metadata field names are already aligned (they should be)
3. **`cli/src/pipeline/reconcile.ts`** — Read new field names from output.json; extract problem/solution from design artifact body; extract description from plan artifact body; rename detection via epic-slug comparison
4. **`cli/src/types.ts`** — `PhaseOutput` interface field renames; remove summary from design output; remove description from plan features
5. **`plugin/skills/design/SKILL.md`** — PRD template frontmatter: `slug` → `epic-id`, `epic` → `epic-slug`
6. **`plugin/skills/plan/SKILL.md`** — Feature plan template frontmatter: `slug` → `epic-id`, `epic` → `epic-slug`, `feature` → `feature-slug`
7. **`plugin/skills/implement/SKILL.md`** — Checkpoint frontmatter: `slug` → `epic-id`, `epic` → `epic-slug`, `feature` → `feature-slug`; add `feature-id`
8. **`plugin/skills/validate/SKILL.md`** — Checkpoint frontmatter: `slug` → `epic-id`, `epic` → `epic-slug`, `failedFeatures` → `failed-features`
9. **`plugin/skills/release/SKILL.md`** — Checkpoint frontmatter: `slug` → `epic-id`, `epic` → `epic-slug`
10. **`cli/src/__tests__/session-stop.test.ts`** — Fixture field names
11. **`cli/src/__tests__/session-start.test.ts`** — Verify (should already be correct)
12. **`cli/features/support/world.ts`** — Test helper frontmatter writers
13. **New: `context/design/frontmatter-contract.md`** — Canonical contract documentation

### Contract documentation

Two locations:
- **Canonical reference**: `context/design/frontmatter-contract.md` with per-phase field tables, pipeline loop diagram, and field naming rules
- **Working copies**: Inline in each skill's SKILL.md checkpoint section with the frontmatter template

## Testing Decisions

- Unit tests for session-stop: verify `buildOutput` passes through frontmatter fields with new names, no summary object in design output, no description in plan features output
- Unit test for reconcile design: verify summary extraction from artifact body, epic-slug rename detection
- Unit test for reconcile plan: verify description extraction from artifact body
- Existing integration tests updated to use aligned field names
- Prior art: `cli/src/__tests__/session-stop.test.ts`, `cli/src/__tests__/session-start.test.ts`

## Out of Scope

- Changes to env var naming (`BEASTMODE_*` prefix and convention stays as-is)
- Changes to metadata-in field naming (already correct)
- Migration of existing artifacts on disk (old artifacts from prior releases are not reprocessed)
- Changes to GitHub sync's data source (reads from store, unchanged)
- Changes to LLM prompt hooks (file-permission PreToolUse)
- Eliminating echo fields from frontmatter entirely (deferred idea)

## Further Notes

- The `section-extractor` / `artifact-reader` pipeline already exists in the codebase for GitHub sync. Reconcile will import and reuse it for content extraction.
- The `id` field was a legacy fallback for `epic` in design/plan. With `epic-id` as the explicit field, the fallback chain is removed.
- output.json becomes a pure decisions + status signal. Content lives in artifacts, identity lives in the store.

## Deferred Ideas

- Eliminate echo fields from frontmatter entirely (skills write only decision fields, session-stop gets all identity from env vars). Deferred because it changes the artifact format more aggressively and makes artifacts less self-describing for human readers.
- Move decision fields out of frontmatter into a structured sidecar (e.g., `.decisions.yaml` per artifact). Deferred because frontmatter is simpler for skills to produce.
