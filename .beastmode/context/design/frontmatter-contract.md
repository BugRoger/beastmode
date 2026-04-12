# Frontmatter Contract

## Pipeline Loop Architecture

The five-step loop that governs all phase execution:

1. CLI reads the store, picks the next work item
2. session-start primes context into the Claude session (env vars + metadata)
3. Skill does the work, writes markdown with frontmatter
4. session-stop translates frontmatter into output.json (dumb pass-through)
5. CLI detects the JSON, updates the store (reconcile), advances phase, loops

Session-stop is a translator. Reconcile is the brain.

## Unified Field Naming

All layers use the same names:

| Env var | Metadata-in | Frontmatter | output.json |
|---|---|---|---|
| `BEASTMODE_PHASE` | `phase` | `phase` | `phase` (implicit) |
| `BEASTMODE_EPIC_ID` | `epic-id` | `epic-id` | `epic-id` |
| `BEASTMODE_EPIC_SLUG` | `epic-slug` | `epic-slug` | `epic-slug` |
| `BEASTMODE_FEATURE_ID` | `feature-id` | `feature-id` | `feature-id` |
| `BEASTMODE_FEATURE_SLUG` | `feature-slug` | `feature-slug` | `feature-slug` |

## Per-Phase Field Tables

Fields marked **DECISION** are produced by the skill. All others are identity echoes.

### design

```yaml
phase: design
epic-id: <hex>                    # echo
epic-slug: <skill-proposed-slug>  # DECISION — may differ from env var
```

### plan (per feature file)

```yaml
phase: plan
epic-id: <id>                    # echo
epic-slug: <slug>                # echo
feature-slug: <name>             # DECISION
wave: <N>                        # DECISION
```

### implement

```yaml
phase: implement
epic-id: <id>                    # echo
epic-slug: <slug>                # echo
feature-id: <id>                 # echo
feature-slug: <slug>             # echo
status: completed|error          # DECISION
```

### validate

```yaml
phase: validate
epic-id: <id>                    # echo
epic-slug: <slug>                # echo
status: passed|failed            # DECISION
failed-features: a,b             # DECISION (only when status: failed)
```

### release

```yaml
phase: release
epic-id: <id>                    # echo
epic-slug: <slug>                # echo
bump: major|minor|patch          # DECISION
```

## Removed Fields

These old field names are removed from frontmatter:

| Old field | Replacement | Migration |
|---|---|---|
| `slug` | `epic-id` | Direct rename |
| `epic` | `epic-slug` | Direct rename |
| `feature` | `feature-slug` | Direct rename |
| `id` | `epic-id` | Direct rename (was legacy fallback) |
| `failedFeatures` | `failed-features` | Kebab-case alignment |
| `problem` | Body `## Problem Statement` | Content extraction by reconcile |
| `solution` | Body `## Solution` | Content extraction by reconcile |
| `description` | Body `## What to Build` | Content extraction by reconcile |

## Content Extraction Pattern

Reconcile reads content from artifact markdown body sections, not from frontmatter or output.json:

- `## Problem Statement` + `## Solution` → `epic.summary` (design phase)
- Feature description → `feature.description` (plan phase)

GitHub sync reads these from the store as before. No change to GitHub sync's data source.

## Session-Stop Behavior

Session-stop is a dumb pass-through:
- Scans `artifacts/<phase>/` for `.md` files with YAML frontmatter
- Writes all frontmatter fields verbatim to output.json
- For plan phase: aggregates multiple plan artifacts into `features[]` array
- No env var comparison, no identity/decision distinction, no rename logic
