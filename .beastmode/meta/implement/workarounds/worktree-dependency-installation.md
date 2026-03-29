# Worktree Dependency Installation

## Observation 1
### Context
During cmux-client implementation, 2026-03-29. Worktree created for feature branch did not have node_modules available.
### Observation
bun install was required in the worktree before tests could run. Git worktrees share the git directory but not necessarily the node_modules or other build artifacts. This was a blocking deviation — tests could not execute until resolved.
### Rationale
Worktree setup should include dependency installation as a standard step. Without it, any task requiring test execution or type checking will fail with missing module errors.
### Source
.beastmode/artifacts/implement/2026-03-29-cmux-integration-revisited-cmux-client.output.json
### Confidence
[LOW] — first-time observation, single feature
