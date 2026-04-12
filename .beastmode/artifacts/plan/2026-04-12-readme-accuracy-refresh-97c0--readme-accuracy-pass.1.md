---
phase: plan
epic-id: readme-accuracy-refresh-97c0
epic-slug: readme-accuracy-refresh-97c0
feature-name: README Accuracy Pass
wave: 1
---

# README Accuracy Pass

**Design:** .beastmode/artifacts/design/2026-04-12-readme-accuracy-refresh-97c0.md

## User Stories

1. As a new user reading the README, I want the Pipeline table to accurately describe what happens during implement, so that I don't expect parallel worktrees when agents actually commit to a shared branch.
2. As a contributor reading the Orchestration section, I want it to describe the JSON file store and direct-commit model, so that I understand the actual recovery and state model.
3. As a user exploring the CLI, I want a complete command reference (excluding store subcommands), so that I know every top-level command available to me.
4. As a user evaluating the dashboard, I want the description to reflect current features (heartbeat countdown, stats persistence, tree log hierarchy, keyboard extensions, focus borders), so that I understand what I'm getting.
5. As a user reading the GitHub Integration section, I want it to correctly identify the store as the operational authority with GitHub as a one-way mirror, so that I understand the state model.
6. As a user following install instructions, I want the package name and commands to be correct, so that installation works on the first try.

## What to Build

A single accuracy pass across all README.md sections. High-level structure (headings, ordering, narrative arc) is preserved. No new sections added. Specific changes by section:

### Pipeline Table (US 1)

Change the Implement row's "What Happens" cell from "parallel worktrees" language to describe parallel agents committing directly to the shared feature branch with wave file isolation. Two-stage review per task stays.

### Orchestration Section (US 2)

Full rewrite. Replace manifest-based description with:

- **State model:** Single JSON file store at `.beastmode/state/store.json` tracks epics and features. Entities have typed statuses, dependency chains, and wave assignments. Store is the sole operational authority.
- **Implement dispatch:** One agent per feature on the shared feature branch. Wave file isolation guarantees disjoint file sets — no per-feature worktrees, no merge step.
- **Phase regression:** Validation failures regress failing features to implement with a dispatch budget. Phase tags mark reset points.
- **Recovery:** On startup, store state is loaded from disk. Pending operations resume from last saved state.

Remove all references to: manifests, worktree-per-feature, sequential merge with conflict simulation, manifest recovery.

### CLI Section (US 3)

Replace the abbreviated command block with a complete reference. Include:

- Phase commands: `design`, `plan <slug>`, `implement <slug> [feature]`, `validate <slug>`, `release <slug>`, `done <slug>`, `cancelled <slug>`
- Utility commands: `cancel <slug> [--force]`, `dashboard`, `compact`, `store <subcommand>`, `hooks <name> [phase]`, `help`
- Verbosity flags: `-v`, `-vv`, `-vvv`

Omit store subcommand details (out of scope per PRD).

### Dashboard Section (US 4)

Expand the bullet list to reflect current capabilities:

- Fullscreen terminal UI with epic list, details panel, and hierarchical tree log (SYSTEM > epic > feature)
- Heartbeat countdown timer showing seconds until next poll cycle
- Persistent stats with session/all-time toggle (sessions, success rate, phase durations, retries)
- Phase-colored badges using Monokai Pro palette
- Keyboard extensions: tab focus between panels, phase filter cycling, blocked toggle, PgUp/PgDn scroll, filter search, cancel with confirmation
- Animated nyan rainbow focus border on active panel

### GitHub Integration Section (US 5)

Rewrite to correct the source of truth:

- Store (`state/store.json`) is the operational authority — GitHub is a one-way mirror
- Epic and feature issues created automatically, updated after each phase
- Label taxonomy: `type/epic`, `type/feature`, `phase/*`, `status/*`
- Project board (V2) status synced via GraphQL
- Retry queue with exponential backoff for failed sync operations
- Commit ref annotation on phase checkpoints
- Closing comments on release with version tag

Remove "labels as source of truth" language.

### Install Section (US 6)

Verify and correct:

- Package name is `beastmode` on npm
- `npx beastmode install` installs plugin, CLI, and dependencies
- `npx beastmode uninstall` removes plugin and CLI link
- Prerequisites table is accurate (macOS, Node.js >= 18, Claude Code, Git, iTerm2, GitHub CLI optional)

## Integration Test Scenarios

<!-- No behavioral scenarios — skip gate classified this feature as non-behavioral -->

## Acceptance Criteria

- [ ] Pipeline table Implement row describes parallel agents on shared feature branch, not parallel worktrees
- [ ] Orchestration section describes JSON file store at `state/store.json`, direct commits, wave file isolation, and phase tag regression — no manifest references remain
- [ ] CLI section lists all top-level commands: design, plan, implement, validate, release, done, cancelled, cancel, compact, dashboard, store, hooks, help
- [ ] Dashboard section mentions heartbeat countdown, persistent stats toggle, tree log hierarchy, phase-colored badges, keyboard extensions, and nyan rainbow focus border
- [ ] GitHub Integration section identifies store as operational authority and GitHub as one-way mirror — no "labels as source of truth" language
- [ ] Install commands and package name are correct and functional
