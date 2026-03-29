# Status Display

## Context
The status command renders a table of all epics with their current state.

## Decision
Table columns are Epic, Phase, Progress, Blocked, Last Activity. Cost column was removed. Sort order is lastUpdated descending with alphabetical slug as tiebreaker. Progress shows completed/total count only during implement phase; all other phases show a dash. lastUpdated is read directly from manifest JSON.

## Rationale
Cost tracking (costUsd, aggregateCost) was removed as dead code with no consumers. lastUpdated from the manifest provides a reliable activity timestamp without parsing run logs or file modification times.

## Source
.beastmode/artifacts/plan/2026-03-29-manifest-only-status-manifest-first-scanner.tasks.json
