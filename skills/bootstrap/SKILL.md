---
name: bootstrap
description: Initialize a project with the .agent/ folder structure for Claude and agents. Creates canonical workflow folders and prime/ reference templates.
---

# /bootstrap

Initialize a project with Michi's canonical `.agent/` folder structure.

## What It Creates

```
.agent/
├── CLAUDE.md           # <200 lines, summary + @imports
├── prime/              # Reference material
│   ├── META.md         # How to maintain docs (invariant)
│   ├── AGENTS.md       # Multi-agent safety (invariant)
│   ├── STACK.md        # Tech stack (template)
│   ├── STRUCTURE.md    # Directory layout (template)
│   ├── CONVENTIONS.md  # Naming patterns (template)
│   ├── ARCHITECTURE.md # System design (template)
│   └── TESTING.md      # Test strategy (template)
├── research/           # /research output
├── design/             # /design output
├── plan/               # /plan output
├── status/             # /status output
├── verify/             # /verify output
└── release/            # /release output

./CLAUDE.md             # Bridge: @.agent/CLAUDE.md
```

## Instructions

1. Create `.agent/` directory structure with all verb folders
2. Copy invariant files from templates (META.md, AGENTS.md) - pre-filled
3. Copy template files from templates (STACK.md, etc.) - section headers + guidelines
4. Copy CLAUDE.md template to `.agent/CLAUDE.md`
5. Replace `{project-name}` with actual project name
6. Handle `./CLAUDE.md`:
   - If not exists: create with content `@.agent/CLAUDE.md`
   - If exists: ask user before replacing

## Templates

Templates are in [templates/](templates/):
- [META.md](templates/META.md) - invariant
- [AGENTS.md](templates/AGENTS.md) - invariant
- [STACK.md](templates/STACK.md) - template
- [STRUCTURE.md](templates/STRUCTURE.md) - template
- [CONVENTIONS.md](templates/CONVENTIONS.md) - template
- [ARCHITECTURE.md](templates/ARCHITECTURE.md) - template
- [TESTING.md](templates/TESTING.md) - template
- [CLAUDE.md](templates/CLAUDE.md) - template

## Workflow

Part of: bootstrap → prime → research → design → plan → implement → status → verify → release → retro
