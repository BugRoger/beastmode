---
phase: plan
slug: structured-task-store
epic: structured-task-store
feature: store-cli
wave: 3
---

# Store CLI

**Design:** `.beastmode/artifacts/design/2026-04-04-structured-task-store.md`

## User Stories

1. As an **agent**, I want to query the store for unblocked features (`beastmode store ready`), so that I can determine what work is available without scanning markdown files.
2. As an **agent**, I want to create and update features with hash-based IDs via CLI commands, so that concurrent worktree agents never collide on entity identifiers.
4. As a **developer**, I want to browse the full entity hierarchy via `beastmode store tree`, so that I can understand the pipeline state at a glance from one file.
8. As an **agent**, I want all store commands to output JSON, so that I can parse structured responses without format guessing.
10. As a **pipeline orchestrator**, I want `beastmode store blocked` to show all entities with `status=blocked`, so that intervention-requiring failures are immediately visible.

## What to Build

CLI command layer for the `beastmode store` namespace. Thin routing layer that parses arguments, calls `TaskStore` methods, and emits JSON to stdout.

**Command Routing:**
- Register `store` as a valid command in the CLI argument parser
- Route `beastmode store <subcommand>` to a store command handler
- Subcommand dispatch: `epic`, `feature`, `ready`, `blocked`, `tree`, `search`

**Epic CRUD Commands:**
- `beastmode store epic ls` — list all epics
- `beastmode store epic show <id-or-slug> [--deps]` — show epic details, optionally include dependency chain
- `beastmode store epic add --name="X"` — create epic, return JSON with hash ID
- `beastmode store epic update <id> [--name=X] [--slug=X] [--status=X] [--summary=X] [--design=path] [--validate=path] [--release=path] [--add-dep=id] [--rm-dep=id]` — patch epic
- `beastmode store epic delete <id>` — remove epic and its features

**Feature CRUD Commands:**
- `beastmode store feature ls <epic-id-or-slug>` — list features for an epic
- `beastmode store feature show <id> [--deps]` — show feature details
- `beastmode store feature add --parent=<epic-id> --name="X"` — create feature under epic
- `beastmode store feature update <id> [--name=X] [--description=X] [--status=X] [--plan=path] [--implement=path] [--add-dep=id] [--rm-dep=id]` — patch feature
- `beastmode store feature delete <id>` — remove feature

**Query Commands:**
- `beastmode store ready [<epic-id>] [--type=epic|feature]` — list unblocked entities
- `beastmode store blocked` — list entities with status=blocked
- `beastmode store tree [<id>]` — full entity hierarchy
- `beastmode store search [--name=X] [--status=X] [--type=X]` — filtered search

**Output Contract:**
- All commands emit JSON to stdout
- Success: entity or array of entities
- Error: `{ "error": "descriptive message" }` with non-zero exit code
- No human-formatted tables — dashboard handles visual presentation

## Acceptance Criteria

- [ ] `beastmode store` recognized as a valid CLI command
- [ ] Epic CRUD: `ls`, `show`, `add`, `update`, `delete` subcommands work end-to-end
- [ ] Feature CRUD: `ls`, `show`, `add`, `update`, `delete` subcommands work end-to-end
- [ ] `beastmode store ready` returns JSON array of unblocked entities
- [ ] `beastmode store ready <epic-id>` filters to a specific epic
- [ ] `beastmode store blocked` returns JSON array of blocked entities
- [ ] `beastmode store tree` returns JSON hierarchy of all entities
- [ ] `beastmode store search --status=pending` returns filtered results
- [ ] All commands output valid JSON (parseable by `JSON.parse`)
- [ ] Error cases return JSON error objects with non-zero exit code
- [ ] `--deps` flag on `show` commands includes dependency chain in output
- [ ] `--add-dep` and `--rm-dep` flags modify the `depends_on` array
