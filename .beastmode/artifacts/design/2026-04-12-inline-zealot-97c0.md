---
phase: design
epic-id: bm-97c0
epic-slug: inline-zealot-97c0
epic-name: README Accuracy Refresh
---

## Problem Statement

The README has accumulated ~25 releases of drift (v0.93–v0.124). Multiple sections describe systems that no longer exist — manifests replaced by a JSON file store, implementation branches removed in favor of direct commits to the feature branch, parallel worktrees replaced by wave-isolated agents on a shared branch. The CLI command list is incomplete, the dashboard description undersells current capabilities, and the GitHub integration section misstates the source of truth.

## Solution

An accuracy pass across all README sections, plus full rewrites of the Orchestration, Dashboard, GitHub Integration, and CLI sections to match v0.124 reality. High-level structure (headings, ordering, narrative arc) is preserved. No new sections added.

## User Stories

1. As a new user reading the README, I want the Pipeline table to accurately describe what happens during implement, so that I don't expect parallel worktrees when agents actually commit to a shared branch.
2. As a contributor reading the Orchestration section, I want it to describe the JSON file store and direct-commit model, so that I understand the actual recovery and state model.
3. As a user exploring the CLI, I want a complete command reference (excluding store subcommands), so that I know every top-level command available to me.
4. As a user evaluating the dashboard, I want the description to reflect current features (heartbeat countdown, stats persistence, tree log hierarchy, keyboard extensions, focus borders), so that I understand what I'm getting.
5. As a user reading the GitHub Integration section, I want it to correctly identify the store as the operational authority with GitHub as a one-way mirror, so that I understand the state model.
6. As a user following install instructions, I want the package name and commands to be correct, so that installation works on the first try.

## Implementation Decisions

- Pipeline table row for Implement changes from "parallel worktrees" to "parallel agents on shared feature branch" or similar phrasing
- Orchestration section: replace manifest-based description with JSON file store (`state/YYYY-MM-DD-<slug>.store.json`), direct commits, wave file isolation, and phase tag–based regression. Remove references to: manifests, worktree-per-feature, sequential merge with conflict simulation, manifest recovery
- CLI command list: include `design`, `plan <slug>`, `implement <slug>`, `validate <slug>`, `release <slug>`, `done <slug>`, `cancelled <slug>`, `cancel <slug> [--force]`, `dashboard`, `compact`, `hooks <name> [phase]`, `help`. Omit all `store` subcommands
- Dashboard description: add heartbeat countdown timer, persistent stats with session/all-time toggle, hierarchical tree log (SYSTEM > epic > feature), phase-colored badges, keyboard extensions (tab focus, phase filter, blocked toggle, PgUp/PgDn scroll), animated nyan rainbow focus border
- GitHub Integration: store is operational authority, GitHub is one-way mirror. Mention label taxonomy (type/phase/status), retry queue with reconciliation, commit ref annotation, closing comments on release. Remove "labels as source of truth"
- Session-start hooks are an implementation detail — not mentioned in README
- SAFe diagram section and Credits section preserved as-is
- Linked docs (progressive-hierarchy.md, retro-loop.md) not checked for accuracy — out of scope

## Testing Decisions

- Existing integration test (`test(readme-refresh)` from v0.98.1) validates README config examples and domain descriptions against project structure — should be updated if config examples change
- Manual review pass: every factual claim in the README should be traceable to current codebase behavior

## Out of Scope

- Linked doc accuracy (docs/progressive-hierarchy.md, docs/retro-loop.md)
- New README sections or structural changes
- Store subcommand documentation
- Session-start hook documentation in README
- SVG asset updates (banner, diagrams)

## Further Notes

None

## Deferred Ideas

None
