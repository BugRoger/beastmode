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

**Linting:**
- No automated linting configured
- Manual review of markdown and prompt quality

## Commands

```bash
# Install plugin
claude plugin marketplace update
claude plugin update beastmode@beastmode-marketplace --scope project

# Initialize project with beastmode
/beastmode install              # Initialize .beastmode/ structure
/beastmode init --brownfield    # Auto-populate context from codebase
/beastmode init --greenfield    # Interactive project setup

# Run core workflow phases
/design
/plan
/implement
/validate
/release

# Standalone utilities
/status
```

## Notes

- **No runtime dependencies:** Beastmode is a workflow/documentation system, not an executable application
- **Self-bootstrapping:** Uses its own skills to analyze and document codebases
- **Markdown-first:** All documentation and skill prompts are written in markdown
- **Parallel execution:** `/beastmode init --brownfield` spawns parallel Explore agents to auto-populate context
- **Version:** 0.3.1 (from plugin.json)
- **Author:** bugroger (github: BugRoger)

## Related Decisions
- Claude Code is the mandatory platform. See [session-tracking](../../state/design/2026-03-01-session-tracking.md)
- Markdown-first with no runtime dependencies. See [bootstrap-prefill](../../state/design/2026-03-01-bootstrap-prefill.md)
