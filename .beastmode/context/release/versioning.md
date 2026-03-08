# Versioning

## Version Detection
- ALWAYS read version from `.claude-plugin/plugin.json` — source of truth
- ALWAYS follow semantic versioning for bumps — major.minor.patch
- Minor bump = new feature or capability; patch bump = docs, polish, or targeted fix — clear criteria
- Changelog generated from categorized commits (Highlights, Features, Fixes, Docs, Chores, Full Changelog) — structured output

## Commit Format
- ALWAYS use format: `Release vX.Y.Z — Title` — em dash required, not hyphen
- ALWAYS include Highlights as the first section (1-2 sentence summary) — quick orientation
- Include applicable category sections: Features, Fixes, Docs, Chores, Breaking Changes — conventional mapping
- ALWAYS include Full Changelog as the last section (commit SHAs or compare links) — traceability
- NEVER create multiple commits per release on main — one commit per version via squash
- NEVER include empty category sections — only categories with content
- Title subtitle uses "The Noun" pattern for thematic releases — branded identity

## Archive Strategy
- ALWAYS tag feature branch tip before deletion: `archive/feature/<name>` — preserves full branch history
- NEVER delete feature branches without archiving — irreversible data loss
- `git log --oneline main` should read as a scannable release history — clean main log
