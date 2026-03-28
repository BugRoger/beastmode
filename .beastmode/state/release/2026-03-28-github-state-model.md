# Release: github-state-model

**Version:** v0.18.0
**Date:** 2026-03-28

## Highlights

GitHub state model externalizes beastmode's workflow lifecycle to GitHub Issues and Projects V2. Two-level issue hierarchy (Epic > Feature) with label-based state machines, a shared GitHub API utility, and a setup subcommand to bootstrap the infrastructure.

## Features

- GitHub state model data model: label taxonomy (type/, phase/, status/, gate/), Epic and Feature state machines, phase-artifact-issue mapping, migration path
- Shared GitHub API utility (`skills/_shared/github.md`): auth check, repo detection, label CRUD, issue CRUD (create epic, create feature as sub-issue, close, check completion via GraphQL), Projects V2 operations
- Setup subcommand (`/beastmode setup-github`): bootstrap labels, Projects V2 board, column configuration, repo linking — idempotent
- Extended config template: `backlog-to-design` and `release-to-done` transitions, `github.project-name` setting

## Docs

- Context hierarchy: new GitHub state model L2 doc with 7 L3 records, new GitHub integration L2 doc with 5 L3 records
- Updated L1 design context (product, architecture, tech stack, phase transitions)
- Updated L1 plan context (workflow autonomous chaining)
- Meta observations: design-to-plan mapping, wave-based parallelism, verification-as-plan-task

## Artifacts

- Design: .beastmode/state/design/2026-03-28-github-state-model.md
- Plan: .beastmode/state/plan/2026-03-28-github-state-model.md
- Validate: .beastmode/state/validate/2026-03-28-github-state-model.md
- Release: .beastmode/state/release/2026-03-28-github-state-model.md
