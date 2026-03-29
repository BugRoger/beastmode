# Release: epic-worktree-lifecycle

**Version:** v0.31.0
**Date:** 2026-03-29

## Highlights

CLI becomes the sole owner of worktree lifecycle. One worktree per epic, created lazily, persisted across all phases, squash-merged at release. Skills are now completely worktree-blind. Justfile and WorktreeCreate hook deleted.

## Features

- **CLI worktree lifecycle** — `ensureWorktree()` creates or reuses a single worktree per epic; all phases share it via cwd injection
- **Cancel command** — `beastmode cancel <slug>` archives branch tip, removes worktree, deletes local branch, updates manifest, closes GitHub epic
- **Skill worktree sweep** — Removed worktree references from ~16 skill files; skills receive feature slug as argument, never touch worktree internals
- **Justfile and hook deletion** — Deleted `Justfile`, `hooks/worktree-create.sh`, `skills/_shared/worktree-manager.md`; removed `WorktreeCreate` from `hooks/hooks.json`
- **Implement fan-out flattened** — Parallel SDK sessions share the epic worktree directly; no per-feature worktrees or merge-coordinator involvement

## Full Changelog

- `a1a1689` design(epic-worktree-lifecycle): checkpoint
- `59cb2ba` design(epic-worktree-lifecycle): release skill keeps main operations
- `9a5bc83` plan(epic-worktree-lifecycle): checkpoint
- `47a2614` implement(delete-justfile-hooks): checkpoint
- `5b61030` implement(cancel-command): checkpoint
- `e6ae3be` implement(skill-worktree-sweep): checkpoint
- `52cf0d3` implement(cli-worktree-lifecycle): converge manifest status
- `eb4785c` implement(cli-worktree-lifecycle): flatten runImplementFanOut to share epic worktree
- `27bc059` validate(epic-worktree-lifecycle): checkpoint

## Artifacts

- Design: .beastmode/state/design/2026-03-29-epic-worktree-lifecycle.md
- Plan: .beastmode/state/plan/2026-03-29-epic-worktree-lifecycle.manifest.json
- Validate: .beastmode/state/validate/2026-03-29-epic-worktree-lifecycle.md
- Release: .beastmode/state/release/2026-03-29-epic-worktree-lifecycle.md
