# Phase Derivation

## Context
Each epic must report its current phase so the CLI can display status and compute next actions.

## Decision
Derive phase from manifest.phases map and feature completion state. Logic chain: release completed in phases map means done; no features means plan; all features completed plus validate completed means release; all features completed means validate; otherwise implement. designPath is optional on EpicState since manifests are the authority.

## Rationale
Using the phases map gives explicit phase tracking rather than inferring phase from filesystem markers. This removes guesswork and makes the state machine deterministic from a single JSON read.

## Source
.beastmode/artifacts/plan/2026-03-29-manifest-only-status-manifest-first-scanner.tasks.json
