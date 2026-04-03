---
phase: plan
slug: cli-restructure
epic: cli-restructure
feature: domain-restructure
wave: 1
---

# Domain Restructure

**Design:** .beastmode/artifacts/design/2026-04-03-cli-restructure.md

## User Stories

1. As a developer, I want CLI source files organized into domain directories with uniform verb naming, so that I can find code by its responsibility. (US 3)

## What to Build

Move the 43 root-level source files into 7 domain directories following the structure defined in the design. This is a mechanical restructuring — same functionality, new addresses.

**Domain directories to create:**

1. **`git/`** — `worktree.ts` (absorbs `git.ts`), `tags.ts` (from `phase-tags.ts`)
2. **`hooks/`** — `pre-tool-use.ts` (from `hitl-settings.ts` build/get), `post-tool-use.ts` (from `hitl-log.ts` format)
3. **`dispatch/`** — `factory.ts` (absorbs `session.ts`, `runners/interactive-runner.ts`, `sdk-streaming.ts`), `tracker.ts` (from `dispatch-tracker.ts`), `cmux.ts` (absorbs `cmux-client.ts`, `cmux-session.ts`, `cmux-types.ts`), `it2.ts` (absorbs `it2-client.ts`, `it2-session.ts`), `types.ts` (absorbs `watch-types.ts`)
4. **`artifacts/`** — `reader.ts` (absorbs `phase-output.ts`, `artifact-reader.ts`, `section-extractor.ts`, `section-splitter.ts`)
5. **`manifest/`** — `store.ts` (from `manifest-store.ts`), `pure.ts` (absorbs `manifest.ts`, `hydrate-actor.ts`), `reconcile.ts` (from root `reconcile.ts`)
6. **`github/`** — `sync.ts` (absorbs `github-sync.ts`, `body-format.ts`), `discovery.ts` (from `github-discovery.ts`), `cli.ts` (from `gh.ts`)
7. **`pipeline/`** — `startup.ts` (absorbs `reconcile-startup.ts`)

**Root-level files that stay:**
- `settings.ts` (create/delete)
- `config.ts` (absorbs `project-root.ts`)
- `args.ts`, `index.ts`, `lockfile.ts`, `logger.ts`, `types.ts`
- `generate-output.ts` (standalone Stop hook entry point)

**Unchanged zones:**
- `pipeline-machine/` — XState machines, out of scope
- `commands/` — stay as files, but update imports to point to new domain dirs
- `dashboard/` — React TUI, out of scope
- `shared/` — `status-data.ts` (absorbs `change-detect.ts`), `log-format.ts`, `cancel-logic.ts`

**Naming conventions enforced:**
- No prefix stutter: `github/sync.ts` not `github/github-sync.ts`
- No domain-in-filename: `manifest/pure.ts` not `manifest/manifest.ts`
- Proper nouns keep prefix: `cmux`, `it2` stay inside their directories
- Functions use CRUD verb vocabulary: create, get, list, find, update, delete, run, parse, format
- Domain-specific verbs where no generic fits: rebase, merge, rename

**Import rewriting:**
- Every consumer that imports from a moved module must be updated to the new path.
- All `commands/*.ts` files will need import path updates.
- `watch-command.ts` (moves into pipeline or stays root — per design it's absorbed by `pipeline/runner.ts` in wave 3) needs its imports updated.
- `index.ts` entry point needs updated command imports.

**Test migration:**
- Test files follow their source to the new directory.
- Test imports updated to match new source paths.

## Acceptance Criteria

- [ ] All 7 domain directories created with files per the design's directory structure
- [ ] File collapse map honored — each "absorbs" relationship results in a single target file
- [ ] Root-level file count reduced from 43 to ~10 (config, args, index, lockfile, logger, types, settings, generate-output)
- [ ] `runners/` directory deleted (contents absorbed into `dispatch/factory.ts`)
- [ ] All import paths updated — zero broken references
- [ ] Naming conventions enforced: no stutter, no domain-in-filename, CRUD verbs
- [ ] `tsc --noEmit` passes
- [ ] `bun test` passes with no regressions
- [ ] `shared/status-data.ts` absorbs `change-detect.ts` functionality
- [ ] `config.ts` absorbs `project-root.ts` functionality
