## Problem Statement

GitHub sync logic is embedded across 8 skill markdown files (6 checkpoint phases + 1 implement prime + 1 shared library), violating the architectural principle that skills are pure content processors. Skills should not have side effects — they should produce documents and decisions, not make API calls. The current approach also makes the sync logic hard to test, version, and debug because it's scattered across markdown instructions interpreted by Claude.

## Solution

Move all GitHub integration into the TypeScript CLI (`cli/`). The CLI wraps every phase dispatch with pre-sync and post-sync hooks: pre-sync handles status transitions (e.g., marking features as in-progress), post-sync handles completions (e.g., closing features, advancing epic phase). Skills become fully GitHub-unaware. The `setup-github` bootstrap command also moves to the CLI. The CLI uses `gh` CLI via Bun.spawn for all GitHub API operations, with in-memory lazy caching for Projects V2 metadata.

## User Stories

1. As a pipeline operator, I want GitHub sync to happen automatically around phase dispatch, so that I don't rely on skills interpreting markdown instructions correctly.
2. As a skill author, I want skills to be pure content processors with no GitHub awareness, so that I can modify skill logic without worrying about breaking GitHub sync.
3. As a developer, I want a single TypeScript module containing all GitHub sync logic, so that I can test, debug, and iterate on it using standard tooling.
4. As a project admin, I want `beastmode setup-github` to be a CLI command, so that bootstrap is consistent with the rest of the CLI interface.
5. As a pipeline operator, I want GitHub sync failures to warn and continue without blocking the workflow, so that local state remains authoritative regardless of GitHub availability.

## Implementation Decisions

- **Sync location**: All GitHub sync logic moves to the CLI. Skills have zero GitHub awareness — no imports, no conditional checks, no `github.enabled` references.
- **Sync timing**: Pre-sync + post-sync wrapping every phase dispatch. Pre-sync handles status transitions (e.g., setting features to `status/in-progress` before implement). Post-sync handles completions (e.g., closing features, advancing epic phase labels, updating Projects V2 board status). This is uniform across all phases — same code path for manual `beastmode <phase>` and watch loop dispatch.
- **Phase-based rules**: CLI uses a switch on `(phase)` + manifest state to determine which GitHub operations to run. No diffing, no sidecar files. Each phase has well-defined pre and post sync semantics:
  - **design pre**: no-op. **design post**: create epic, add to project (status: Design).
  - **plan pre**: no-op. **plan post**: advance epic to `phase/plan`, create feature sub-issues with `status/ready`, add epic to project (status: Plan).
  - **implement pre**: set features to `status/in-progress`, advance epic to `phase/implement`, add epic to project (status: Implement). **implement post**: close completed features, check epic completion, advance to `phase/validate` if all done, update project status.
  - **validate pre**: no-op (safety: ensure epic is at `phase/validate`). **validate post**: update project status (Validate).
  - **release pre**: no-op. **release post**: advance epic to `phase/done`, close epic, update project status (Done).
- **Manifest ownership**: CLI exclusively owns the `github` block in manifest JSON. Skills write content fields (design path, features array, statuses). CLI writes `github.epic`, `github.repo`, and per-feature `github.issue` fields after performing the corresponding GitHub operations.
- **GitHub API client**: `gh` CLI via Bun.spawn, same as current approach but in TypeScript instead of markdown bash snippets. Preserves existing `gh` commands and GraphQL queries.
- **Projects V2 cache**: In-memory lazy cache. On first sync call that needs project metadata, CLI queries GraphQL for project ID, status field ID, and option IDs. Cached in-process for the session. No file-based cache (`.beastmode/state/github-project.cache.json` is removed).
- **Error handling**: Warn-and-continue pattern preserved. All `gh` calls wrapped in try/catch. Failures log a warning and skip the operation. Manifest `github` blocks are not written if the corresponding operation failed. Next phase retry picks up where the previous one left off.
- **Setup command**: `beastmode setup-github` moves from skill (`skills/beastmode/subcommands/setup-github.md`) to CLI command (`cli/src/github-setup.ts`). Same 10-step bootstrap (verify auth, create labels, create project board, configure pipeline field, link repo, backfill, enable config). No cache file write (lazy cache replaces it).
- **Dispatch integration**: The dispatch pipeline becomes `preSync(slug, phase) -> runSession(epic, phase) -> postSync(slug, phase)`. Both sync calls are gated on `github.enabled` config. Watch loop uses the same dispatch function, getting sync for free.

## Testing Decisions

- Unit test the phase-based rule engine: given a phase and manifest state, assert correct list of GitHub operations. Mock the `gh` CLI calls at the Bun.spawn boundary.
- Integration test the warn-and-continue behavior: simulate `gh` failures and verify the workflow continues with correct warnings.
- Test manifest read/write: ensure CLI correctly reads manifest, performs sync, and writes `github` block without corrupting other fields.
- Test the lazy cache: verify that Projects V2 metadata is fetched once per session and reused.
- Prior art: existing CLI tests in `cli/` use Bun's test runner. Follow the same patterns.

## Out of Scope

- Changing the GitHub state model (labels, hierarchy, Projects V2 structure) — this migration preserves the existing model.
- Adding new GitHub features (PR creation, webhook integration, etc.).
- Changing the manifest schema beyond ownership of the `github` block.
- Migration tooling for existing projects — existing manifests with `github` blocks will continue to work.

## Further Notes

- The `skills/beastmode/subcommands/status.md` command reads manifest `github` fields for display. This is read-only and requires no changes — the data source (manifest JSON) is unchanged.
- The CLI `state-scanner.ts` already reads `github` fields from manifests. No changes needed there.
- The `github.enabled` config toggle and `github.project-name` config remain in `.beastmode/config.yaml`. No config schema changes.

## Deferred Ideas

- `beastmode sync <slug>` manual sync command for retry/debugging — may be useful but not needed for MVP since post-phase sync handles retries automatically.
- GitHub webhook listener for external status updates — out of scope for this migration.
