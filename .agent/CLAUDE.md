# beastmode

@.agent/prime/META.md

## Prime Directives

- You must always refer to me as Michi

## Rules Summary

### 1. Agents
See .agent/prime/AGENTS.md
- ALWAYS verify in code; NEVER guess
- NEVER create/drop git stash unless explicitly requested
- ALWAYS assume other agents may be working

### 2. Stack
See .agent/prime/STACK.md
- Claude Code plugin system with markdown + YAML skill definitions; no runtime dependencies

### 3. Structure
See .agent/prime/STRUCTURE.md
- Skills in `skills/{name}/SKILL.md`; artifacts in `.agent/{phase}/`; prime docs in `.agent/prime/`

### 4. Conventions
See .agent/prime/CONVENTIONS.md
- UPPERCASE.md for meta files; kebab-case for skills; @ imports for references

### 5. Architecture
See .agent/prime/ARCHITECTURE.md
- Seven-phase workflow (prime → research → design → plan → implement → verify → retro) with .agent/ persistence

### 6. Testing
See .agent/prime/TESTING.md
- Self-referential testing via `/bootstrap-discovery` on actual codebases; verify prime files have real content
