# Roadmap

> What's shipped, what's next, and what we're not building.

## Now

Shipped and working in the current release.

- **Five-phase workflow** — design → plan → implement → validate → release
- **Configurable HITL gates** — `.beastmode/config.yaml` with `human`/`auto` modes per gate
- **Context persistence** — `.beastmode/` artifact storage survives across sessions
- **Meta layer** — phase retros capture learnings that inform future sessions
- **Git worktree isolation** — each feature gets its own worktree and branch
- **Brownfield discovery** — `/beastmode init --brownfield` auto-populates context from existing codebases
- **Progressive knowledge hierarchy** — L0/L1/L2/L3 with fractal progressive enhancement

## Next

Designed or partially built. Coming soon.

- **Progressive Autonomy Stage 2** — auto-chaining between phases. The gate mechanism exists (`config.yaml` transitions with `auto` mode), but the wiring to `/compact` and auto-invoke the next skill is incomplete. When done: trigger `/design`, walk away, come back to a completed feature branch.
- **Checkpoint restart** — restart from the last successful phase instead of re-running everything. Phase artifacts already support this; the explicit restart command doesn't exist yet.
- **Demo recording** — terminal demo GIF/SVG for README.

## Later

On the radar. Not yet designed.

- **Progressive Autonomy Stage 3** — agent teams. Multiple agents pull features from a shared tasklist. Peers, not hierarchy. Each agent runs the full design → release pipeline independently.
- **Parallel features** — multiple features in separate worktrees simultaneously, with independent progress tracking.
- **GitHub Issues as tasklist backend** — features as Issues, status as labels. For teams that want visibility beyond the filesystem.
- **Integration phase** — multi-feature coordination and merge conflict handling between parallel feature branches.
- **Other agentic tools** — Cursor, Copilot Workspace, and other AI coding environments beyond Claude Code.

## Not Planned

Deliberately out of scope.

- **Product phase** — deciding *what* to build. Beastmode handles Development (Feature → Story), not Portfolio or Program layers. Stay in your lane.
- **CI/CD integration** — use your existing pipelines. Beastmode produces code; your CI ships it.
- **Project management** — no sprints, no story points, no standups, no burndown charts. If you need those, use a project management tool.
