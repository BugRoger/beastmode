# Init Flow

**Date:** 2026-03-08
**Source:** state/design/2026-03-08-init-l2-expansion.md

## Context
The init system needed to be overhauled to bootstrap the full L2/L3/meta hierarchy in a format compatible with retro agents, rather than producing a separate init-specific format.

## Decision
5-phase init flow: skeleton install -> inventory -> write -> retro -> synthesize. Writers run in parallel (all 17 domains), retros run in parallel (one per phase). Retro pass always runs after writers -- even on fresh projects with empty state/. Greenfield mode installs skeleton only and stops.

## Rationale
Separating into discrete phases allows each to be independently testable and parallelizable. The retro pass ensures state/ artifacts are processed during init, not deferred. Always running retro (even on empty state/) keeps the flow unconditional and simpler.
