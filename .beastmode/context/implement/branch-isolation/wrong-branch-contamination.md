# Wrong Branch Contamination

**Context:** manifest-absorption github-sync-separation (2026-04-05). Agents committed to `impl/manifest-absorption--xstate-store-bridge` (adjacent wave-2 feature) instead of `impl/manifest-absorption--github-sync-separation`. Caught only because Task 6 was controller-level verification; cherry-pick required.

**Decision:** Controller MUST verify `git branch --show-current` matches the expected `impl/<slug>--<feature-name>` at the start of Write Plan, before any task is written or dispatched — not just at agent dispatch time in Prime.

**Rationale:** Parallel wave execution runs two features in sequence across the same worktree. After wave-2 feature A completes its checkpoint rebase, the worktree is on the worktree branch; the impl branch for feature B is then checked out. If the controller writes tasks and dispatches before verifying, agents inherit whatever branch was last active. The contamination is silent — agents commit successfully, BDD verification passes against the right codebase state, and the wrong branch carries commits that the rebase will duplicate.
