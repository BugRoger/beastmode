---
phase: release
epic-id: quick-quartz-96da
epic-slug: frontmatter-contract-alignment
bump: minor
---

# Release: frontmatter-contract-alignment

**Version:** v0.118.0
**Date:** 2026-04-12

## Highlights

Defines an explicit frontmatter contract across all five phases, aligning field names between env vars, metadata-in, frontmatter, and output.json. Content fields (problem, solution, description) move from frontmatter to artifact markdown body sections, making output.json a pure decisions-and-status signal.

## Features

- Rename validate frontmatter to `epic-id`/`epic-slug`/`failed-features`
- Rename release frontmatter to `epic-id`/`epic-slug`
- Rename design frontmatter to `epic-id`/`epic-slug`
- Rename implement frontmatter to `epic-id`/`epic-slug`/`feature-id`/`feature-slug`
- Rename plan frontmatter to `epic-id`/`epic-slug`/`feature-slug`
- Rename artifact type fields to unified naming convention
- Create frontmatter contract documentation
- Use unified field names in session-stop frontmatter and `buildOutput`
- Update reconcile to use unified field names and extract content from artifact body
- Update BDD world artifact writers to use unified field names
- Update Cucumber feature files to unified frontmatter field names

## Chores

- Update session-stop test fixtures to unified field names
- Update reconcile tests to use unified field names

## Full Changelog

- `7b70c689` feat(skill-templates-and-docs): rename validate frontmatter to epic-id/epic-slug/failed-features
- `f6eaef4a` feat(skill-templates-and-docs): rename release frontmatter to epic-id/epic-slug
- `50840ca8` feat(skill-templates-and-docs): rename design frontmatter to epic-id/epic-slug
- `1fb4aed9` feat(skill-templates-and-docs): rename implement frontmatter, add feature-id
- `06f3b991` feat(skill-templates-and-docs): rename plan frontmatter to epic-id/epic-slug/feature-slug
- `8499c89a` feat(types): rename artifact type fields to unified naming convention
- `4ca0c332` feat(skill-templates-and-docs): create frontmatter contract documentation
- `14dbf7dd` implement(frontmatter-contract-alignment-skill-templates-and-docs): checkpoint
- `8982e6ce` feat(session-stop): use unified field names in frontmatter and buildOutput
- `b442c39b` test(session-stop): update fixtures to unified field names
- `b3e972f5` implement(frontmatter-contract-alignment-types-and-session-stop): checkpoint
- `8548a8cc` feat(reconcile-content-extraction): update reconcile to use unified field names and extract content from artifact body
- `0664aab6` test(reconcile-content-extraction): update reconcile tests to use unified field names
- `ff847e58` feat(reconcile-content-extraction): update BDD world artifact writers to use unified field names
- `a024e997` feat(reconcile-content-extraction): update Cucumber feature files to unified frontmatter field names
- `20511010` implement(frontmatter-contract-alignment-reconcile-content-extraction): checkpoint
- `59ce6e15` validate(frontmatter-contract-alignment): checkpoint
