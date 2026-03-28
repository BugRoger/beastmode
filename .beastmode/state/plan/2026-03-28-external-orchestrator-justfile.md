# justfile

**Design:** .beastmode/state/design/2026-03-28-external-orchestrator.md
**Architectural Decisions:** see manifest

## User Stories

1. As a developer, I want to run `just design "rewrite auth"` so that a worktree is created and the design skill runs without me managing git worktrees manually.
2. As a developer, I want to run `just plan auth-rewrite` so that a worktree is created from the feature branch and the plan skill runs with the design PRD available.
5. As a developer, I want `just implement auth-rewrite` to run a single feature's implementation so that I can control which features I implement and in what order.
6. As a developer, I want `just release auth-rewrite` to squash-merge the feature branch to main so that the commit history stays clean.

## What to Build

A Justfile at the repository root that serves as the thin CLI shell for the beastmode workflow. Each phase gets a recipe that:

- Accepts a feature slug (or topic string for design)
- Invokes `claude --dangerously-skip-permissions --worktree <slug> "/phase <args>"` in interactive mode
- Design recipe is special: it derives the slug from the topic string at runtime (slugification happens inside the recipe before invoking claude)
- Plan, implement, validate, and release recipes take the feature slug directly

The Justfile follows the pattern from https://github.com/disler/the-library/blob/main/justfile — each recipe is a one-liner that delegates to claude with the right flags.

Recipes needed:
- `design <topic>` — slugifies topic, invokes `/beastmode:design <topic>` with `--worktree <slug>`
- `plan <slug>` — invokes `/beastmode:plan <slug>` with `--worktree <slug>`
- `implement <design-feature>` — invokes `/beastmode:implement <design-feature>` with `--worktree <design-slug>` (extracts design slug from the compound argument)
- `validate <slug>` — invokes `/beastmode:validate <slug>` with `--worktree <slug>`
- `release <slug>` — invokes `/beastmode:release <slug>` with `--worktree <slug>`

## Acceptance Criteria

- [ ] Justfile exists at repository root with all 5 phase recipes
- [ ] `just design "some topic"` correctly slugifies and invokes claude with --worktree
- [ ] `just plan <slug>` invokes claude with --worktree using the feature slug
- [ ] `just implement <design>-<feature>` correctly extracts design slug for worktree
- [ ] `just validate <slug>` invokes claude with --worktree
- [ ] `just release <slug>` invokes claude with --worktree
- [ ] All recipes use --dangerously-skip-permissions and interactive mode
- [ ] No recipe performs auto-chaining to the next phase
