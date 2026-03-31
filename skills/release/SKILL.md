---
name: release
description: "Prepare releases with automated changelog generation — detects next semver version, categorizes commits by type, generates CHANGELOG.md entries, commits, and merges or creates a PR. Use when the user wants to cut a release, bump the version, generate a changelog, write release notes, or ship a new version."
---

# /release

Detect next version via semver, categorize commits, generate changelog, commit, merge or PR, and tag the release.

<HARD-GATE>
Execute @_shared/task-runner.md now.

Your FIRST tool call MUST be TodoWrite with parsed phases from below.
Do not output anything else first.
Do not skip this for "simple" tasks.

Example TodoWrite structure:
- [ ] Phase 0: Prime — load artifacts, determine version
- [ ] Phase 1: Execute — categorize commits, generate changelog, commit, merge/PR, tag
- [ ] Phase 2: Validate — verify release completeness
- [ ] Phase 3: Checkpoint — retro, status update
</HARD-GATE>

## Phases

0. [Prime](phases/0-prime.md) — Load artifacts, determine version
1. [Execute](phases/1-execute.md) — Categorize commits, generate changelog, commit, merge/PR, tag
2. [Validate](phases/2-validate.md) — Verify release completeness. If issues found → fix before proceeding
3. [Checkpoint](phases/3-checkpoint.md) — Retro, status update
