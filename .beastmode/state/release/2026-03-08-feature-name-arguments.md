# Release: Feature Name Arguments

**Version:** v0.14.29
**Date:** 2026-03-08

## Highlights

Phase transitions now use feature names instead of file paths, eliminating the cross-session worktree discovery failure that occurred every time a new phase started in a fresh session.

## Features

- Unified /beastmode command with init, status, ideas subcommands
- Feature name arguments for all phase transitions — `/beastmode:plan deferred-ideas` instead of file paths
- Resolve Artifact section in worktree-manager.md for convention-based artifact discovery
- Path rejection in Discover Feature — arguments containing `/` or `.md` are rejected with guidance

## Full Changelog

- `feat: unified /beastmode command with init, status, ideas subcommands`
- `feat: feature name arguments for phase transitions`
  - Updated worktree-manager.md (Discover Feature + Resolve Artifact)
  - Updated 4 checkpoint transition gates (design, plan, implement, validate)
  - Updated 2 prime artifact reads (plan, implement)
