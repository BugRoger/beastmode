# Commit Categorization

## Context
Release artifacts need to present changes in organized categories rather than raw commit lists.

## Decision
Commits categorized by conventional commit type: `feat` -> Features, `fix` -> Fixes, `docs` -> Docs, `chore`/`refactor` -> Chores. Breaking changes get their own section regardless of commit type. Docs-only releases note "No code changes" in Full Changelog.

## Rationale
Conventional commits provide a machine-parseable categorization scheme. Mapping to human-readable section names (Features vs feat) makes changelogs scannable without knowledge of the convention. Chores category added in v0.14.1 for non-feature, non-fix work.

## Source
- .beastmode/artifacts/release/2026-03-04-v0.2.0.md (full categorization with Breaking Changes)
- .beastmode/artifacts/release/2026-03-04-v0.4.1.md (Features/Fixes/Chores)
- .beastmode/artifacts/release/2026-03-06-v0.14.1.md (Chores category introduced)
- .beastmode/artifacts/release/2026-03-05-v0.11.1.md (docs-only, "No code changes")
