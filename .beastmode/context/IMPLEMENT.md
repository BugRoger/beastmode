# Implement Context

Agent safety rules and testing strategy for implementation. Multi-agent collaboration requires explicit safety boundaries — never guess, always verify in code.

## Agents
Multi-agent safety rules: never stash, never switch branches, never modify worktrees unless explicitly requested. Git workflow for commits, pushes, and worktree context verification. Feature workflow with branch naming and release ownership.
@implement/agents.md

## Testing
Verification via brownfield discovery on real codebases. Success criteria: context L2 files populated with project-specific content, no placeholder patterns remaining. Critical paths: brownfield execution, parallel agent spawning, content merge, atomic file writes.
@implement/testing.md
