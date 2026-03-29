# Release: worktree-artifact-alignment

**Version:** v0.14.25
**Date:** 2026-03-08

## Highlights

Enforces 1:1 alignment between worktree directory names and phase artifact filenames, and prevents any `.beastmode/` writes to the main branch through centralized guards.

## Features

- Centralized `Derive Feature Name` section in worktree-manager.md — single source of truth for consistent kebab-case feature naming across all phases
- `Assert Worktree` guard in worktree-manager.md — pwd-based check that prevents `.beastmode/` writes outside a worktree
- All 5 checkpoint phases (design, plan, implement, validate, release) call Assert Worktree before any state/ writes
- Retro agents receive absolute `worktree_root` path injection — belt-and-suspenders protection for context/meta writes
- Release phase two-phase split with explicit transition boundary — pre-merge work in worktree, post-merge from main
- All 4 non-design 0-prime phases use shared Discover Feature + Enter Worktree from worktree-manager.md
- Design 1-execute references shared Derive Feature Name for worktree creation

## Full Changelog

- `skills/_shared/worktree-manager.md` — Added Derive Feature Name (lines 5-27), updated Discover Feature (lines 29-59), updated Create Worktree (lines 61-77), added Assert Worktree (lines 98-113)
- `skills/_shared/retro.md` — Added Assert Worktree pre-flight (2.5), captured worktree_root=$(pwd), injected absolute path into both walker agent contexts
- `skills/design/phases/1-execute.md` — References shared Derive Feature Name + Create Worktree
- `skills/design/phases/3-checkpoint.md` — Added Assert Worktree step 0, changed `<topic>` to `<feature>` throughout
- `skills/plan/phases/0-prime.md` — Compact reference to shared Discover Feature + Enter Worktree
- `skills/plan/phases/3-checkpoint.md` — Added Assert Worktree step 0
- `skills/implement/phases/0-prime.md` — Compact reference to shared Discover Feature + Enter Worktree
- `skills/implement/phases/3-checkpoint.md` — Added Assert Worktree step 0
- `skills/validate/phases/0-prime.md` — Compact reference to shared Discover Feature + Enter Worktree
- `skills/validate/phases/3-checkpoint.md` — Added Assert Worktree step 0
- `skills/release/phases/0-prime.md` — Rewritten to use shared Discover Feature + Enter Worktree
- `skills/release/phases/1-execute.md` — Rewritten with Assert Worktree pre-merge phase and explicit TRANSITION BOUNDARY
