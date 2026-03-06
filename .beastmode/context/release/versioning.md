# Versioning

Versioning strategy and release mechanics. Semantic versioning detected from plugin.json. Squash merge collapses feature branches into one commit on main. Archive tags preserve branch history. Commit messages follow GitHub release style.

## Version Detection
Version read from `.claude-plugin/plugin.json`. Semantic versioning: major.minor.patch. Changelog auto-generated from commit categorization.

1. ALWAYS read version from `.claude-plugin/plugin.json`
2. ALWAYS follow semantic versioning for bumps
3. Changelog generated from categorized commits (Features, Fixes, Artifacts)

## Commit Format
Release commits: `Release vX.Y.Z — Title` with categorized sections. One commit per version on main via squash merge.

1. ALWAYS use format: `Release vX.Y.Z — Title`
2. ALWAYS include categorized sections: Features, Fixes, Artifacts
3. NEVER create multiple commits per release on main

## Archive Strategy
Feature branch tips preserved as `archive/feature/<name>` tags before deletion. Full branch history accessible via archive tags.

1. ALWAYS tag feature branch tip before deletion: `archive/feature/<name>`
2. NEVER delete feature branches without archiving
3. `git log --oneline main` should read as a scannable release history
