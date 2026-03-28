# Tech Stack

## Platform
- NEVER add package runtime dependencies — beastmode is markdown interpreted by Claude Code. GitHub API via `gh` CLI is an infrastructure dependency, not a packaged runtime dependency
- ALWAYS distribute via Claude Code marketplace — standard distribution channel
- Claude Code CLI provides skill execution runtime and subagent spawning — host environment
- Multi-step workflow with parallel agent spawning — execution model

## Dependencies
- ALWAYS use Git for version control and worktree isolation — core dependency
- NEVER introduce package managers — there's nothing to package
- Core components: Claude Code CLI (runtime), Anthropic Claude API (LLM backend), Git (VCS + worktrees), Markdown + YAML (docs + metadata), GitHub API via `gh` CLI (state externalization) — minimal stack with infrastructure dependency

## Development
- Testing is manual — invoke skills and verify behavior
- Install via: `claude plugin marketplace update` then `claude plugin update beastmode@beastmode-marketplace --scope project` — two-step install
- No build step, no automated linting — zero build infrastructure
