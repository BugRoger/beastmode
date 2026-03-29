# Version File Management

## Context
Multiple files can contain version information. Keeping them in sync is a source of merge conflicts and maintenance burden.

## Decision
Version lives in 3 files only: plugin.json (source of truth), marketplace.json, and CHANGELOG.md. Removed from README badge and PRODUCT.md.

## Rationale
v0.3.7 added session-start.sh to the bump list, and version appeared in README badge and PRODUCT.md "Current Version" section. v0.6.1 reduced this to 3 files because every additional version touchpoint created merge conflict risk and maintenance burden.

## Source
- .beastmode/artifacts/release/2026-03-04-v0.3.7.md (expanded version files)
- .beastmode/artifacts/release/2026-03-04-v0.6.1.md (reduced to 3 files)
