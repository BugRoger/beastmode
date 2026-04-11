# Cancel Cleanup Module

## Context
The cancel command previously only changed manifest status without removing artifacts, worktrees, branches, tags, or closing GitHub issues. Three separate callers (CLI cancel, dashboard cancel, design-abandon) each needed cleanup logic, risking divergence.

## Decision
Shared module `cancel-logic.ts` exports `cancelEpic()` consumed by all three callers. Takes a raw identifier string, resolves via `resolveIdentifier()` internally. Ordered cleanup with warn-and-continue per step: (1) worktree + branch, (2) archive tags, (3) phase tags, (4) artifacts matching `-<epic>-` and `-<epic>.` patterns excluding research/, (5) GitHub issue close as not_planned (gated on github.enabled + epic number), (6) manifest file deletion. Idempotent: when manifest is already gone, falls back to identifier for best-effort cleanup. Confirmation prompt defaults to No; `--force` bypasses via `parseForce()` in args.ts. Returns structured result with cleaned[] and warned[] arrays for caller inspection. Dashboard aborts sessions before calling. Design-abandon delegates to cancelEpic() where most steps are no-ops at design phase.

## Rationale
Single code path eliminates the risk of three independent cleanup implementations diverging. Ordered steps with warn-and-continue ensures partial cleanup is always better than no cleanup. Manifest deletion last ensures GitHub sync can read the epic number before the manifest disappears. Two artifact matching patterns (`-<epic>-` for mid-name and `-<epic>.` for end-of-name) prevent false positives where one epic name is a prefix of another. Research artifacts are explicitly preserved because they are reference material useful beyond the originating feature.

## Source
.beastmode/artifacts/design/2026-04-02-cancel-cleanup.md
.beastmode/artifacts/implement/2026-04-02-cancel-cleanup-cancel-logic.md
.beastmode/artifacts/implement/2026-04-02-cancel-cleanup-force-flag.md
.beastmode/artifacts/implement/2026-04-02-cancel-cleanup-consumer-swap.md
.beastmode/artifacts/validate/2026-04-02-cancel-cleanup.md
