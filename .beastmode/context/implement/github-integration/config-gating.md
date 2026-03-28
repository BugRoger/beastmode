# Config Gating

## Context
GitHub integration is optional. Not all projects use GitHub, and sync failures should never break the local workflow.

## Decision
Gate all GitHub operations on `github.enabled` in `.beastmode/config.yaml`. When false or missing, skip the entire sync step. Also check for `github` block in manifest before feature-level sync.

## Rationale
Two-level gating (config + manifest) ensures: (1) users who never enable GitHub see zero overhead, (2) features created before GitHub was enabled are handled gracefully, (3) setup-github is the only entry point for enabling.

## Source
.beastmode/state/plan/2026-03-28-github-phase-integration.manifest.json
