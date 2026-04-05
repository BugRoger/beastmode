# Deletion Feature Scope

**Context:** manifest-absorption manifest-deletion (2026-04-05). Wave 3 consumer-migration feature migrated all remaining consumers AND cleaned up their manifest imports as part of completing the migration. The manifest-deletion feature (same wave) arrived to find most deletion work already done; its scope reduced to: delete source files, remove deprecated type aliases, fix grep-assertion self-exclusion in integration tests.

**Decision:** When the deletion feature is in the same wave as migration features, scope the deletion feature plan as "verify no remaining consumers + delete source files + final cleanup" rather than "sweep and delete all references." The migration features own their own import cleanup; deletion owns only the final source deletion and verification.

**Rationale:** Migration features must clean up their own imports to compile — they cannot leave a dangling import to be removed by a later feature in the same wave. By the time the deletion feature runs, the consumer-facing cleanup is already done. Treating deletion as a full sweep causes scope overlap that makes the deletion feature's task list redundant and inflates effort estimates.
