# STACK - Technology Stack

## Purpose

Documents the technology stack, dependencies, and versions used in this project.

## Core Stack

**Platform:**
- Framework: Claude Code plugin system
- Language: Markdown + YAML frontmatter (for skill definitions)
- Distribution: Claude Code marketplace

**Architecture:**
- Type: Agentic workflow system (not a traditional application)
- Execution model: Multi-step workflow with parallel agent spawning
- Interface: Claude Code `/skills` command system

## Key Dependencies

Beastmode is a meta-framework for Claude Code — it doesn't have traditional package dependencies. Instead, it defines:

| Component | Purpose |
|-----------|---------|
| Claude Code CLI | Host environment and skill execution runtime |
| Anthropic Claude API | LLM backend (via Claude Code) |
| Git | Version control and worktree isolation for `/implement` phase |
| Markdown + YAML | Documentation format and skill metadata |

## Development Tools

**Build:**
- None required — markdown/YAML files are interpreted directly

**Testing:**
- Manual testing via `/skills` command invocation
- Self-referential: beastmode itself provides the `/verify` skill for testing

**Linting:**
- No automated linting configured
- Manual review of markdown and prompt quality

## Commands

```bash
# Install plugin
/plugin marketplace add bugroger/overrides-marketplace
/plugin install beastmode@overrides-marketplace

# Initialize project with beastmode
/bootstrap

# Discover and populate prime documentation
/bootstrap-discovery

# Run core workflow phases
/prime
/research
/design
/plan
/implement
/verify
/retro

# Access individual skills
/bootstrap              # Initialize .agent/ structure
/bootstrap-discovery   # Autonomous codebase analysis
/bootstrap-wizard      # Interactive project setup
/plan                  # Create implementation plans
/implement             # Execute plans in worktree
/verify                # Run verification tests
/retro                 # Capture learnings
```

## Notes

- **No runtime dependencies:** Beastmode is a workflow/documentation system, not an executable application
- **Self-bootstrapping:** Uses its own skills to analyze and document codebases
- **Markdown-first:** All documentation and skill prompts are written in markdown
- **Parallel execution:** bootstrap-discovery spawns 5 Explore agents simultaneously for STACK, STRUCTURE, CONVENTIONS, ARCHITECTURE, TESTING analysis
- **Version:** 0.1.6 (from plugin.json)
- **Author:** bugroger (github: BugRoger)
