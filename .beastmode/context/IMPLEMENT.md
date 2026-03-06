# Implement Context

Agent safety rules and testing strategy for implementation. Multi-agent collaboration requires explicit safety boundaries — never guess, always verify in code. File-isolated waves enable reliable parallel dispatch.

## Agents
Multi-agent safety rules: never stash, never switch branches, never modify worktrees unless explicitly requested. Git workflow for commits, pushes, and worktree context verification. Feature workflow with branch naming and release ownership.

1. NEVER stash, switch branches, or modify worktrees without explicit user request
2. ALWAYS verify worktree context before modifying files
3. NEVER guess file paths — verify they exist first
4. Commits happen naturally during implementation — release owns the squash merge

## Testing
Verification via brownfield discovery on real codebases. Success criteria: context L2 files populated with project-specific content, no placeholder patterns remaining. Critical paths: brownfield execution, parallel agents, content merge, atomic writes.

1. ALWAYS verify L2 files contain project-specific content, not placeholder patterns
2. NEVER skip brownfield verification after init
3. Critical paths: brownfield execution, parallel agent spawning, content merge, atomic file writes, gate structure, task-runner integration
