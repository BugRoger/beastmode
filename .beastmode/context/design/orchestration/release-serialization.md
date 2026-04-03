# Release Serialization

## Context
When multiple epics reach the release phase simultaneously in the watch loop,
parallel squash-merges to main cause merge conflicts. Release is the only phase
where all epics converge on a single branch.

## Decision
Release phase dispatch is serialized to one-at-a-time via
`DispatchTracker.hasAnyReleaseSession()`. Waiting epics stay in their manifest
phase and dispatch in FIFO order by manifest creation date on subsequent ticks.
Manual `beastmode release <slug>` bypasses serialization. Concurrency limit is
hardcoded to 1, not configurable.

## Rationale
All other phases operate in isolated worktrees and can safely run in parallel.
Release is unique because it squash-merges to main — a shared resource.
Hardcoding to 1 avoids configuration complexity for a case that doesn't need it.
FIFO ordering prevents starvation. Failure cleanup is handled by the existing
session removal path — no special lock management needed.

## Source
- .beastmode/artifacts/design/2026-04-03-release-serialization.md
- .beastmode/artifacts/implement/2026-04-03-release-serialization-release-gate.md
