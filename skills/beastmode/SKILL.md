---
name: beastmode
description: Project initialization — scaffolding, discovery, setup. Use when starting a new project or adopting beastmode. Supports install, init --greenfield, init --brownfield.
---

# /beastmode

Initialize projects with `.beastmode/` context structure.

## Subcommands

- `install` — Copy skeleton `.beastmode/` to project
- `init --greenfield` — Interactive wizard for new projects
- `init --brownfield` — Autonomous discovery for existing codebases

## Routing

### 1. Parse Arguments

Extract subcommand from arguments:
- If args start with "install" → route to `@subcommands/install.md`
- If args start with "init --greenfield" → route to `@subcommands/init.md` greenfield mode
- If args start with "init --brownfield" → route to `@subcommands/init.md` brownfield mode
- If no args or unrecognized → show help

### 2. Show Help (default)

If no recognized subcommand:

```
Usage: /beastmode <subcommand>

Subcommands:
  install               Copy .beastmode/ skeleton to project
  init --greenfield     Interactive setup for new projects
  init --brownfield     Autonomous discovery for existing codebases

Examples:
  /beastmode install
  /beastmode init --greenfield
  /beastmode init --brownfield

First time? Run:
  1. /beastmode install
  2. /beastmode init --greenfield  (or --brownfield)
```

### 3. Execute Subcommand

Load and execute the appropriate subcommand file with full context.
