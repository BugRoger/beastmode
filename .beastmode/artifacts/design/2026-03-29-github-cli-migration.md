## Problem Statement

GitHub sync logic is embedded across 9 skill markdown files (5 checkpoint phases + 1 implement prime + 1 shared library + 1 setup subcommand + 1 status display), violating the architectural principle that skills are pure content processors. Skills should not have side effects — they should produce documents and decisions, not make API calls. The current approach makes sync logic hard to test, version, and debug because it's scattered across markdown instructions interpreted by Claude. Additionally, the manifest schema mixes pipeline state with content concerns (architectural decisions), skills write directly to the manifest, and the manifest lives alongside skill artifacts rather than in a dedicated pipeline directory.

## Solution

Move all GitHub integration into the TypeScript CLI (`cli/`). Introduce a clean separation: skills write structured phase output files to `state/`, the CLI reads those outputs and manages a pipeline manifest, and a stateless sync function reconciles GitHub to match the manifest as a one-way mirror. The manifest is redesigned as pure pipeline state — single epic, top-level phase, feature statuses, artifact references, worktree info. Skills have zero awareness of the manifest or GitHub. The CLI is the sole manifest mutator.

## User Stories

1. As a pipeline operator, I want GitHub sync to happen automatically after every phase dispatch, so that I don't rely on skills interpreting markdown instructions correctly.
2. As a skill author, I want skills to be pure content processors with no GitHub or manifest awareness, so that I can modify skill logic without worrying about breaking pipeline state.
3. As a developer, I want a single TypeScript module containing all GitHub sync logic, so that I can test, debug, and iterate on it using standard tooling.
4. As a developer, I want the manifest to contain only pipeline state (phase, features, artifacts, worktree), so that the operational state model is clear and minimal.
5. As a pipeline operator, I want GitHub sync failures to warn and continue without blocking the workflow, so that local state remains authoritative regardless of GitHub availability.

## Implementation Decisions

- **Sync trigger**: Post-only stateless sync. A single `syncGitHub(manifest, config)` call runs after every phase dispatch. No pre-sync, no phase parameter. The function reads the manifest and makes GitHub match. Same code path for manual `beastmode <phase>` and watch loop dispatch.
- **Sync direction**: One-way manifest to GitHub. The sync never reads GitHub state to update the manifest. If someone manually changes a label on GitHub, the next sync overwrites it. Bootstrap write-back is the sole exception: when the sync creates an Epic or Feature issue, it writes the issue number back to the manifest `github` block.
- **Reconciliation logic**: The sync function iterates the manifest. If no `github.epic` exists, create the epic issue and write the number back. Set the epic's `phase/*` label to match `manifest.phase` using blast replace (remove all `phase/*` labels, add the correct one). Set the project board status to match. For each feature: create issue if missing, set `status/*` label to match feature status, close if `completed`. If `manifest.phase == "done"`, close the epic.
- **Label strategy**: Blast replace for mutually exclusive label families (`phase/*`, `status/*`). Remove all labels in the family, then add the correct one. Idempotent, simple, one extra API call.
- **Projects V2 metadata**: Stored in `config.yaml` by the setup-github skill. The `github` config block is extended with `project-id`, `field-id`, and option ID mappings. CLI reads config directly — no cache file, no lazy queries.
- **Manifest schema**: Redesigned as pure pipeline state. Single epic with top-level `phase` field. Features array with `slug`, `status`, and `plan` path. Artifact references accumulated across phases. Worktree info (branch, path). Optional `github` block for issue numbers. No architectural decisions. Self-contained — feature plan paths live on feature objects.
- **Manifest location**: `.beastmode/pipeline/<slug>/manifest.json`. Local-only, gitignored. Not committed to the repo. CLI rebuilds from worktree branch scanning on cold start.
- **Manifest lifecycle**: CLI creates at first phase dispatch (design) with `slug`, `phase: "design"`, and worktree info. Enriched from phase outputs at each checkpoint. CLI is the sole mutator — skills never read or write the manifest.
- **Phase output contract**: Skills write a structured output file to `state/<phase>/YYYY-MM-DD-<slug>.output.json` at checkpoint. Universal schema: `{ "status": "completed", "artifacts": { ... } }`. Features are listed in artifacts. Output files are kept as audit trail, committed on the feature branch alongside skill artifacts. The CLI reads output files from the worktree's `state/` directory after dispatch.
- **Dispatch pipeline**: After phase dispatch, the CLI reads the phase output from the worktree, updates the manifest (advance phase, record artifacts, update feature statuses), then runs `syncGitHub(manifest, config)`.
- **Setup command**: Stays as a skill (`skills/beastmode/subcommands/setup-github.md`). Interactive, one-time, not part of the dispatch pipeline. Extended to write project metadata (project ID, field IDs, option IDs) to `config.yaml`.
- **GitHub API client**: `gh` CLI via `Bun.spawn`. Same as current approach but in TypeScript instead of markdown bash snippets.
- **Error handling**: Warn-and-continue. All `gh` calls wrapped in try/catch. Failures log a warning and skip the operation. Manifest `github` blocks are not written if the corresponding operation failed. Next phase sync picks up where the previous one left off.
- **Skill cleanup**: Delete `skills/_shared/github.md`. Remove GitHub sync sections from 5 checkpoint files and implement prime. Remove manifest creation/mutation from all skills. Add output file writing to each checkpoint. Skills become fully GitHub-unaware and manifest-unaware.
- **Migration**: Clean cut, no backward compatibility. Delete old manifests in `state/plan/*.manifest.json`. Rewrite CLI manifest module. No support for old schema — this is the beastmode project, all state can be recreated.

## Testing Decisions

- Unit test the sync function: given a manifest state, assert correct list of `gh` CLI calls. Mock `Bun.spawn` at the process boundary.
- Unit test the reconciliation logic: verify blast-replace label behavior, issue creation with write-back, feature closing, epic closing.
- Unit test the manifest module: seed, enrich from phase outputs, phase advancement, cold-start reconstruction.
- Unit test the phase output reader: parse valid outputs, handle missing/corrupt files gracefully.
- Integration test warn-and-continue: simulate `gh` failures and verify workflow continues with correct warnings and no manifest `github` block.
- Prior art: existing CLI tests in `cli/` use Bun's test runner. Follow the same patterns.

## Out of Scope

- Changing the GitHub state model (labels, hierarchy, Projects V2 structure) — this migration preserves the existing model.
- Adding new GitHub features (PR creation, webhook integration, etc.).
- Bidirectional sync (GitHub to manifest) — sync is strictly one-way.
- Migration tooling for other projects — this is a beastmode-internal migration.
- `beastmode status` changes — it reads manifest `github` fields, which remain in the same shape.
- State scanner changes — it already reads from the pipeline directory.

## Further Notes

- The `skills/beastmode/subcommands/status.md` command reads manifest `github` fields for display. This is read-only and requires no changes beyond pointing at the new manifest location.
- The setup-github skill is extended to write project metadata to `config.yaml` but otherwise unchanged.
- The `github.enabled` config toggle and `github.project-name` config remain in `.beastmode/config.yaml`. The `github` config block gains `project-id`, `field-id`, and phase option ID fields written by setup.

## Deferred Ideas

- `beastmode sync <slug>` manual sync command for retry/debugging — may be useful but not needed since post-phase sync handles retries automatically.
- Bidirectional sync (react to manual GitHub label changes) — out of scope for one-way mirror model.
- `beastmode setup-github` migration to CLI — currently stays as skill, may move later for consistency.
