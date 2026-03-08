# Release: worktree-gate-tightening

**Version:** v0.14.37
**Date:** 2026-03-08

## Highlights

Worktree gates tightened from ~15 lines of redundant prose to clean HARD-GATE wrapped sections with numbered bullets. Placement normalized per phase: design creates in checkpoint, all others enter in prime step 1, validate/release keep bare assertions.

## Features

- **Structural HARD-GATE enforcement** — Worktree entry/creation sections wrapped in `<HARD-GATE>` tags with numbered procedure bullets, replacing verbose prose enforcement
- **Design worktree placement** — Worktree creation moved from design/1-execute to design/3-checkpoint (step 0), matching the phase's actual needs
- **Prime-first worktree entry** — plan/implement/validate/release enter worktree as step 1 of 0-prime, before announce or context load
- **Bare assert pattern** — validate/release 1-execute slimmed to one-line worktree-manager assert calls
- **Redundant prose removal** — Eliminated "MANDATORY", "no exceptions", "lightweight" enforcement language; gate tags handle enforcement

## Full Changelog

- 5c82bf4 feat: tighten worktree gates to structural HARD-GATE enforcement
