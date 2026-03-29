## Context
Phase tracking used separate marker files alongside manifests and a manifest.phases map, creating dual sources of truth.

## Decision
Add a top-level manifest.phase field with values: plan | implement | validate | release | released. Scanner reads this field directly. Reconciler is the sole writer. Remove marker files and the manifest.phases map.

## Rationale
Single field eliminates ambiguity. The reconciler as sole writer creates a clear ownership boundary. Marker files and the phases map were redundant mechanisms for the same information.

## Source
.beastmode/artifacts/design/2026-03-29-bulletproof-state-scanner.md
