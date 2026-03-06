<div align="center">

# beastmode

**Turn Claude Code into a disciplined engineering partner.**

Opinionated workflow patterns that survived contact with reality.

[![GitHub stars](https://img.shields.io/github/stars/BugRoger/beastmode?style=flat-square)](https://github.com/BugRoger/beastmode/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

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

Five phases, one flow:

```
/design → /plan → /implement → /validate → /release
```

Each phase stands on its own. Prime loads project context from `.beastmode/`, execute does the work, validate checks quality, checkpoint saves artifacts back. Then the session ends. Next phase starts clean — fresh context, no leftover state, just the artifacts the previous phase wrote.

`.beastmode/` is the shared bus. Design specs, implementation plans, validation records, release notes — all written as markdown, all version-controlled in git. Your root `CLAUDE.md` imports the project context. Every new session starts with full knowledge of your project.

Four domains organize what gets persisted:

- **Product** — what you're building (vision, goals)
- **Context** — how to build it (architecture, conventions, testing)
- **State** — where features are in the workflow (design → release)
- **Meta** — what you've learned (SOPs, overrides, session insights)

## What Makes It Work

**Progressive context, not flat retrieval.**

Project knowledge is organized into four levels: product vision at the top, domain summaries below it, detail files below that, raw artifacts at the bottom. Each level summarizes the level below. Agents navigate summaries first and load detail only when the task requires it. Deterministic navigation through a known structure — not similarity search through a vector space.

[Read the full argument →](docs/progressive-hierarchy.md)

**Every phase checkpoints. Every session starts clean.**

Phases don't share memory — they share artifacts. Checkpoint writes to `.beastmode/`, prime reads from it. A new session loads exactly the context it needs from the hierarchy, not whatever happened to be in the last conversation. This is what makes multi-session work reliable: the handoff is explicit, not implicit.

**Retro captures learnings. Learnings compound.**

Every checkpoint captures what worked, what didn't, and what to do differently. Retro agents classify findings into standard procedures, project-specific overrides, and session insights. Recurring patterns auto-promote to SOPs. Each cycle sharpens Claude's understanding of your codebase.

**Context is just files in git.**

Design specs, implementation plans, validation records — all markdown, all version-controlled. No vector database to maintain. No embeddings to regenerate when code changes. Context survives sessions, branches, and collaborators because it lives in `.beastmode/` alongside your code.

**Structure scales to complexity.**

Five phases prevent scope explosion on complex features. But the structure doesn't add overhead to simple work — skip to `/implement` for a quick fix, run the full cycle for a new feature.

## Credits

Built on ideas from [superpowers](https://github.com/obra/superpowers) and [get-shit-done](https://github.com/gsd-build/get-shit-done).

See the full [Changelog](CHANGELOG.md).

## License

MIT
