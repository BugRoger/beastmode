# Migration Strategy

## Context
The manifest system is new infrastructure. Existing in-flight features predate GitHub integration.

## Decision
No backfill for existing in-flight features. Setup creates infrastructure (labels, board, config toggle) only. New features get manifest creation at design checkpoint and GitHub issues from their next checkpoint forward. Migration order: setup -> design checkpoint -> plan checkpoint -> implement -> validate/release.

## Rationale
Backfill introduces complexity without proportional value — existing features are already tracked locally. Forward-only migration means each phase can be validated independently. Setup idempotency allows safe re-runs.

## Source
.beastmode/state/design/2026-03-28-github-phase-integration.md
