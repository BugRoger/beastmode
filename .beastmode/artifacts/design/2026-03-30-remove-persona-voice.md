---
phase: design
slug: remove-persona-voice
---

## Problem Statement

The per-skill `persona.md` shared file adds a layer of indirection for persona voice that duplicates what BEASTMODE.md already provides globally. Every phase's 0-prime.md imports it, but the actual persona definition lives in BEASTMODE.md. The shared file is unnecessary plumbing.

## Solution

Delete `skills/_shared/persona.md` and remove its `@../_shared/persona.md` import from all five phase 0-prime.md files. Keep the announce step instructions themselves (the "Greet in persona voice" text). Update stale context documentation that references the centralized persona import system.

## User Stories

1. As a skill author, I want persona voice to come from one place (BEASTMODE.md), so that I don't have to trace through a shared import to understand the voice rules.
2. As a pipeline operator, I want fewer shared file dependencies between skills, so that phases are more self-contained.
3. As a contributor reading context docs, I want workflow rules to reflect reality, so that I don't follow stale instructions about importing persona.md.

## Implementation Decisions

- Delete `skills/_shared/persona.md` entirely
- Remove `@../_shared/persona.md` line from all 5 files: `design/0-prime.md`, `plan/0-prime.md`, `implement/0-prime.md`, `validate/0-prime.md`, `release/0-prime.md`
- Keep the announce step heading and instruction text in all phases — only the import line is removed
- BEASTMODE.md persona section and prime directives are untouched — global persona voice still applies
- Update `.beastmode/context/plan/workflow.md` `## Persona System` section to remove the "ALWAYS import persona.md" rule
- Update `.beastmode/context/plan/workflow/persona-system.md` L3 record to reflect that the shared file no longer exists
- Session-start hook taglines are out of scope
- Historical artifacts referencing persona system are left as-is

## Testing Decisions

- Verify all 5 `0-prime.md` files no longer contain `@../_shared/persona.md`
- Verify `skills/_shared/persona.md` does not exist
- Verify `workflow.md` persona rules no longer reference importing persona.md
- Grep for any remaining references to `_shared/persona.md` across the codebase

## Out of Scope

- BEASTMODE.md persona section or prime directives
- Session-start hook (`hooks/session-start.sh`) and its taglines
- DESIGN.md capability list mentioning "deadpan persona"
- Historical design/plan artifacts that reference the persona system

## Further Notes

None

## Deferred Ideas

None
