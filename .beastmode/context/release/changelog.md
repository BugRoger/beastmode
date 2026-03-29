# Changelog

## Release Artifact Format
- ALWAYS start with `# Release vX.Y.Z — Title` heading — standardized header
- ALWAYS include `**Date:** YYYY-MM-DD` immediately after the title — chronological tracking
- ALWAYS include a Highlights section summarizing the release in 1-2 sentences — quick orientation
- Include applicable category sections: Features, Fixes, Docs, Chores, Breaking Changes — conventional commit mapping
- ALWAYS include Full Changelog as the final section with commit hashes or compare links — traceability
- NEVER include empty category sections — only sections with content
- Include Cycle/State Artifacts links when design/plan docs exist — cross-referencing
- Per-release state docs live at `.beastmode/artifacts/release/YYYY-MM-DD-vX.Y.Z.md` — standard path
- Migration releases may include a Migration table — special case

## Consolidated Changelog
- ALWAYS maintain CHANGELOG.md at repo root — central release history
- Consolidate related minor releases into single entries — scannability
- Include version titles with personality matching the `Release vX.Y.Z — Title` convention — branded entries
- README should link to CHANGELOG.md — discoverability

## Commit Categorization
- ALWAYS categorize commits by type: feat, fix, docs, chore, refactor — conventional commits
- Map to changelog sections: Features, Fixes, Docs, Chores — standardized categories
- Breaking changes get their own section regardless of commit type — visibility
- Docs-only releases note "No code changes" in Full Changelog — transparency
