# Release Learnings

Friction and insights captured during release retros.

- **Version conflicts are structural, not accidental** (2026-03-04): Worktrees branch from older commits, so version files are always stale. Version-bearing files are limited to 3 (plugin.json, marketplace.json, session-start.sh) to minimize conflict surface.
- **Release retro must run before commit** (2026-03-04): Retro writes to `.beastmode/meta/` files. If retro runs after merge+cleanup (in checkpoint), those changes land on main uncommitted. Moving retro to 1-execute before the commit step ensures all outputs are captured.
- **Merge-only eliminates rebase conflicts** (2026-03-04): Rebasing replays each commit, so a single conflict can recur N times. Merge resolves everything once. Combined with reducing version files from 5 to 3 (dropping README badge and PRODUCT.md version), the release merge step is now conflict-free for typical feature branches.
