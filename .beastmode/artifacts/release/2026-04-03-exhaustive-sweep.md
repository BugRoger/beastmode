---
phase: release
slug: exhaustive-sweep
epic: exhaustive-sweep
bump: minor
---

# Release: exhaustive-sweep

**Bump:** minor
**Date:** 2026-04-03

## Highlights

Replaces the opt-in "3 more or satisfied?" gray area continuation in the design skill with an auto-continuation loop that exhaustively surfaces all ambiguity until none remain, with an explicit "Skip" escape hatch.

## Features

- Auto-continue gray area sweep until 0 gray areas remain (no more opt-in continuation)
- "Skip — move to validation" option in every batch for explicit user escape
- Skip precedence: selecting Skip alongside gray areas exits immediately
- Session-scoped deduplication prevents re-surfacing resolved gray areas
- Partial batches (1-2 items) presented when fewer than 3 remain
- Express path inherits the same exhaustive sweep behavior

## Full Changelog

- `b2a3f87` design(exhaustive-sweep): checkpoint
- `6966066` design(exhaustive-sweep): checkpoint
- `dc47bc9` plan(exhaustive-sweep): checkpoint
- `16fb1f2` implement(exhaustive-sweep): checkpoint
- `36229f2` validate(exhaustive-sweep): checkpoint
