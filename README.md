# beastmode

> Turn Claude Code into a disciplined engineering partner.

Workflow patterns for Claude Code. Opinionated like crystallized engineering lore—patterns that survived contact with reality.

## The Workflow

A simple loop that scales from quick fixes to deep feature work:

```
/prime → /design → /plan → /implement → /release → /retro
```

**Quick fix?** Prime, implement, done.

**New feature?** Design the approach. Plan the tasks. Implement. Release. Learn.

**Multi-session project?** Each phase writes artifacts to `.agents/`. Next session, `/prime` restores context. Pick up where you left off.

**Every project?** `/retro` feeds learnings back into your agent instructions. Knowledge compounds automatically.

### Core Workflow

| Skill | Purpose |
|-------|---------|
| `/prime` | Load project context into session |
| `/design` | Think through the approach (auto-triggers research when needed) |
| `/plan` | Turn design into implementation tasks (auto-triggers research when needed) |
| `/implement` | Execute the plan, write the code |
| `/release` | Create changelog and release notes |
| `/retro` | Capture learnings for next time |

**Phase Research:** Both `/design` and `/plan` can automatically spawn a research phase when they detect keywords like "SOTA", "best practices", or unfamiliar tech. Research findings go to `.agents/research/`.

### Utilities

| Skill | Purpose |
|-------|---------|
| `/bootstrap` | Initialize project with .agents/ structure |
| `/research` | Explore domain when needed |
| `/status` | Track project state and milestones |

Use what helps. Skip what doesn't.

## Install

```bash
/plugin marketplace add bugroger/overrides-marketplace
/plugin install beastmode@overrides-marketplace
```

Then initialize your project:

```bash
/bootstrap
```

## The `.agents/` Folder

All project context lives here:

```
.agents/
├── CLAUDE.md           # Project brain (<200 lines)
├── prime/              # Context loaded every session
│   ├── META.md         # How to maintain these docs
│   ├── AGENTS.md       # Multi-agent coordination
│   ├── STACK.md        # Tech stack
│   ├── STRUCTURE.md    # Directory layout
│   ├── CONVENTIONS.md  # Naming patterns
│   ├── ARCHITECTURE.md # System design
│   └── TESTING.md      # Test strategy
├── research/           # Domain exploration
├── design/             # Feature brainstorms, specs
├── plan/               # Implementation tasks
├── status/             # Current state
└── release/            # Changelogs
```

Your root `CLAUDE.md` imports: `@.agents/CLAUDE.md`

## Why This Works

**Proven workflow.** Design before code. Plan before build. Old wisdom, applied to AI coding.

**Context survives sessions.** Each phase writes artifacts. Next session reads them. No lost work. No repeated explanations.

**Scales to complexity.** Trivial change? Skip to build. Complex feature? Run every phase. The workflow adapts.

**Knowledge compounds.** After each implementation, `/retro` updates your agent instructions. Patterns that work get encoded. Mistakes get documented. Over time, Claude gets smarter about *your* project—automatically.

**No ceremony.** No sprint planning. No story points. No standups. Just you, Claude, and the work.

## File Naming

- **UPPERCASE.md** — Meta files with fixed structure (CLAUDE.md, STATUS.md)
- **lowercase.md** — Content files, flexible structure

## Status

| Skill | Ready |
|-------|-------|
| `/prime` | ✅ |
| `/design` | ✅ |
| `/plan` | ✅ |
| `/implement` | 🚧 |
| `/release` | 🚧 |
| `/retro` | ✅ |
| `/bootstrap` | ✅ |
| `/research` | 🚧 |
| `/status` | 🚧 |

## Credits

- [obra/superpowers](https://github.com/obra/superpowers) — Jesse Vincent's original disciplined workflow system
- [gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done) — Context engineering pioneer

## License

MIT
