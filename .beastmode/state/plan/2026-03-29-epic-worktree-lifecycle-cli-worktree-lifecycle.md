# cli-worktree-lifecycle

**Design:** .beastmode/state/design/2026-03-29-epic-worktree-lifecycle.md
**Architectural Decisions:** see manifest

## User Stories

1. As a developer, I want to run `beastmode design <topic>` and have the CLI create a worktree, launch an interactive Claude session inside it, and persist the worktree for subsequent phases, so that I don't need the Justfile or knowledge of worktree internals.

2. As a developer, I want to run `beastmode plan <slug>` and have the CLI reuse the existing worktree from design (or create one if missing), run the SDK session inside it, and leave the worktree intact for implement, so that phase transitions are seamless.

3. As a developer, I want the watch loop (`beastmode watch`) to follow the same lifecycle semantics as manual `beastmode <phase>` — create-once, persist, squash-at-release — so that automated and manual execution behave identically.

4. As a developer, I want failed phases to leave the worktree as-is so I can retry the same phase without losing partial progress, so that error recovery is simple and idempotent.

## What to Build

### ensureWorktree() function

Add a new public function to the worktree module that wraps the create-or-reuse logic. It calls `create()` internally — if the worktree exists, it returns the existing info; if not, it creates one. Every phase command and watch loop dispatch calls this single function instead of `create()` directly. This makes the idempotent lifecycle explicit in the API surface.

### Unified phase command entry

Refactor `phaseCommand()` so every phase (including design) calls `ensureWorktree(slug)` first, then dispatches to the appropriate runner with `cwd` set to the worktree path. Design uses the interactive runner (spawns `claude` CLI with inherited stdio); all other phases use the SDK runner. Remove the current `--worktree` flag usage from the design runner — the CLI sets cwd directly instead.

### Flatten implement fan-out

Remove per-feature worktree creation from the implement phase. All parallel SDK sessions share the single epic worktree. The implement phase still fans out across features (parallel SDK sessions), but each session receives `cwd` pointing to the same epic worktree. Remove the per-feature worktree slug derivation (`${epicSlug}-${featureSlug}`). Remove post-implement merge coordination (no feature branches to merge). The merge coordinator module is preserved but unused for this flow.

### Watch loop alignment

Ensure the watch loop dispatcher calls `ensureWorktree()` with the same semantics as manual `beastmode <phase>`. The watch loop's `dispatchPhase()` should create or reuse the epic worktree, set cwd, and dispatch. Release teardown (archive, merge, remove) stays in both the phase command and watch loop — they share the same post-release cleanup path.

### Release teardown in phase.ts

After a successful release phase, `phaseCommand()` performs: archive branch tip, squash-merge to main, remove worktree, delete feature branch. This already partially exists — ensure it's the canonical path and the release skill's TRANSITION BOUNDARY is preserved for the git operations (squash-merge, tag, commit on main).

### Error recovery

Failed phases must NOT trigger worktree cleanup. The worktree stays dirty. Next invocation of the same phase calls `ensureWorktree()` which finds the existing worktree and reuses it. The watch loop re-dispatches automatically on the next poll cycle.

## Acceptance Criteria

- [ ] `ensureWorktree(slug)` creates a new worktree when none exists and returns its info
- [ ] `ensureWorktree(slug)` reuses an existing worktree without modification
- [ ] `beastmode design <topic>` creates a worktree and launches interactive session inside it
- [ ] `beastmode plan <slug>` reuses the design worktree (or creates if missing)
- [ ] `beastmode implement <slug>` runs all feature sessions in the single epic worktree (no per-feature worktrees)
- [ ] `beastmode validate <slug>` reuses the epic worktree
- [ ] `beastmode release <slug>` runs in worktree, then archives/merges/removes after success
- [ ] `beastmode watch` follows identical lifecycle semantics as manual commands
- [ ] Failed phases leave worktree intact for retry
- [ ] Integration test: full lifecycle design -> plan -> implement -> validate -> release
