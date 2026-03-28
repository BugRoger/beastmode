# Release: github-phase-integration

**Version:** v0.21.0
**Date:** 2026-03-28

## Highlights

Adds manifest-based local state tracking and optional GitHub mirroring to all 5 beastmode phase checkpoints. Every design now gets a JSON manifest that tracks feature decomposition and lifecycle status, with GitHub issues and project boards synced at checkpoint boundaries when enabled.

## Features

- **Manifest system**: JSON manifest created at design checkpoint, enriched at plan (features array), updated at implement (status transitions). Local authority for feature lifecycle.
- **GitHub sync**: Optional sync step in all 5 phase checkpoints — creates/advances/closes Epic and Feature issues. Gated on `github.enabled` config toggle.
- **Setup subcommand**: `/beastmode setup-github` creates 12 labels, Projects V2 board, and enables config toggle.
- **Shared GitHub utility**: `_shared/github.md` with error handling convention (warn-and-continue), label operations, issue CRUD, epic management.
- **Status rewrite**: `/beastmode status` reads manifests from worktrees, shows per-feature status with GitHub issue links when enabled.
- **Config extension**: `github.enabled` and `github.project-name` added to `.beastmode/config.yaml`.

## Docs

- L1/L2/L3 context docs updated: DESIGN.md, PLAN.md, IMPLEMENT.md, plus 15 new L3 records across design, plan, and implement hierarchies.
- L2/L3 meta docs updated: process.md with 4 new observations (meta-implementation, cross-phase edits, template extraction signals, step renumbering friction).

## Full Changelog

66 files changed, 1279 insertions, 83 deletions across:
- 7 skill files modified (5 checkpoints + prime + status)
- 2 shared utility files modified (github.md, setup-github.md)
- 1 config file modified
- 1 manifest + 7 feature plans + 7 task files created
- 1 design doc + 1 validation report created
- ~30 context/meta L1-L3 files created or updated
