## Problem Statement

Beastmode features are driven one at a time with manual phase invocations via Justfile recipes. Prior orchestration attempts achieved 80% reliability (skill-internal CronCreate polling) and 60% reliability (native Claude Code worktree features) due to session-scoped lifetimes (7-day max, dies with process), worktree data-loss bugs (3 open paths in Claude Code), no automatic merge coordination, and manifest convergence failures when parallel agents update isolated copies.

## Solution

A TypeScript CLI (`beastmode`) built with Bun and the Claude Agent SDK that provides manual phase execution (`beastmode run`) and autonomous multi-epic pipeline orchestration (`beastmode watch`). The CLI owns worktree lifecycle externally (create before, merge after, remove when done), replacing both the Justfile orchestrator and the CronCreate-based pipeline design. It lives in `cli/` with its own `package.json`, separate from the plugin's markdown skills.

## User Stories

1. As a developer, I want to run `beastmode run plan foo` so that a single phase executes in a worktree with streaming output, replacing `just plan foo`.
2. As a developer, I want to run `beastmode watch` so that all epics with completed designs are automatically driven through plan -> release without manual phase invocations.
3. As a developer, I want the watch loop to dispatch multiple epics in parallel so that features across epics don't queue behind each other.
4. As a developer, I want implement-phase work to fan out one Claude session per feature so that features within an epic are built in parallel.
5. As a developer, I want the merger to simulate conflicts before merging and optimize merge order so that avoidable conflicts don't waste agent time.
6. As a developer, I want the watch loop to immediately re-scan an epic when a phase completes so that epics progress through phases in minutes, not poll cycles.
7. As a developer, I want the watch loop to pause an epic and notify me when it hits a human gate so that I retain control over decisions I marked as requiring human judgment.
8. As a developer, I want `beastmode status` to show epic state and cost-to-date so that I understand pipeline progress and spend without running Claude.

## Implementation Decisions

- CLI name: `beastmode`. Commands: `run <phase> <args>`, `watch`, `status`
- Runtime: Bun. Native TypeScript execution, no compile step for development. `bun link` for PATH installation
- SDK: `@anthropic-ai/claude-agent-sdk` for typed session management, streaming, cost tracking, AbortController cancellation
- Directory: `cli/` with its own `package.json`. Separate from plugin distribution. Skills remain dependency-free markdown
- Worktree lifecycle: CLI-owned. Creates worktree with `feature/<slug>` branch detection (rewrite of `worktree-create.sh` in TS), points SDK session at it via `cwd`, merges after completion, removes when done
- Phase invocation: SDK `query()` with `prompt: "/beastmode:<phase> <args>"`, `settingSources: ['project']`, `allowedTools: ['Skill', ...]`, `permissionMode: 'bypassPermissions'`
- Design phase exception: `beastmode run design` spawns interactive Claude via `Bun.spawn` with inherited stdio (not the SDK), since design requires human interaction
- Watch mode: foreground process (Ctrl+C to stop). 60-second poll interval (configurable via `cli.interval` in config.yaml). Event-driven re-scan on session completion — poll is the safety net
- Concurrency: no cap. Parallel epics, parallel features within epics. API rate limits are the natural governor
- Merge strategy: pre-merge conflict simulation via `git merge-tree` to determine optimal merge order. Sequential merge in optimized order. Conflict resolution: spawn a dedicated Claude session to resolve
- Recovery: state files are the recovery point, not sessions. On startup, scan for existing worktrees with uncommitted changes. Re-dispatch from last committed state. Lockfile (`cli/.beastmode-watch.lock`) prevents duplicate watch instances
- Gate handling in watch mode: human gates pause the epic, log to stdout. User runs `beastmode run <phase> <slug>` manually to proceed
- Config: reuses `.beastmode/config.yaml` with new `cli:` section for poll interval and CLI-specific settings
- Justfile: kept as thin alias layer (`just plan foo` → `beastmode run plan foo`)
- WorktreeCreate hook: rewritten in TypeScript inside the CLI. Shell hook (`hooks/worktree-create.sh`) removed
- Status: implemented in CLI as fast TS state scan. `/beastmode status` skill dropped
- Skill router (`/beastmode`): unchanged. Keeps init, ideas, setup-github subcommands
- Cost tracking: per-dispatch run log appended to `.beastmode-runs.json` with epic, phase, feature, cost_usd, duration_ms, exit_status, timestamp
- Streaming: `beastmode run` streams SDK messages to terminal in real time

## Testing Decisions

- Test the state scanner: given a set of state files and manifests, verify correct next-action derivation per epic
- Test the merge ordering: given N branches with known overlapping files, verify `git merge-tree` simulation produces optimal order
- Test worktree manager: create, branch detection (existing feature branch vs new), cleanup
- Test config parsing: valid config, missing cli section, missing gates
- Test the CLI argument parser: all command variants, edge cases
- Prior art: the existing `/beastmode status` skill tests the same state scanning logic; the `worktree-create.sh` tests the same branch detection pattern

## Out of Scope

- Agent monitoring dashboard or TUI (deferred — `beastmode status` covers state, agent visibility is a separate feature)
- Multi-model support (Claude only — no Codex/Gemini routing)
- Distributed/remote execution (single machine, local worktrees)
- Plugin integration (CLI is a separate install, not bundled with plugin)
- Design phase automation (interactive by nature, requires human)
- Crash recovery for orphaned Claude sessions (re-dispatch from state is sufficient)
- tmux integration (SDK manages subprocesses directly)

## Further Notes

- The Claude Agent SDK spawns the `claude` CLI as a subprocess — same process model as the Justfile, but with typed streaming and session management
- Prior decision #6 (no runtime dependencies) is explicitly overridden: the CLI is a separate package with its own dependency story
- Both existing orchestrator PRDs (2026-03-28-external-orchestrator.md, 2026-03-28-orchestrator.md) are superseded by this design
- Community research (73+ repos, 829 GitHub issues) confirms external harness as the consensus architecture for reliable parallel agent orchestration
- Anthropic's own engineering blog recommends file-based state and minimal harness complexity — every component is a bet against model capability

## Deferred Ideas

- Agent visibility: `beastmode agents` command showing active sessions, resource usage, progress (needs SDK streaming introspection)
- Cost budgets: `cli.max_budget_usd` per epic or global cap, with auto-pause when exceeded
- Webhook-triggered orchestration: GitHub webhook fires on design PRD merge, triggers watch dispatch
- Pre-merge conflict detection as standalone tool (the `clash` pattern — useful beyond beastmode)
- `beastmode compile` to produce a single self-contained binary via `bun compile`
