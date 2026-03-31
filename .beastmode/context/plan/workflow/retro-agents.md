# Retro Agents

## Context
Original retro agents used hardcoded phase-to-files lookup tables, requiring manual updates whenever L2 files were added or removed.

## Decision
Structure-walking context agent replaces hardcoded tables. Context walker reads L1 file, parses @imports to discover L2 targets, scans for orphan files. Retro orchestrator passes L1 paths and session context instead of file lists.

## Rationale
Dynamic discovery means adding a new L2 file requires only an @import in the L1 file — no agent prompt changes. Orphan detection catches unreferenced files.

## Source
state/plan/2026-03-05-dynamic-retro-walkers.md
