## Context
The CLI had a standalone state-scanner.ts module that read manifest files from the pipeline directory. The manifest-file-management design replaces this with a composition of manifest-store.ts and manifest.ts.

## Decision
state-scanner.ts is gutted or deleted. Scanning is composed from store.list() (reads manifests from `.beastmode/state/`) + manifest.deriveNextAction() + manifest.checkBlocked(). No standalone scanner module. Manifest path convention: `state/YYYY-MM-DD-<slug>.manifest.json` (gitignored, CLI-owned).

## Rationale
Composing scanning from store + pure functions eliminates the standalone scanner as a separate module with its own types and path conventions. store.list() provides the same discovery as the old scanner, and manifest.ts pure functions provide the same state derivation — but now the types, paths, and logic are shared with the rest of the manifest system.

## Source
.beastmode/artifacts/design/2026-03-29-bulletproof-state-scanner.md
.beastmode/artifacts/design/2026-03-29-manifest-file-management.md
