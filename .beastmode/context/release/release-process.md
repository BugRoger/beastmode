# Release Process

## Merge Strategy
- ALWAYS use `git merge --squash` to collapse feature branch into one commit on main — clean history
- NEVER rebase feature branch onto main before merging — per-commit replay causes constant conflicts
- Merge resolves conflicts once instead of per-commit replay — simpler resolution

## Retro Timing
- ALWAYS run retro before the release commit in execute phase — ensures meta changes included
- NEVER run retro in checkpoint for release — already executed in execute phase
- Retro runs at step 8, commit at step 9 — ordered sequence prevents untracked meta files

## Release Rollup
- ALWAYS prepare L0 update proposal from L1 summaries at release time — controlled L0 evolution
- Retro bubble propagates L2 -> L1 only; L0 updated at release time via proposal — scoped promotion
- BEASTMODE.md gains updated Capabilities/How It Works sections via L0 proposal mechanism — targeted updates

## Version File Management
- ALWAYS treat plugin.json as the version source of truth — single authority
- ALWAYS update: plugin.json, marketplace.json, CHANGELOG.md — three version files
- NEVER embed version in README or PRODUCT.md — reduced from 5 files in v0.6.1
