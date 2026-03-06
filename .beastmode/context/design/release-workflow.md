# Release Workflow

Release skill encompasses version detection, commit sequencing, changelog generation, and merge strategy. Retro runs inside execute (before commit) rather than checkpoint to ensure meta changes are included in the release commit.

## Version Detection
Conventional commit parsing determines version bump (feat = minor, fix = patch, breaking = major). `plugin.json` is the source of truth for current version.

1. ALWAYS use plugin.json as version source of truth — not package.json or tags
2. NEVER bump version without conventional commit evidence

## Commit Sequence
Sync with main, bump versions in plugin.json/marketplace.json/session-start.sh, run retro before commit, squash-merge to main. No interim commits during feature work — single commit at release.

1. ALWAYS run retro before the release commit — ensures meta changes are included
2. NEVER make interim commits during design/plan/implement — all commits deferred to release
3. ALWAYS use GitHub release style commit messages

## Changelog Generation
Format: version + title + date. Commits categorized by conventional commit prefix. CHANGELOG.md at repo root.

1. ALWAYS categorize by conventional commit prefix (feat, fix, refactor, etc.)

## Merge Strategy
Merge-only with squash. Archive branch tips before deletion with `archive/feature/<name>` tags. Interactive merge options: merge locally (recommended), push and create PR, keep as-is, discard.

1. ALWAYS archive branch tip before squash merge — `git tag archive/feature/<name>`
2. NEVER rebase at merge time — merge-only strategy
