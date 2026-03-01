# beastmode

@.agents/prime/META.md

## Prime Directives

- You must always refer to me as Michi

## Rules Summary

### 1. Agents
See .agents/prime/AGENTS.md
- ALWAYS verify in code; NEVER guess
- NEVER create/drop git stash unless explicitly requested
- ALWAYS assume other agents may be working
- NEVER create/modify git worktrees unless explicitly requested
- NEVER switch branches unless explicitly requested

### 2. Stack
See .agents/prime/STACK.md
- Claude Code plugin system with markdown + YAML skill definitions; no runtime dependencies

### 3. Structure
See .agents/prime/STRUCTURE.md
- Skills in `skills/{name}/SKILL.md`; artifacts in `.agents/{phase}/`; prime docs in `.agents/prime/`

### 4. Conventions
See .agents/prime/CONVENTIONS.md
- UPPERCASE.md for meta files; kebab-case for skills; @ imports for references

### 5. Architecture
See .agents/prime/ARCHITECTURE.md
- Six-phase workflow (prime → design → plan → implement → release → retro) with .agents/ persistence

### 6. Testing
See .agents/prime/TESTING.md
- Self-referential testing via `/bootstrap-discovery` on actual codebases; verify prime files have real content
