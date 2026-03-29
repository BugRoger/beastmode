# Release: Phase End Guidance

**Version:** v0.14.27
**Date:** 2026-03-08

## Highlights

Standardizes how every phase ends: a single, copy-pasteable next-step command from the transition gate only. Eliminates duplicate guidance from retro agents, context reports, and sub-agents.

## Features

- Add "Next Step" element spec to `visual-language.md` with strict rendering rules
- Standardize all 4 checkpoint transition gates (design, plan, implement, validate) to use identical inline-code format
- Ban transition guidance from `retro.md` — retro never prints next-step commands
- Ban transition guidance from `context-report.md` — context report only describes context state
- Auto mode uses `Start a new session and run:` prefix when context is low

## Full Changelog

- Modified: `skills/_shared/visual-language.md` — added Next Step section
- Modified: `skills/_shared/retro.md` — added NEVER ban on transition guidance
- Modified: `skills/_shared/context-report.md` — removed transition bleed, added separation note
- Modified: `skills/design/phases/3-checkpoint.md` — standardized transition gate
- Modified: `skills/plan/phases/3-checkpoint.md` — standardized transition gate
- Modified: `skills/implement/phases/3-checkpoint.md` — standardized transition gate
- Modified: `skills/validate/phases/3-checkpoint.md` — standardized transition gate

## Artifacts

- Plan: .beastmode/state/plan/2026-03-08-phase-end-guidance.md
- Validation: .beastmode/state/validate/2026-03-08-phase-end-guidance.md
