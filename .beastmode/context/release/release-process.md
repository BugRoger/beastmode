# Release Process

## Merge Strategy
- ALWAYS use `git merge --squash` to collapse feature branch into one commit on main — clean history
- NEVER rebase feature branch onto main before merging — per-commit replay causes constant conflicts
- Merge resolves conflicts once instead of per-commit replay — simpler resolution

## Retro Timing
- ALWAYS run retro before the release commit in execute phase — ensures context updates included in squash merge
- NEVER run retro in checkpoint for release — already executed in execute phase
- ALWAYS pass all phase artifacts (design, plan, implement, validate, release) to the context walker in a single session — one coherent pass per release
- Retro runs at step 8, commit at step 9 — ordered sequence prevents untracked context files

## Release Rollup
- ALWAYS prepare L0 update proposal from L1 summaries at release time — controlled L0 evolution
- Retro propagates L3 -> L2 -> L1 automatically; only L0 (BEASTMODE.md) requires human approval via `retro.beastmode` gate — scoped promotion
- BEASTMODE.md gains updated process sections via L0 proposal mechanism — targeted updates

## Version File Management
- ALWAYS treat plugin.json as the version source of truth — single authority
- ALWAYS update: plugin.json, marketplace.json, CHANGELOG.md — three version files
- NEVER embed version in README or PRODUCT.md — reduced from 5 files in v0.6.1
