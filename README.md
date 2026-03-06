<div align="center">

# beastmode

**Turn Claude Code into a disciplined engineering partner.**

Opinionated workflow patterns that survived contact with reality.

[![GitHub stars](https://img.shields.io/github/stars/BugRoger/beastmode?style=flat-square)](https://github.com/BugRoger/beastmode/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.5.5-blue?style=flat-square)](https://github.com/BugRoger/beastmode)

</div>

---

```bash
claude plugin add beastmode@beastmode-marketplace
```

<!-- TODO: Replace with assets/demo.svg when recorded -->
<!-- ![beastmode demo](assets/demo.svg) -->

## The Problem

Three ways AI coding goes sideways:

**Context amnesia.** New session, blank slate. You explain the architecture again. And again. The AI has no memory of yesterday's decisions, last week's refactor, or why you chose that particular pattern. Every conversation starts from zero.

**Scope chaos.** You asked for a login form. You got a login form, a password reset flow, email verification, OAuth integration, and a half-finished admin panel. The AI interpreted "login" as "auth system" and burned 50k tokens before you noticed.

**Process vacuum.** No design phase. No task breakdown. Just straight to code. The AI produces something that works — until you realize it doesn't fit the architecture, violates three conventions, and needs to be rewritten.

These compound. Context loss means the AI can't remember the design decisions that would prevent scope creep. Without process, there's no checkpoint where you can catch any of this before it ships.

Beastmode fixes this. Five phases. Context persists. Patterns compound.

```
/design → /plan → /implement → /validate → /release
```
**Quick fix?** Implement, done.
**New feature?** Design the approach. Plan the tasks. Implement. Validate. Release.
**Multi-session?** Each phase writes artifacts to `.beastmode/`. Next session picks up where you left off.

## Install

```bash
claude plugin add beastmode@beastmode-marketplace
```

Then initialize your project:

```bash
/beastmode install                # scaffold .beastmode/ structure
/beastmode init --brownfield      # auto-discover existing codebase
```

## Skills

| Skill | What it does |
|-------|-------------|
| `/design` | Brainstorm and create design specs through collaborative dialogue |
| `/plan` | Turn designs into bite-sized implementation tasks |
| `/implement` | Execute plans in isolated git worktrees |
| `/validate` | Quality gate — tests, lint, type checks |
| `/release` | Changelog, version bump, merge to main |
| `/status` | Track project state and milestones |
| `/beastmode` | Project initialization and discovery |

## How It Works

Every phase writes artifacts to `.beastmode/` — design specs, implementation plans, validation records, release notes. Your root `CLAUDE.md` imports the project context. Next session, Claude starts with full knowledge of your project.

The `.beastmode/` folder organizes four domains:
- **Product** — what you're building (vision, goals)
- **Context** — how to build it (architecture, conventions, testing)
- **State** — where features are in the workflow (design → release)
- **Meta** — what you've learned (phase retros that improve future sessions)

Knowledge compounds. After each cycle, learnings feed back into your project context. Claude gets smarter about *your* codebase over time.

## Why This Works

**Proven workflow.** Design before code. Plan before build. Old wisdom, applied to AI coding.

**Context survives sessions.** No lost work. No repeated explanations. Artifacts persist in git.

**Scales to complexity.** Trivial change? Skip to implement. Complex feature? Run every phase.

**No ceremony.** No sprint planning. No story points. No standups. Just you, Claude, and the work.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for what's coming next.

## What Beastmode Is NOT

**Not a replacement for engineering judgment.** You still design. Agents assist. Final call is yours.

**Not project management.** No sprints. No story points. No standups. No burndown charts. Just engineering workflow.

**Not prescriptive about your stack.** Works with any language, framework, or toolchain. The workflow is stack-agnostic.

**Not autonomous by default.** You choose the leash length. Start with full control. Loosen as trust builds.

**Not magic.** Crystallized engineering lore — patterns that survived contact with reality. Structure helps. Structure isn't a substitute for thinking.

## Credits

Built on ideas from [superpowers](https://github.com/obra/superpowers) and [get-shit-done](https://github.com/gsd-build/get-shit-done).

## License

MIT
