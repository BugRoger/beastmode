# Tech Stack

Claude Code plugin platform. Markdown + YAML frontmatter for skill definitions. No runtime dependencies — pure agentic workflow system interpreted directly by Claude Code. Distributed via Claude Code marketplace.

## Platform
Claude Code is the host environment. Skills execute as agentic workflows. Multi-step workflow with parallel agent spawning.

1. NEVER add runtime dependencies — beastmode is markdown interpreted by Claude Code
2. ALWAYS distribute via Claude Code marketplace
3. Claude Code CLI provides skill execution runtime and subagent spawning

## Dependencies
No traditional package dependencies. Core components: Claude Code CLI (runtime), Anthropic Claude API (LLM backend), Git (version control + worktrees), Markdown + YAML (documentation + metadata).

1. ALWAYS use Git for version control and worktree isolation
2. NEVER introduce package managers — there's nothing to package

## Development
No build step. Manual testing via skill invocation. No automated linting.

1. Testing is manual — invoke skills and verify behavior
2. Install via: `claude plugin marketplace update` then `claude plugin update beastmode@beastmode-marketplace --scope project`
