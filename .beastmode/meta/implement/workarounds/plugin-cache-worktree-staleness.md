# Plugin Cache Worktree Staleness

## Observation 1
### Context
During meta-retro-rework implementation, 2026-03-07. Retro checkpoint phase loading skill files.
### Observation
The checkpoint phase loaded retro.md from the plugin cache, which contained the old version (with learnings/sops/overrides gates). The worktree had the new version (with records/promotions gates). The controller had to manually read the worktree-local version of retro.md to use the correct flow. Plugin cache does not reflect worktree-local modifications to skill files.
### Rationale
Any feature that modifies skill files will encounter this: the plugin cache serves the main-branch version, not the worktree version. Workaround: explicitly read skill files from the worktree path rather than relying on cached resolution.
### Source
state/plan/2026-03-07-meta-retro-rework.md
### Confidence
[LOW] — first observation
