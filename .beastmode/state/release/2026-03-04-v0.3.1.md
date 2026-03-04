# Release v0.3.1

**Date:** 2026-03-04

## Highlights

Restores parallel agent-powered retrospective as a shared checkpoint module. Every workflow phase (design, plan, implement, validate, release) now runs a scoped retro with 2 parallel agents reviewing context docs and capturing meta learnings.

## Features

- Restore phase retro in all checkpoint sub-phases via shared `skills/_shared/retro.md` module
- Context review agent compares session artifacts against `.beastmode/context/{phase}/` docs
- Meta learnings agent captures phase-specific insights to `.beastmode/meta/{PHASE}.md`
- Quick-exit heuristic skips agent review for trivial sessions
- Structured findings format with confidence levels (high/medium/low)

## Full Changelog

All changes are uncommitted working tree modifications on `main`:
- Create `skills/_shared/retro.md` — orchestrator (gather, quick-exit, spawn, present, apply)
- Create `skills/_shared/retro/common-instructions.md` — shared agent output format
- Create `skills/_shared/retro/context-agent.md` — context doc reviewer
- Create `skills/_shared/retro/meta-agent.md` — meta learnings capturer
- Update all 5 skill `3-checkpoint.md` files to replace "Capture Learnings" with `@../_shared/retro.md`
- Update `skills/_shared/3-checkpoint-template.md` template
