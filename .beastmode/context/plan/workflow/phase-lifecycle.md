# Phase Lifecycle

## Context
The workflow needed a clear phase sequence with standalone utilities separated from core phases. Phase endings needed a single, authoritative source for next-step commands.

## Decision
Five-phase core workflow: design -> plan -> implement -> validate -> release. Each phase follows sub-phase anatomy: prime -> execute -> validate -> checkpoint. Standalone utilities: /beastmode (init), /status, /cancel (epic teardown with archive, cleanup, and GitHub close). Retro runs within each checkpoint sub-phase. Only the transition gate in checkpoint sub-phases may produce next-step commands — retro, context report, and sub-agents are explicitly banned from printing transition guidance.

## Rationale
Five phases cover the full development lifecycle. Sub-phase anatomy ensures consistent structure within each phase. Retro embedded in checkpoints prevents knowledge loss between phases. Exclusive transition authority eliminates duplicate next-step commands that confused users about what to run next.

## Source
state/plan/2026-03-01-remove-verify-phase.md
state/plan/2026-03-01-skill-refactor.md
state/plan/2026-03-08-phase-end-guidance.md
