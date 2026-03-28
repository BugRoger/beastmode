---
name: beastmode
description: Project initialization, status, idea tracking, and GitHub setup. Use when starting a new project, checking project state, reviewing deferred ideas, or bootstrapping GitHub labels and project boards.
---

# /beastmode

Unified command for project management.

## Subcommands

- `init` — Discover project knowledge and populate context hierarchy
- `status` — Show features grouped by workflow phase
- `ideas` — Surface and reconcile deferred ideas from design docs
- `setup-github` — Bootstrap GitHub labels, project board, and state model

## Routing

### 1. Parse Arguments

Extract subcommand from arguments:
- If args start with "init" → route to `@subcommands/init.md`
- If args start with "status" → route to `@subcommands/status.md`
- If args start with "ideas" → route to `@subcommands/ideas.md`
- If args start with "setup-github" → route to `@subcommands/setup-github.md`
- If no args or unrecognized → show help

### 2. Show Help (default)

If no recognized subcommand:

```
Usage: /beastmode <subcommand>

Subcommands:
  init          Discover project knowledge and populate context hierarchy
  status        Show features grouped by workflow phase
  ideas         Surface and reconcile deferred ideas
  setup-github  Bootstrap GitHub labels, project board, and state model

Examples:
  /beastmode init
  /beastmode status
  /beastmode ideas
  /beastmode setup-github
```

### 3. Execute Subcommand

Load and execute the appropriate subcommand file with full context.
