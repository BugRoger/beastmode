# Context Document Format

## Context
During init-l2-expansion planning, 2026-03-08

## Decision
Standardized L2 context document format: skeleton files use `[Populated by init or retro]` placeholders. Populated files use `- ALWAYS [rule] — [rationale]` and `- NEVER [rule] — [rationale]` bullet format. Every L2 file gets a matching L3 subdirectory with `.gitkeep`. L3 records use Context/Decision/Rationale/Source/Confidence structure.

## Rationale
Unifies init output with retro output format. L2 files become retro-compatible from creation, eliminating format migration. L3 directories pre-created ensures structural invariant is maintained from skeleton onward.

## Source
state/design/2026-03-08-init-l2-expansion.md — Locked Decision #2 (Retro Format), #3 (Structural Invariant)
