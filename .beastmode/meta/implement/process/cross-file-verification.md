# Cross-File Verification Patterns

## Observation 1
### Context
During worktree-artifact-alignment implementation, 2026-03-08. Task 11 (Wave 4) performed cross-file verification after all implementation tasks.
### Observation
Grep-based cross-file verification proved effective for confirming consistency across all modified files. The verification task searched for patterns that should only appear in specific files (e.g., `git worktree add` only in worktree-manager.md) and patterns that should appear in all checkpoint files (e.g., `Assert Worktree`). This caught the completeness of changes without re-reading every file in full.
### Rationale
A dedicated verification wave using grep searches is more efficient than re-reading all files. It scales well to large changesets and catches both presence and absence patterns. Plans should include a verification wave as the final task for multi-file changes.
### Source
.beastmode/artifacts/implement/2026-03-08-worktree-artifact-alignment-deviations.md
### Confidence
[LOW] — first observation
