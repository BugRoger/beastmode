---
phase: plan
slug: "086084"
epic: cancel-cleanup
feature: cancel-logic
wave: 1
---

# Cancel Logic — Shared Cleanup Module

**Design:** `.beastmode/artifacts/design/2026-04-02-cancel-cleanup.md`

## User Stories

1. As a developer, I want `beastmode cancel <slug>` to remove all artifacts, the manifest file, the worktree, the branch, archive tags, phase tags, and close the GitHub issue, so that no trace of the abandoned feature remains.
3. As a developer, I want cancel to be idempotent, so that running it twice on the same slug doesn't error out — it just succeeds with nothing left to clean.
5. As a developer, I want cancel to warn-and-continue on each step, so that a failure in one cleanup step (e.g., GitHub API down) doesn't prevent the rest of the cleanup from running.

## What to Build

A shared cancel module that implements the full 6-step cleanup sequence. The module is self-resolving: it takes a raw identifier string, calls `store.find()` internally to resolve to a manifest. When the manifest is already gone (idempotent re-run), it falls back to best-effort matching using the provided identifier directly for each cleanup step.

The cleanup sequence, executed in order with warn-and-continue for each step:

1. **Remove worktree and branch** — Force-delete the worktree at `.claude/worktrees/<slug>` and delete the `feature/<slug>` branch. Reuse existing `worktree.remove()`.
2. **Delete archive tag** — Delete `archive/<slug>` if it exists. Direct `git tag -d` call.
3. **Delete phase tags** — Delete all tags matching `beastmode/<slug>/*`. Reuse existing `phase-tags.deleteAllTags()`.
4. **Delete artifacts** — Glob `*-<epic>*` across `artifacts/{design,plan,implement,validate,release}/` directories. Match `.md`, `.output.json`, `.tasks.json` sidecars. Research artifacts at `artifacts/research/` are excluded.
5. **Close GitHub epic** — Read `manifest.github?.epic` before manifest deletion, close as `not_planned` via `gh issue close`. Only when GitHub is enabled.
6. **Delete manifest** — Remove the manifest file from `state/` entirely. Last step, after GitHub sync reads from it.

The module does NOT handle agent session abort — that is caller responsibility.

The module accepts a configuration object with:
- `identifier` — raw slug or epic name
- `projectRoot` — project root path
- `githubEnabled` — whether to attempt GitHub operations
- `force` — whether to skip confirmation prompt (passed through, prompt logic lives here)
- `logger` — logger instance for output

Returns a result object summarizing what was cleaned and what warned.

## Acceptance Criteria

- [ ] Shared module exists with full 6-step cleanup sequence
- [ ] Each step uses warn-and-continue — failure in one step does not prevent subsequent steps
- [ ] Self-resolving: works with hex slug or epic name
- [ ] Idempotent: running twice on same identifier succeeds with nothing left to clean
- [ ] Archive tag `archive/<slug>` is deleted when present
- [ ] All phase tags `beastmode/<slug>/*` are deleted
- [ ] All artifacts matching `*-<epic>*` across phase directories are deleted (excluding research/)
- [ ] GitHub epic is closed as not_planned when enabled and issue number is available
- [ ] Manifest file is deleted (not just marked cancelled)
- [ ] Manifest is read before deletion to extract GitHub issue number and epic name
- [ ] Confirmation prompt shown by default, skippable via force parameter
