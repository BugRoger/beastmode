# Implement Context

## Agents
- NEVER stash, switch branches, or modify worktrees without explicit user request
- ALWAYS verify worktree context before modifying files
- NEVER guess file paths — verify they exist first
- Commits happen naturally during implementation — release owns the squash merge

## Testing
- ALWAYS verify L2 files contain project-specific content, not placeholder patterns
- NEVER skip brownfield verification after init
- Critical paths: brownfield execution, parallel agent spawning, content merge, atomic file writes, gate structure, task-runner integration

## GitHub Integration
- ALWAYS gate GitHub sync on `github.enabled` in config.yaml — skip entirely when false or missing
- ALWAYS use warn-and-continue for gh CLI calls — print warning, skip failed op, never block local workflow
- Manifest JSON is the local authority; GitHub is a synced mirror updated only at checkpoint boundaries
- ALWAYS use `_shared/github.md` for all GitHub operations — never inline gh CLI logic
- Label taxonomy: 12 labels across type (2), phase (7), status (3), gate (1) — status/review is dropped
- Epic lifecycle: created at design checkpoint, phase-advanced at each subsequent checkpoint, closed at release
- Feature lifecycle: created as sub-issues at plan checkpoint, set in-progress at implement prime, closed at implement checkpoint
