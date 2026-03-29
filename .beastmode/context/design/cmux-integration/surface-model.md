## Context
Dispatched agents need visual organization that maps to the epic/feature mental model.

## Decision
One cmux workspace per active epic, one surface per dispatched phase or feature within the workspace. Agent commands sent via `cmux send-surface` which runs `beastmode <phase> <slug>` — CLI-in-surface execution model. `phaseCommand` handles worktree creation, SDK dispatch, run logging, and release teardown inside the surface. The watch loop does not duplicate this logic for the cmux path. Agents get full interactive terminal capability.

## Rationale
Workspace-per-epic maps naturally to the mental model: switching workspaces = switching epics. CLI-in-surface means agents get real terminals (better than SDK path where interactive input is impossible) and phaseCommand owns the full lifecycle.

## Source
`.beastmode/artifacts/design/2026-03-29-cmux-integration-revisited.md`
