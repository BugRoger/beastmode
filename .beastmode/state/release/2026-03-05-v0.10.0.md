# Release v0.10.0

**Date:** 2026-03-05

## Highlights

HITL gates become first-class task-runner steps. All 15 gates across every skill phase converted from invisible HTML comment annotations into visible `## N. Gate:` headings with human/auto substeps, resolved from config.yaml at runtime.

## Features

- **Task-runner gate detection**: Gate steps processed by task runner with config.yaml lookup and mode-based substep pruning
- **Inline gate steps**: 15 `## N. Gate:` steps replace `<!-- HITL-GATE -->` annotations + `@gate-check.md`/`@transition-check.md` imports across all skill phases
- **Two-tier HITL system**: `<HARD-GATE>` for unconditional constraints, `## N. Gate:` for configurable human/auto behavior

## Docs

- Architecture: "Two-Tier HITL Gate System" key decision documented
- Testing: Gate verification commands and critical paths added
- gate-check.md, transition-check.md demoted to "Reference Only"
- Design + implement learnings captured from hitl-adherence session

## Full Changelog

980d449 WIP: pre-release changes
