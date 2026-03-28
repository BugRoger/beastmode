# Manifest Schema

## Context
Feature lifecycle needs a local JSON artifact that tracks state across phases and optionally includes GitHub references.

## Decision
JSON manifest created at design checkpoint (minimal: design path + optional epic number). Enriched at plan checkpoint (features array with slugs, plan paths, statuses). Updated at implement checkpoint (feature status transitions). Optional github blocks (root-level epic/repo, per-feature issue numbers) present only when github.enabled is true. Four feature statuses: pending, in-progress, blocked, completed.

## Rationale
Progressive enrichment matches beastmode's phase model — each phase adds what it knows. JSON format is machine-readable for /beastmode status. Optional github blocks mean the schema works identically with or without GitHub integration.

## Source
.beastmode/state/design/2026-03-28-github-phase-integration.md
