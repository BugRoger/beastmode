# Tech Stack

## Platform
- Skills remain dependency-free markdown interpreted by Claude Code — no runtime dependencies in the plugin
- CLI (`cli/`) is a separate TypeScript package with its own `package.json` — independent dependency story from the plugin
- ALWAYS distribute plugin via Claude Code marketplace — standard distribution channel
- CLI installed via `bun link` for PATH availability — no global package publish

## CLI Runtime
- Runtime: Bun — native TypeScript execution, no compile step for development
- SDK: `@anthropic-ai/claude-agent-sdk` for typed session management, streaming, cost tracking, AbortController cancellation
- CLI name: `beastmode` with commands `run`, `watch`, `status`
- ALWAYS use markdown + YAML frontmatter for skill definitions — skills are not code

## Dependencies
- ALWAYS use Git for version control and worktree isolation — core dependency
- Plugin components: Claude Code CLI (runtime), Anthropic Claude API (LLM backend), Git (VCS + worktrees), Markdown + YAML (docs + metadata), GitHub API via `gh` CLI (state externalization) — minimal plugin stack
- CLI components: Bun (runtime), Claude Agent SDK (session management), Git (worktree lifecycle), chalk (logger color output) — CLI-specific stack

## Development
- Plugin testing is manual — invoke skills and verify behavior
- CLI testing via Bun test runner — state scanner, merge ordering, worktree manager, config parsing, argument parser
- Plugin install via: `claude plugin marketplace update` then `claude plugin update beastmode@beastmode-marketplace --scope project`
- CLI install via: `cd cli && bun install && bun link`
