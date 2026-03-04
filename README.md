<div align="center">

# beastmode

**Turn Claude Code into a disciplined engineering partner.**

Opinionated workflow patterns that survived contact with reality.

[![GitHub stars](https://img.shields.io/github/stars/BugRoger/beastmode?style=flat-square)](https://github.com/BugRoger/beastmode/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.5.3-blue?style=flat-square)](https://github.com/BugRoger/beastmode)

</div>

---

```bash
claude plugin add beastmode@beastmode-marketplace
```

<!-- TODO: Replace with assets/demo.svg when recorded -->
<!-- ![beastmode demo](assets/demo.svg) -->

## What It Does

Claude Code is powerful. But without structure, you re-explain your project every session, get inconsistent implementations, and lose work between context windows.

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

## Credits

Built on ideas from [superpowers](https://github.com/obra/superpowers) and [get-shit-done](https://github.com/gsd-build/get-shit-done).

## License

MIT
