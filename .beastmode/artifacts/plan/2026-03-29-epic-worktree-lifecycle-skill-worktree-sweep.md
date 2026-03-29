# skill-worktree-sweep

**Design:** .beastmode/state/design/2026-03-29-epic-worktree-lifecycle.md
**Architectural Decisions:** see manifest

## User Stories

1. As a developer, I want to run `beastmode design <topic>` and have the CLI create a worktree, launch an interactive Claude session inside it, and persist the worktree for subsequent phases, so that I don't need the Justfile or knowledge of worktree internals.

2. As a developer, I want to run `beastmode plan <slug>` and have the CLI reuse the existing worktree from design (or create one if missing), run the SDK session inside it, and leave the worktree intact for implement, so that phase transitions are seamless.

## What to Build

### Delete worktree-manager.md

Remove `skills/_shared/worktree-manager.md` entirely. Its three operations (Derive Feature Name, Resolve Artifact, Resolve Manifest) are replaced by:

- **Derive Feature Name** — CLI's `slugify()` owns this; skills receive the slug as an argument
- **Resolve Artifact** — inline the glob pattern directly in each phase's prime step (it's a 3-line convention: glob, check empty, take latest). No shared import needed for a simple convention
- **Resolve Manifest** — same inline treatment

### Reword skill files

Sweep ~15 skill files that reference worktrees. For each file:

- Replace "worktree directory name" with "feature slug" or "epic slug"
- Remove `[worktree-manager.md](../_shared/worktree-manager.md)` link references
- Remove "MUST be called AFTER entering the worktree" language (skills don't know about worktrees)
- Replace "From the worktree, locate" with "Locate" or "In the current directory"
- Update artifact resolution steps to inline the glob pattern instead of referencing worktree-manager
- Keep the release skill's TRANSITION BOUNDARY intact (those are git operations)

### Specific file changes

**design/phases/3-checkpoint.md** — Remove "Derive Feature Name" step; the feature slug comes from the skill argument. Reword "worktree directory name" to "feature slug" in artifact path descriptions.

**plan/phases/0-prime.md** — Remove worktree-manager link; inline the artifact resolution glob for design artifacts.

**plan/phases/3-checkpoint.md** — Reword "worktree directory name" to "feature slug".

**implement/SKILL.md** — Remove "enter worktree" from phase 0 description. Remove "worktree isolation only" from constraints note.

**implement/phases/0-prime.md** — Remove worktree-manager link; inline manifest resolution glob. Reword "worktree directory name" to "epic slug".

**implement/references/constraints.md** — Rewrite "Worktree Isolation" section. Remove Justfile reference. Reword to describe the CLI providing the working directory.

**validate/phases/0-prime.md** — Remove worktree-manager link; inline manifest resolution glob.

**validate/phases/3-checkpoint.md** — Reword "worktree directory name" to "feature slug".

**release/phases/0-prime.md** — Replace "From the worktree, locate" with "Locate".

**release/phases/3-checkpoint.md** — Keep TRANSITION BOUNDARY. Reword "NOT the worktree" to "NOT the feature branch working directory" or similar.

**beastmode/subcommands/status.md** — Update worktree scanning to reflect new paths if needed, or simplify.

**beastmode/assets/.beastmode/BEASTMODE.md** — Remove "External orchestrator (Justfile) manages worktrees" line. Update to reflect CLI-managed lifecycle.

**_shared/retro.md** — Replace "Worktree root" with "Working directory" in session context templates.

## Acceptance Criteria

- [ ] `skills/_shared/worktree-manager.md` is deleted
- [ ] No skill file contains the string "worktree-manager"
- [ ] No skill file references "worktree directory name" (replaced with "feature slug" or "epic slug")
- [ ] Artifact resolution is inlined in each phase's prime step
- [ ] Release skill's TRANSITION BOUNDARY and squash-merge logic are preserved
- [ ] No skill file references the Justfile
- [ ] Retro templates use "Working directory" instead of "Worktree root"
- [ ] All skill files are syntactically valid markdown after changes
