---
phase: plan
epic: github-no-for-real-sync
feature: config-unification
---

# config-unification

**Design:** .beastmode/artifacts/design/2026-03-29-github-no-for-real-sync.md

## User Stories

3. As a pipeline operator, I want the repo (owner/name) auto-detected from `git remote get-url origin`, so I never have to manually configure it in every manifest.
4. As a developer, I want setup-github to write project metadata (project-id, project-number, field-id, field-options) directly to `config.yaml`, so the sync engine can read them without a separate cache file.

## What to Build

Two changes to the configuration layer:

**Repo auto-detection:** A `detectRepo(projectRoot)` function that shells out to `git remote get-url origin`, parses the owner/repo pair from both HTTPS (`https://github.com/owner/repo.git`) and SSH (`git@github.com:owner/repo.git`) URL formats, and returns the `owner/repo` string. Called lazily during sync when `config.github.repo` is not already set. On first detection, the result is written back to `config.yaml` under `github.repo` so subsequent syncs avoid the shell call. Graceful failure: if there's no remote or the URL isn't GitHub, return undefined and let the sync engine's existing guard ("No github.repo") handle it.

**Cache-to-config migration:** The existing `github-project.cache.json` contains valid project metadata (project-id, project-number, field-id, field-options map). Migrate these values into the `config.yaml` `github:` section. Update setup-github to write directly to `config.yaml` instead of the cache file. Delete the cache file and all references to it. The config module already has the `GitHubConfig` interface with these fields — it just needs the YAML to be populated.

**Config writing:** Add a `writeConfigField(projectRoot, section, key, value)` or `updateConfig(projectRoot, patch)` utility that reads `config.yaml`, updates the specified field, and writes it back. Used by both detectRepo (to cache repo) and setup-github (to write project metadata). Must preserve existing YAML structure and comments.

## Acceptance Criteria

- [ ] `detectRepo()` correctly parses HTTPS and SSH GitHub remote URLs
- [ ] `detectRepo()` returns undefined for non-GitHub or missing remotes
- [ ] First successful detection writes `github.repo` to config.yaml
- [ ] Subsequent calls read from config without shelling out
- [ ] Project metadata from cache file is migrated to config.yaml fields
- [ ] Cache file (`github-project.cache.json`) is deleted and no code references it
- [ ] Config module correctly loads all project metadata from config.yaml
- [ ] Config writing preserves existing YAML structure and comments
