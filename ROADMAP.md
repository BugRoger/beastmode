# Roadmap

> What's shipped, what's next, and what we're not building.

## Now

Shipped and working in the current release.

- **Five-phase workflow** — design → plan → implement → validate → release
- **Configurable HITL gates** — `.beastmode/config.yaml` with `human`/`auto` modes per gate
- **Context persistence** — `.beastmode/` artifact storage survives across sessions
- **Meta layer** — phase retros capture findings that inform future sessions
- **Git worktree isolation** — each feature gets its own worktree and branch
- **Brownfield discovery** — `/beastmode init` auto-populates context from existing codebases
- **Progressive knowledge hierarchy** — L0/L1/L2/L3 with fractal progressive enhancement
- **Confidence-gated meta promotion** — L3 records use confidence tags with frequency-based promotion to L1 Procedures
- **Checkpoint restart** — re-run any phase by passing its artifact path (e.g., `/plan .beastmode/artifacts/design/...`)
- **Unified `/beastmode` command** — `init`, `status`, and `ideas` subcommands in a single entry point
- **Deferred ideas capture** — ideas surfaced during any phase are captured and reconciled at release
- **Feature name arguments** — pass feature names directly to phase commands (e.g., `/plan docs-refresh`)
- **Conversational design flow** — one-question-at-a-time dialogue replaces upfront interrogation
- **Hierarchy format v2** — bullet format everywhere, replacing mixed prose/bullets in L1 summaries
- **Squash-per-release** — feature branches squash to main with archive tags preserving full history
- **Meta hierarchy rebuild** — L1/L2/L3 structure for meta domain, matching context domain layout
- **CLI orchestrator** — `beastmode` CLI manages worktree lifecycle, phase transitions, and agent dispatch
- **Cmux integration** — multiplexed terminal sessions for parallel subagent execution
- **GitHub state model** — manifest-based GitHub mirroring with label taxonomy and epic/feature lifecycle
- **Terminal phase states** — phase status indicators with terminal states (done, error, skipped) for completed work
- **Pure manifest state machine** — artifacts and state derived from manifest files, not filesystem markers
- **Demo recording** — terminal demo capture for README and documentation

## Next

Designed or partially built. Coming soon.

## Later

On the radar. Not yet designed.

- **Community learning loop** — retro learnings don't stay in your project. Friction and patterns bubble up as issues to the beastmode repo automatically — crowdsourcing improvements from every user. The meta layer goes from project-scoped to ecosystem-scoped.
- **GitHub feature tracking** — manifest-based GitHub mirroring is shipped (labels, epic/feature lifecycle). Remaining work: kanban board UI and auto-sync polish.
- **Model profile control** — configure which model each subagent uses (Opus, Sonnet, Haiku) via `.beastmode/config.yaml`. Per-agent cost/quality tradeoffs. Budget mode for high-volume work, quality mode for critical architecture.
- **Progressive Autonomy Stage 3** — agent teams. Claude Code now ships native team support (TeamCreate, SendMessage). Multiple agents pull features from a shared tasklist. Peers, not hierarchy. Each agent runs the full design → release pipeline independently.
- **Parallel features** — multiple features in separate worktrees simultaneously, with independent progress tracking.
- **Integration phase** — multi-feature coordination and merge conflict handling between parallel feature branches.
- **Other agentic tools** — Cursor, Copilot Workspace, and other AI coding environments beyond Claude Code.

## Not Planned

Deliberately out of scope.

- **Product phase** — deciding *what* to build. Beastmode handles Development (Feature → Story), not Portfolio or Program layers. Stay in your lane.
- **CI/CD integration** — use your existing pipelines. Beastmode produces code; your CI ships it.
- **Project management** — no sprints, no story points, no standups, no burndown charts. If you need those, use a project management tool.
