---
phase: plan
slug: quick-quartz-96da
epic: frontmatter-contract-alignment
feature: skill-templates-and-docs
wave: 1
---

# skill-templates-and-docs

**Design:** `.beastmode/artifacts/design/2026-04-12-quick-quartz-96da.md`

## User Stories

1. As a skill author, I want frontmatter field names to match the metadata-in field names, so that I copy names verbatim instead of translating between `epic-slug` and `epic`/`slug`/`id`.
5. As a contributor, I want the frontmatter contract documented in a context file and inline in skill templates, so that I know exactly which fields each phase must write and which consumers read.

## What to Build

### Skill Template Frontmatter Renames

Update the checkpoint/frontmatter templates in all five skill SKILL.md files to use the unified field names. Each skill writes a YAML frontmatter block in its checkpoint section.

**design/SKILL.md:**
- `slug: <epic-id>` → `epic-id: <epic-id>`
- `epic: <epic-name>` → `epic-slug: <epic-name>`
- Remove `problem` and `solution` from frontmatter template (these become markdown body sections `## Problem Statement` and `## Solution`)

**plan/SKILL.md:**
- `slug: <epic-id>` → `epic-id: <epic-id>`
- `epic: <epic-name>` → `epic-slug: <epic-name>`
- `feature: <feature-name>` → `feature-slug: <feature-name>`
- Remove `description` from frontmatter template (content lives in `## Description` or `## What to Build` body section)

**implement/SKILL.md:**
- `slug: <epic-id>` → `epic-id: <epic-id>`
- `epic: <epic-name>` → `epic-slug: <epic-name>`
- `feature: <feature-name>` → `feature-slug: <feature-name>`
- Add `feature-id: <feature-id>` (identity echo)

**validate/SKILL.md:**
- `slug: <epic-id>` → `epic-id: <epic-id>`
- `epic: <epic-name>` → `epic-slug: <epic-name>`
- `failedFeatures: feat-a,feat-b` → `failed-features: feat-a,feat-b`

**release/SKILL.md:**
- `slug: <epic-id>` → `epic-id: <epic-id>`
- `epic: <epic-name>` → `epic-slug: <epic-name>`

### Contract Documentation

Create a new context file at `context/design/frontmatter-contract.md` documenting the canonical frontmatter contract:

- Pipeline loop architecture diagram (5-step loop)
- Per-phase field tables showing which fields are identity echoes vs skill decisions
- Unified field naming table (env var → metadata-in → frontmatter → output.json)
- Removed fields list with migration notes
- Content extraction pattern (reconcile reads body sections, not frontmatter)

The context file becomes the single source of truth for the contract. The inline skill templates are working copies that must stay consistent with it.

## Integration Test Scenarios

<!-- No behavioral scenarios — skip gate classified this feature as non-behavioral -->

## Acceptance Criteria

- [ ] All 5 SKILL.md files use `epic-id` and `epic-slug` instead of `slug` and `epic`
- [ ] plan/SKILL.md uses `feature-slug` instead of `feature`, no `description` in frontmatter
- [ ] implement/SKILL.md uses `feature-slug` instead of `feature`, includes `feature-id`
- [ ] validate/SKILL.md uses `failed-features` instead of `failedFeatures`
- [ ] design/SKILL.md frontmatter template has no `problem`/`solution` fields
- [ ] `context/design/frontmatter-contract.md` exists with per-phase field tables, pipeline diagram, and naming rules
- [ ] Contract doc and skill templates are consistent with each other
