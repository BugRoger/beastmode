# Method Signatures

## Context
Plan specified 8 free functions with names newWorkspace, newSplit, sendSurface. Implementation needed to reconcile naming with cmux CLI subcommands and add missing query capabilities.

## Decision
Renamed to createWorkspace, createSurface, sendText. Added getSurface (not in plan). Added module-level cmuxAvailable() helper. Surface methods take (workspace, surface) string pairs instead of opaque IDs.

## Rationale
create* prefix aligns with cmux CLI "new" subcommands and TypeScript conventions. getSurface needed for startup reconciliation to check individual surface state. cmuxAvailable() provides a one-liner for auto-detection without constructing a client.

## Source
cli/src/cmux-client.ts
