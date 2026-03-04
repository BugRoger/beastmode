# Release v0.3.5

**Date:** 2026-03-04

## Highlights

Redesigned /design skill with structured gray area identification, scope guardrails, role clarity, discussion pacing, and downstream-aware output. Replaces free-form Q&A with a guided decision-making flow.

## Features

- Gray area identification: analyze topic domain, generate 3-5 specific decision points, let user select which to discuss
- Scope guardrail: redirect out-of-scope ideas to "Deferred Ideas" instead of losing them
- Role clarity declaration in prime phase: user owns vision, Claude owns technical details
- Discussion pacing: 4 questions per area, then check "more or move on"
- "You decide" delegation option on every question, tracked as "Claude's Discretion"
- Codebase scouting: lightweight scan annotates gray area options with existing code context
- Express path: skip gray areas when user provides existing PRD/spec
- Prior decision continuity: load recent design docs to avoid re-asking settled preferences
- Downstream-shaped design doc template: Locked Decisions, Claude's Discretion, Acceptance Criteria, Deferred Ideas
- Anti-pattern callout: even simple designs require explicit approval
- Acceptance criteria extraction step in checkpoint phase

## Full Changelog

All changes are uncommitted worktree modifications on `feature/design-phase-v2`:

- `skills/design/phases/0-prime.md` — Added Role Clarity, Prior Decisions, Express Path Check (3→6 steps)
- `skills/design/phases/1-execute.md` — Replaced free-form Q&A with gray area flow (6→8 steps)
- `skills/design/phases/2-validate.md` — Added downstream readiness items, anti-pattern check (2→3 steps)
- `skills/design/phases/3-checkpoint.md` — Expanded design doc template, acceptance criteria extraction (4→5 steps)
- `skills/design/references/constraints.md` — Added "Too Simple for Design" anti-pattern section (3→4 sections)
