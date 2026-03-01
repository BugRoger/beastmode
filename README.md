# dev-workflow

Michi's canonical workflow for Claude and agents.

## Credits

This plugin is adapted from [pcvelz/superpowers](https://github.com/pcvelz/superpowers), an excellent collection of Claude Code skills. We're evolving it into our own workflow while building on the solid foundation they established. Thank you to the superpowers team for their work.

## Installation

```bash
/plugin marketplace add bugroger/overrides-marketplace
/plugin install dev-workflow@overrides-marketplace
```

## The `.agent/` Convention

All project metadata lives in a single `.agent/` folder:

```
.agent/
├── CLAUDE.md       # <200 lines, summary + @imports from prime/
├── prime/          # Reference material (invariant + templates)
├── research/       # Discovery, exploration
├── design/         # Specs, brainstorming output
├── plan/           # Implementation plans
├── status/         # Current state, milestones
├── verify/         # Verification reports
└── release/        # Changelogs, release notes
```

**Bridge:** `./CLAUDE.md` contains only `@.agent/CLAUDE.md`

## Workflow

```
init → prime → research → design → plan → implement → status → verify → release → retro
```

| Skill | Folder | Purpose |
|-------|--------|---------|
| `/init` | creates `.agent/` | Initialize structure |
| `/prime` | reads `prime/` | Load project context |
| `/research` | writes `research/` | Discovery, exploration |
| `/design` | writes `design/` | Brainstorming output |
| `/plan` | writes `plan/` | Implementation plans |
| `/status` | reads/writes `status/` | Current state |
| `/verify` | writes `verify/` | Verification reports |
| `/release` | writes `release/` | Changelogs, notes |
| `/retro` | reads all | Session retrospective |

## File Conventions

- **UPPERCASE.md** — Invariant meta files (always exist, same structure)
- **lowercase.md** — Variant files (plans, research docs, etc.)

## Skills

| Skill | Status | Description |
|-------|--------|-------------|
| `/init` | ✅ | Initialize `.agent/` structure |
| `/prime` | ✅ | Load project context |
| `/research` | 🚧 | Discovery and exploration |
| `/design` | ✅ | Brainstorming and specs |
| `/plan` | 🚧 | Implementation plans |
| `/status` | 🚧 | Project state tracking |
| `/verify` | 🚧 | Verification reports |
| `/release` | 🚧 | Changelogs and releases |
| `/retro` | ✅ | Session retrospective |

## License

MIT
