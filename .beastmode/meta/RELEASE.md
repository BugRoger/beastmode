# Release Meta

Learnings from release phases. Key pattern: worktrees branch from older commits so version files are always stale — the release flow must sync with main before bumping.

## Defaults

<!-- From plugin -->

## Project Overrides

<!-- User additions -->

## Learnings

- **Version conflicts are structural, not accidental** (2026-03-04): Worktrees branch from older commits, so version files are always stale. The release flow must sync with main before bumping. Also, `hooks/session-start.sh` was missing from the version bump list — all version-bearing files must be enumerated explicitly.
- **Release retro must run before commit** (2026-03-04): Retro writes to `.beastmode/meta/` files. If retro runs after merge+cleanup (in checkpoint), those changes land on main uncommitted. Moving retro to 1-execute before the commit step ensures all outputs are captured.
