# beastmode

> Turn Claude Code into a disciplined engineering partner.

A lightweight workflow system for Claude Code. No opinions. No ceremonies. Just the patterns that actually work.

## Philosophy

Most AI coding sessions follow the same arc: Claude starts strong, context fills up, quality degrades, you lose track of what's done. **Beastmode fixes this.**

The approach is simple:
- **Structure over chaos** — A `.agent/` folder keeps all project context organized
- **Skills over prompts** — Invoke workflows like `/research` or `/design` instead of explaining what you want
- **Fresh contexts, better results** — Spawn agents for heavy lifting, keep your main session clean
- **Write it down** — Decisions, research, plans—all persisted for future sessions

Inspired by [superpowers](https://github.com/pcvelz/superpowers) and [get-shit-done](https://github.com/gsd-build/get-shit-done), but less prescriptive. Use what works. Skip what doesn't.

## Installation

```bash
/plugin marketplace add bugroger/overrides-marketplace
/plugin install beastmode@overrides-marketplace
```

## The Workflow

```
/init → /prime → /research → /design → /plan → implement → /verify → /release → /retro
```

That's it. Run the skills when they make sense. Skip them when they don't.

| Skill | What it does |
|-------|--------------|
| `/init` | Create the `.agent/` structure |
| `/prime` | Load project context into your session |
| `/research` | Explore before you build |
| `/design` | Think through the approach |
| `/plan` | Break work into small, verifiable tasks |
| `/verify` | Prove it works |
| `/release` | Document what shipped |
| `/retro` | Learn from the session |

## The `.agent/` Convention

One folder. Everything in its place.

```
.agent/
├── CLAUDE.md       # Your project's brain (<200 lines)
├── prime/          # Reference material, templates
├── research/       # Discovery, exploration notes
├── design/         # Specs, architecture decisions
├── plan/           # Implementation plans
├── status/         # Current state, progress
├── verify/         # Test reports, verification
└── release/        # Changelogs, release notes
```

Your root `./CLAUDE.md` just imports: `@.agent/CLAUDE.md`

## Why This Works

**Context engineering matters.** Claude's quality degrades as context fills. Beastmode gives you:

- **Persistent state** — Research and decisions survive across sessions
- **Spawn agents** — Heavy research? Spawn an agent with fresh 200K context
- **Clear phases** — Know where you are in the process
- **Written record** — Future-you (and future-Claude) will thank you

**No ceremony required.** Unlike enterprise tools:
- No sprint planning
- No story points
- No standups
- No RACI matrices

Just you, Claude, and the work.

## File Conventions

- **UPPERCASE.md** — Meta files (CLAUDE.md, STATUS.md) — same structure always
- **lowercase.md** — Content files (plans, research) — whatever fits

## Skills Status

| Skill | Status | Description |
|-------|--------|-------------|
| `/init` | ✅ | Initialize `.agent/` structure |
| `/prime` | ✅ | Load project context |
| `/research` | 🚧 | Discovery and exploration |
| `/design` | ✅ | Brainstorming and specs |
| `/plan` | 🚧 | Implementation planning |
| `/status` | 🚧 | Project state tracking |
| `/verify` | 🚧 | Verification reports |
| `/release` | 🚧 | Changelog generation |
| `/retro` | ✅ | Session retrospective |

## Quick Start

```bash
# 1. Install beastmode
/plugin marketplace add bugroger/overrides-marketplace
/plugin install beastmode@overrides-marketplace

# 2. Initialize your project
/init

# 3. Load context
/prime

# 4. Start building
/research "How should auth work in this stack?"
/design "User authentication flow"
/plan "Implement login endpoint"
```

## Credits

Built on ideas from:
- [pcvelz/superpowers](https://github.com/pcvelz/superpowers) — Disciplined TDD workflows
- [gsd-build/get-shit-done](https://github.com/gsd-build/get-shit-done) — Context engineering pioneer

## License

MIT
