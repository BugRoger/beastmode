# cli-scaffold

**Design:** .beastmode/state/design/2026-03-28-typescript-pipeline-orchestrator.md
**Architectural Decisions:** see manifest

## User Stories

1. As a developer, I want to run `beastmode run plan foo` so that a single phase executes in a worktree with streaming output, replacing `just plan foo`.
8. As a developer, I want `beastmode status` to show epic state and cost-to-date so that I understand pipeline progress and spend without running Claude.

## What to Build

Bootstrap the `cli/` directory with a Bun-native TypeScript project. The entry point parses commands (`run`, `watch`, `status`) and routes to the appropriate handler module. A config parser reads `.beastmode/config.yaml` and exposes gate modes, GitHub settings, and CLI-specific settings from a new `cli:` section (poll interval, etc.). The `package.json` includes `@anthropic-ai/claude-agent-sdk` as a dependency and configures `bun link` for PATH installation as the `beastmode` command. Command handlers can be stubs initially — other features fill them in.

## Acceptance Criteria

- [ ] `cli/` directory exists with `package.json`, `src/index.ts`, and TypeScript configuration
- [ ] `beastmode run plan foo` routes to the run command handler (stub is acceptable)
- [ ] `beastmode watch` routes to the watch command handler (stub)
- [ ] `beastmode status` routes to the status command handler (stub)
- [ ] Config parser reads `.beastmode/config.yaml` and exposes gate modes and cli settings
- [ ] `bun link` registers the `beastmode` command on PATH
- [ ] `package.json` declares `@anthropic-ai/claude-agent-sdk` dependency
