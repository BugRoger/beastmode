# Release Learnings

Friction and insights captured during release retros.

- **Version conflicts are structural, not accidental** (2026-03-04): Worktrees branch from older commits, so version files are always stale. Version-bearing files are limited to 3 (plugin.json, marketplace.json, session-start.sh) to minimize conflict surface.
- **Release retro must run before commit** (2026-03-04): Retro writes to `.beastmode/meta/` files. If retro runs after merge+cleanup (in checkpoint), those changes land on main uncommitted. Moving retro to 1-execute before the commit step ensures all outputs are captured.
- **Merge-only eliminates rebase conflicts** (2026-03-04): Rebasing replays each commit, so a single conflict can recur N times. Merge resolves everything once. Combined with reducing version files from 5 to 3 (dropping README badge and PRODUCT.md version), the release merge step is now conflict-free for typical feature branches. *(Note: mechanism evolved to `git merge --squash` in v0.11.0 — core anti-rebase insight still valid.)*

### 2026-03-05: squash-per-release
- **Squash merge supersedes merge-only as the conflict resolution strategy**: `git merge --squash` collapses all branch commits into a single staged changeset on main, which eliminates both rebase conflicts AND merge commit noise. The previous "merge-only" learning remains directionally correct but the mechanism has changed.
- **Archive tags preserve branch history that squash merge destroys on main**: When squash-merging, individual commit history on the feature branch disappears from main's DAG. Tagging branch tips as `archive/feature/<name>` before deletion keeps the full commit graph reachable for future reference.
- **Step ordering matters when squash merge separates staging from committing**: `git merge --squash` stages changes but does NOT commit. The release skill's step 9 (merge) and step 10 (commit) must be in that exact order. When a git operation splits into two phases (stage vs commit), ensure the plan models both halves explicitly.
- **Version files remain stale with squash merge — structural issue persists**: The existing "version conflicts are structural" learning confirmed again. Worktree branched from v0.10.0-era while v0.10.1 existed. Squash merge does not fix this — it's inherent to the worktree-branching model.

### 2026-03-06: knowledge-hierarchy-format
- **Documentation-only releases skip validate naturally**: Features touching only markdown files have no quality gates to run. The validate phase produces no meaningful output for structural/documentation refactors.
- **Retro agent extension validates "reuse existing systems" pattern**: Adding `format_violation` as a finding type (+52 lines) extends existing retro infrastructure rather than creating new tooling. Check whether an existing system already produces the right signals before building new infrastructure.
- **Retro findings catch internal inconsistencies the implementation missed**: Write Protection section still referenced "L3 (state/)" after L3 was redefined as records under context/. Hierarchy Awareness still told agents to check "Related Decisions" headers that the Format Enforcement section explicitly forbids. Both missed during implementation and validate.
