# Watch Convergence

**Design:** .beastmode/state/design/2026-03-29-manifest-only-status.md
**Architectural Decisions:** see manifest

## User Stories

2. As the watch loop, I use the same canonical scanner as status so there's one code path for epic discovery

## What to Build

Remove the inline scanner fallback from watch-command.ts. The `scanEpics()` wrapper function at the top of watch-command.ts currently tries to dynamically import state-scanner.ts and falls back to `scanEpicsInline()` on import failure. After this change, it should delegate directly to the canonical scanner without a fallback — if the import fails, it should throw rather than silently degrading.

Delete `scanEpicsInline()` (~100 lines) and the `readProgress()` helper that was only used by it.

Update the `EpicState` interface in watch-types.ts to match the updated state-scanner interface: remove `costUsd` field (or keep it optional for backwards compatibility if other consumers depend on it).

Verify that the watch loop's dependency injection (`WatchDeps.scanEpics`) still works correctly with the updated scanner return type.

## Acceptance Criteria

- [ ] scanEpicsInline() deleted from watch-command.ts
- [ ] readProgress() helper deleted from watch-command.ts
- [ ] scanEpics() in watch-command.ts delegates directly to state-scanner (no try/catch fallback)
- [ ] watch-types.ts EpicState updated to match state-scanner EpicState
- [ ] Watch loop still compiles and the dep injection wiring works
- [ ] `bun test` passes
