# Release: github-cli-migration

**Version:** v0.32.0
**Date:** 2026-03-29

## Highlights

Moved all GitHub sync logic from skill markdown into the TypeScript CLI. Skills are now pure content processors with zero GitHub or manifest awareness. A stateless sync engine reconciles GitHub state from the pipeline manifest after every phase dispatch.

## Features

- **Manifest redesign** — Pipeline manifest restructured as pure state: single epic, top-level phase, feature statuses, artifact refs. No architectural decisions. CLI is sole mutator.
- **Phase output contract** — Skills write structured `.output.json` files to `state/<phase>/` at checkpoint. Universal schema: `{ "status": "completed", "artifacts": { ... } }`. CLI reads these to advance pipeline state.
- **GitHub sync engine** — Stateless `syncGitHub(manifest, config)` function runs post-dispatch. One-way mirror: manifest to GitHub. Blast-replace labels, create/close issues, update project board. Warn-and-continue on failures.
- **Dispatch pipeline** — CLI reads phase outputs from worktree after dispatch, updates manifest (advance phase, record artifacts, update features), then syncs GitHub.
- **Skill cleanup** — Deleted `skills/_shared/github.md`. Removed GitHub sync sections from 5 checkpoint files and implement prime. Removed manifest creation/mutation from all skills. Skills are now fully GitHub-unaware.

## Full Changelog

- `aff4239` plan(github-cli-migration): checkpoint
- `dfe589b` implement(manifest-redesign): checkpoint
- `be6ae92` implement(skill-cleanup): checkpoint
- `b7d8496` implement(phase-output-contract): checkpoint
- `0bc82f0` implement(dispatch-pipeline): checkpoint
- `d7572af` implement(github-sync-engine): checkpoint
- `f60bc89` validate(github-cli-migration): checkpoint
