# Status Display

## Context
The dashboard renders epic state information using shared data logic from `status-data.ts`.

## Decision
Table columns are Epic, Phase, Progress, Blocked, Last Activity. Sort order is lastUpdated descending with alphabetical slug as tiebreaker. Progress shows completed/total count only during implement phase; all other phases show a dash. lastUpdated is read directly from manifest JSON.

## Rationale
lastUpdated from the manifest provides a reliable activity timestamp without parsing run logs or file modification times.

## Source
.beastmode/artifacts/plan/2026-03-29-manifest-only-status-manifest-first-scanner.tasks.json
