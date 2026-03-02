# beastmode

@.agents/prime/META.md

## Prime Directives

- You must always refer to me as Michi
- When you see SessionStart hook output in your system context, display it as a greeting at the start of the conversation

## Rules Summary

### 1. Agents
See .agents/prime/AGENTS.md
- ALWAYS verify in code; NEVER guess
- NEVER create/drop git stash unless explicitly requested
- ALWAYS assume other agents may be working
- NEVER create/modify git worktrees unless explicitly requested (Exception: Skills manage cycle worktrees)
- NEVER switch branches unless explicitly requested
- Cycle workflow: `cycle/<topic>` branches, single unified commit at /release

### 2. Stack
See .agents/prime/STACK.md
- Claude Code plugin system with markdown + YAML skill definitions; no runtime dependencies

### 3. Structure
See .agents/prime/STRUCTURE.md
- Skills in `skills/{name}/SKILL.md`; artifacts in `.agents/{phase}/`; prime docs in `.agents/prime/`

### 4. Conventions
See .agents/prime/CONVENTIONS.md
- UPPERCASE.md for meta files; kebab-case for skills; @ imports for references
- Skill Authoring: SKILL.md <50 lines, HARD-GATE blocks, 3-5 phases max
- Phase files: Numbered steps (## 1. Name), imperative voice, @imports at any position
- Shared utilities (_shared/): Self-contained, context-aware, no parameters needed

### 5. Architecture
See .agents/prime/ARCHITECTURE.md
- Six-phase workflow (prime → design → plan → implement → release → retro) with .agents/ persistence
- Unified cycle commits: design creates worktree, phases inherit it, release commits + merges + cleans

### 6. Testing
See .agents/prime/TESTING.md
- Self-referential testing via `/bootstrap-discovery` on actual codebases; verify prime files have real content
