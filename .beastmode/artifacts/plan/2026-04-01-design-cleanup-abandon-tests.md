---
phase: plan
slug: design-cleanup
epic: design-cleanup
feature: abandon-tests
wave: 2
---

# Abandon Tests

**Design:** .beastmode/artifacts/design/2026-04-01-c3cc89.md

## User Stories

5. As a developer, I want `store.remove()` to be idempotent so cleanup is safe to retry

## What to Build

Test suite covering both defense layers introduced by this epic. Three test groups:

**Manifest store remove idempotency:** Verify that `store.remove()` handles all edge cases — successful deletion returns true, missing file returns false without throwing, repeated calls on the same slug remain stable. This may already be partially covered; verify existing test coverage first and extend only what's missing.

**Design abandon gate integration:** Mock `runInteractive()` to return both success (exit 0) and error (non-zero) exit statuses without producing an output.json artifact. Verify that in both cases the cleanup sequence fires: worktree removed, branch deleted, manifest deleted, GitHub issue closed. Also verify the positive path: when output.json exists, no cleanup occurs and post-dispatch is called normally.

**Post-dispatch guard unit:** Call the post-dispatch event mapping with design phase context but no output artifact present. Verify that no `DESIGN_COMPLETED` event is generated. Also verify that with output present, the event is generated as before.

Follow existing test patterns and conventions in the codebase (test runner, assertion library, mock patterns).

## Acceptance Criteria

- [ ] `store.remove()` tested for: successful deletion, missing file returns false, idempotent repeated calls
- [ ] Design abandon path tested for exit 0 without output (cleanup fires)
- [ ] Design abandon path tested for non-zero exit without output (cleanup fires)
- [ ] Design abandon path tested for exit 0 with output (no cleanup, normal flow)
- [ ] Post-dispatch guard tested: no output → no DESIGN_COMPLETED event
- [ ] Post-dispatch guard tested: output present → DESIGN_COMPLETED event generated
- [ ] All tests pass in CI
