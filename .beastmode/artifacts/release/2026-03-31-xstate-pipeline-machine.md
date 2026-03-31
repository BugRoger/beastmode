---
phase: release
slug: xstate-pipeline-machine
bump: minor
---

# Release: xstate-pipeline-machine

**Bump:** minor
**Date:** 2026-03-31

## Highlights

Replaces the implicit pipeline state machine (scattered conditionals in `manifest.ts`, `post-dispatch.ts`, `deriveNextAction()`) with an explicit XState v5 state machine. Two machines — epic (design → done/cancelled) and feature (pending → completed/blocked) — define all transitions, guards, and side effects declaratively via the `setup()` API. Consumers (`post-dispatch.ts`, `watch-command.ts`, `state-scanner.ts`) now drive the actor directly. Same `.manifest.json` format, zero migration needed.

## Features

- XState v5 epic machine with 7 states, named guards (`hasFeatures`, `allFeaturesCompleted`, `outputCompleted`), and declarative actions (`persist`, `enrichManifest`, `renameSlug`, `syncGitHub`)
- Feature status machine with 4 states (pending, in-progress, completed, blocked)
- `setup()` API enforces type-safe completeness at construction time
- State metadata declares dispatch semantics (`single`, `fan-out`, `skip`) — `deriveNextAction()` deleted
- Snapshot persistence round-trip: `getSnapshot()` → JSON → `createActor(machine, { snapshot })`
- Cancel as direct transition from any non-terminal state
- Validate regression (`VALIDATE_FAILED`) as explicit implement ← validate transition with feature reset
- Slug rename as transition action on design → plan
- Consumer swap: `post-dispatch.ts` reduced to thin event router, `watch-command.ts` reads dispatch from actor meta, `state-scanner.ts` uses actor for state resolution
- 835 tests across 43 files covering all transitions, guards, actions, persistence, and integration flows

## Chores

- Design PRD with implementation decisions and module structure
- Feature decomposition into 3 implementation plans (machine-definition, machine-tests, consumer-swap)
- Validation checkpoint: 835 pass, 0 fail, 0 type errors (20 TypeScript fixes applied during validation)

## Full Changelog

- `3644ed7` design(xstate-pipeline-machine): checkpoint
- `ac1470c` plan(xstate-pipeline-machine): checkpoint
- `a6ef609` implement(machine-definition): checkpoint
- `ebe42c5` implement(machine-tests): checkpoint
- `d9aa0cc` implement(consumer-swap): checkpoint
- `f6a8877` implement(consumer-swap): checkpoint
- `feb9e71` validate(xstate-pipeline-machine): checkpoint
