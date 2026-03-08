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
