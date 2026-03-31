# Persona System

## Context
Beastmode needed consistent voice across workflow phases. Originally, a dedicated `skills/_shared/persona.md` was imported by all 0-prime.md files. This was redundant because BEASTMODE.md (L0) autoloads into every session.

## Decision
Persona definition lives solely in BEASTMODE.md under the Persona section, including Context-Awareness and Skill Announces subsections. No per-skill persona imports. Context-aware greetings factor in time of day and project state.

## Rationale
L0 autoload guarantees persona is present in every session without per-skill @imports. Eliminating redundant imports reduces skill file noise and removes a maintenance burden. Context-awareness and skill-announce rules consolidated into L0 prevent persona drift.

## Source
state/plan/2026-03-05-dynamic-persona-greetings.md
artifacts/design/2026-03-31-skill-cleanup.md
