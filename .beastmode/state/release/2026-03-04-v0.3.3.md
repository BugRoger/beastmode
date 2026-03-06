# Release v0.3.3

**Date:** 2026-03-04

## Highlights

Task runner now expands sub-phases lazily when entered, instead of eagerly parsing all phases upfront. This reduces TodoWrite noise by ~60% and keeps Claude focused on the active phase.

## Features

- **Lazy task expansion**: Sub-phases are expanded only when a phase becomes `in_progress`, not at parse time
- **Opaque link constraint**: Step 1 (Parse Tasks) now explicitly forbids reading linked files during parsing
- **Child collapse**: Completed phase children are removed from TodoWrite to save tokens
- **Depth limit**: Lazy expansion only creates one level of children (`## N.` headings), ignoring `###` and deeper
