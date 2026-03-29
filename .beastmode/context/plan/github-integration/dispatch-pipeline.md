# Dispatch Pipeline

## Context
GitHub sync was previously embedded in skill checkpoints, making it unreliable and duplicated. The sync engine and manifest enrichment need a single invocation point that runs after every phase dispatch.

## Decision
Post-dispatch hook in the CLI's phase command and watch loop. After every phase dispatch: read phase output file, update manifest (advance phase, record artifacts, update feature statuses), then call `syncGitHub(manifest, config)`. Same code path for manual `beastmode <phase>` and watch loop auto-dispatch. Implement fan-out updates per-feature status before sync. Missing output files do not block the pipeline.

## Rationale
Single post-dispatch hook guarantees sync runs regardless of which phase executed. Shared code path between manual and watch eliminates behavioral differences. Graceful missing-output handling means partial skill failures don't block the pipeline.

## Source
state/plan/2026-03-29-github-cli-migration-dispatch-pipeline.md
state/plan/2026-03-28-github-cli-migration.manifest.json
