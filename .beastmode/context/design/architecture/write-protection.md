# Write Protection

## Context
Workflow phases could directly modify L0/L1/L2 context and meta files, creating uncontrolled writes outside the retro promotion pathway.

## Decision
Phases write artifacts to `artifacts/` only. Compaction and promotion to L1 and L2 happens exclusively through retro. Release owns L1->L0 promotion via L0 proposal files in `artifacts/release/`. Init has a bootstrap exemption for creating files from nothing.

## Rationale
- Single gatekeeper (retro) prevents uncontrolled context drift
- Init exemption necessary for bootstrap (creates files from nothing)
- L0 proposals preserve the write-protection invariant for release

## Source
state/design/2026-03-06-context-write-protection.md
.beastmode/artifacts/design/2026-03-29-manifest-file-management.md
