# Cross-Feature Branch Drift in Sequential Dispatch

**Context:** collision-proof-slugs reconcile-in-place feature (2026-04-11)

**Problem:** Implementer agents switched to the wrong branch (prefix-resolution impl branch) during dispatch of reconcile-in-place tasks within the same session. Branch creation/checkout was skipped or failed silently.

**Decision:** ALWAYS verify branch identity between sequential feature dispatches within the same session, not just at wave boundaries. Sequential features can inherit the prior feature's impl branch when branch creation is skipped.

**Rationale:** Extends the existing wrong-branch-contamination pattern (parallel features) to sequential features. Contamination was caught only by manual controller verification, not automated checks.
