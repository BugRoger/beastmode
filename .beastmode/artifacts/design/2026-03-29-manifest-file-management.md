## Problem Statement

Manifest file management is scattered across 16 CLI source files and 3 skill checkpoints. Two competing type definitions (PipelineManifest vs Manifest), inline filesystem manipulation in watch-command.ts (180 lines of duplicate CRUD), skills creating manifests they shouldn't own, legacy code for dead path conventions, and no clear boundary between skill artifacts and pipeline state. The word "state" is used for skill outputs (PRDs, plans) which aren't state at all — they're artifacts.

## Solution

Separate artifacts from state with a directory rename, unify all manifest logic into two modules (filesystem store + pure state machine), remove all manifest operations from skills, and introduce a Stop hook that auto-generates the output.json contract from artifact frontmatter — eliminating the output.json step from skill checkpoints entirely.

## User Stories

1. As a CLI developer, I want one PipelineManifest type used everywhere, so that I don't maintain two competing schemas that drift apart.
2. As a CLI developer, I want all filesystem access for manifests in manifest-store.ts (get, list, save, create), so that no other module touches the disk for manifest operations.
3. As a CLI developer, I want all manifest state transitions in manifest.ts as pure functions (enrich, advancePhase, markFeature, cancel, deriveNextAction, checkBlocked, shouldAdvance, regressPhase, setGitHubEpic, setFeatureGitHubIssue), so that business logic is testable without filesystem mocks.
4. As a skill author, I want skills to only write artifacts to artifacts/<phase>/, so that I never need to understand manifest internals or output.json structure.
5. As an operator, I want .beastmode/artifacts/ for committed skill outputs and .beastmode/state/ for gitignored pipeline manifests, so that the directory names explain what they contain.
6. As an operator, I want a Stop hook that reads artifact frontmatter and auto-generates output.json, so that the communication contract between skills and CLI is enforced by infrastructure, not skill instructions.
7. As an operator, I want output.json as the sole completion signal (replacing .dispatch-done.json), so that there's one marker file instead of two.
8. As a CLI developer, I want watch-command.ts to use manifest-store + manifest.ts instead of 180 lines of inline JSON.parse/writeFileSync, so that manifest logic exists exactly once.
9. As a CLI developer, I want github-sync.ts to return mutations instead of mutating manifests in-place, so that all manifest writes go through the store.
10. As a CLI developer, I want validate failure to regress the phase to implement with features reset to pending, so that failed validations get fixed through the normal implement pipeline.
11. As a CLI developer, I want the blocked field to be structured ({ gate, reason } | null) instead of a boolean, so that beastmode status shows why an epic is blocked.
12. As a CLI developer, I want EpicState, FeatureProgress, and ScanResult types deleted, so that PipelineManifest is the only manifest type in the codebase.

## Implementation Decisions

### Directory Layout

- Rename `.beastmode/state/` to `.beastmode/artifacts/` (committed, skill outputs)
- Rename `.beastmode/pipeline/` to `.beastmode/state/` (gitignored, CLI-owned manifests)
- Add `.beastmode/state/` to `.gitignore`
- Manifest path convention stays: `YYYY-MM-DD-<slug>.manifest.json`

### Module Architecture

**manifest-store.ts** — filesystem boundary, sole module that imports `fs`:
- `get(slug) → PipelineManifest | undefined`
- `list() → PipelineManifest[]`
- `save(manifest: PipelineManifest) → void`
- `create(slug) → PipelineManifest`
- `validate(data) → boolean`
- Exports `PipelineManifest`, `ManifestFeature`, `ManifestGitHub` types

**manifest.ts** — pure functions, no filesystem access:
- `enrich(manifest, output) → PipelineManifest`
- `advancePhase(manifest, phase) → PipelineManifest`
- `regressPhase(manifest, phase) → PipelineManifest` (reset features to pending)
- `markFeature(manifest, slug, status) → PipelineManifest`
- `cancel(manifest) → PipelineManifest`
- `setGitHubEpic(manifest, epicNumber, repo) → PipelineManifest`
- `setFeatureGitHubIssue(manifest, featureSlug, issueNumber) → PipelineManifest`
- `deriveNextAction(manifest) → NextAction | null`
- `checkBlocked(manifest, config) → { gate: string; reason: string } | null`
- `shouldAdvance(manifest, output) → Phase | null`
- All functions return new manifests, never mutate. Caller calls `store.save()`.

### Unified Schema

Single PipelineManifest type:
```
{
  slug: string
  phase: Phase  // "design" | "plan" | "implement" | "validate" | "release" | "cancelled"
  features: ManifestFeature[]
  artifacts: Record<string, string[]>
  worktree?: { branch: string; path: string }
  github?: { epic: number; repo: string }
  blocked?: { gate: string; reason: string } | null
  lastUpdated: string  // ISO-8601
}
```

Drop the separate `Manifest` interface from state-scanner.ts. Drop the `design` top-level field requirement. Drop `EpicState`, `FeatureProgress`, `ScanResult` types.

### State Machine

**Epic phase transitions:**
- `create(slug)` → `design` (always, before dispatch)
- `advancePhase(m, "plan")` — design → plan (always after design completes)
- `advancePhase(m, "implement")` — plan → implement (when features.length > 0)
- `advancePhase(m, "validate")` — implement → validate (when all features completed)
- `advancePhase(m, "release")` — validate → release (when output status = completed)
- `regressPhase(m, "implement")` — validate → implement (when validation fails, features reset to pending)
- `cancel(m)` — any → cancelled (terminal)

**Feature status transitions:**
- `enrich(m, output)` — (none) → pending (plan output produces features)
- `markFeature(m, slug, "in-progress")` — pending → in-progress
- `markFeature(m, slug, "completed")` — in-progress → completed
- `markFeature(m, slug, "blocked")` — pending/in-progress → blocked

### Seed Timing

CLI calls `store.create(slug)` before dispatching the design skill. Manifest exists throughout the entire skill session. Post-dispatch always has a manifest to enrich.

### Skill Checkpoint Changes

Remove from all skill checkpoints:
- "Write Phase Output" steps (output.json generation)
- "Create Manifest" steps (design checkpoint)
- "Write Manifest" steps (plan checkpoint)
- "Update Manifest Status" steps (implement checkpoint)

Update all path references: `.beastmode/state/<phase>/` → `.beastmode/artifacts/<phase>/`

Skills only write artifacts. Every phase writes one primary artifact per convention:

| Phase | Artifact Pattern |
|-------|-----------------|
| design | `artifacts/design/YYYY-MM-DD-<slug>.md` |
| plan | `artifacts/plan/YYYY-MM-DD-<slug>-<feature>.md` (one per feature) |
| implement | `artifacts/implement/YYYY-MM-DD-<slug>-<feature>.md` (one per feature) |
| validate | `artifacts/validate/YYYY-MM-DD-<slug>.md` |
| release | `artifacts/release/YYYY-MM-DD-<slug>.md` |

### Artifact Frontmatter

Every artifact file has YAML frontmatter with structured metadata the hook reads:

Design: `phase: design`, `slug`
Plan: `phase: plan`, `epic`, `feature`
Implement: `phase: implement`, `epic`, `feature`, `status: completed|error`
Validate: `phase: validate`, `slug`, `status: passed|failed`
Release: `phase: release`, `slug`, `bump: major|minor|patch`

### Stop Hook (output.json generation)

A Stop hook configured in `.claude/settings.json` fires when Claude finishes responding. It:
1. Scans `artifacts/<phase>/` for files matching the slug convention
2. Reads YAML frontmatter from each artifact
3. Builds the output.json contract (status, artifacts map, feature list)
4. Writes `artifacts/<phase>/YYYY-MM-DD-<slug>.output.json`

The hook replaces the "Write Phase Output" step in all skill checkpoints.

### Completion Signal

- `output.json` is the sole completion marker for all dispatch strategies
- `.dispatch-done.json` is deleted
- SDK strategy: reads output.json after `query()` iterator completes
- cmux strategy: `fs.watch` on `artifacts/<phase>/` for `*.output.json` (replaces watching for `.dispatch-done.json`)
- Interactive: reads output.json after process exit

### Consumer Migration

| File | Change |
|------|--------|
| manifest.ts → manifest-store.ts | Filesystem operations only. Delete legacy code, reconstruct() |
| New manifest.ts | Pure state machine functions |
| state-scanner.ts | Gut or delete. Scanning = store.list() + manifest.deriveNextAction() + manifest.checkBlocked() |
| post-dispatch.ts | Import from store (get/save) + manifest (enrich/advance). Remove shouldAdvance() (moves to manifest.ts) |
| watch-command.ts | Delete 180 lines of inline manifest code. Use store + manifest.ts |
| watch.ts | Replace EpicState with PipelineManifest. Use manifest.deriveNextAction() + checkBlocked() |
| watch-types.ts | Delete EpicState, FeatureProgress, NextAction re-exports |
| github-sync.ts | Return mutations instead of mutating. Caller applies via manifest.ts + store.save() |
| commands/cancel.ts | Use manifest.cancel() + store.save() instead of raw JSON manipulation |
| commands/status.ts | Use store.list() + manifest functions instead of scanEpics/EpicState |
| phase-output.ts | Path changes: state/ → artifacts/ |
| cmux-session.ts | Watch for output.json instead of .dispatch-done.json |
| phase.ts | Remove .dispatch-done.json write. Call store.create() before dispatch |

### Migration Strategy

Big bang — one atomic commit:
1. `git mv .beastmode/state/ .beastmode/artifacts/`
2. `mv .beastmode/pipeline/ .beastmode/state/`
3. Delete 20 orphan manifests from `artifacts/plan/*.manifest.json`
4. Update all path references in CLI source, skills, and context docs
5. Update .gitignore

## Testing Decisions

- manifest.ts functions are pure — test with plain objects, no filesystem mocks needed
- manifest-store.ts tests use temp directories (existing pattern from manifest.test.ts)
- state-scanner.test.ts rewrites to test the new composition pattern (store.list() + manifest functions)
- post-dispatch.test.ts updates imports and assertions
- Hook testing: verify frontmatter parsing and output.json generation with fixture artifacts
- Integration test: skill writes artifact with frontmatter → hook generates output.json → CLI reads it → manifest updated correctly

## Out of Scope

- cmux session management changes (beyond switching the watched marker file)
- GitHub sync logic changes (beyond returning mutations instead of mutating)
- CLI command refactors unrelated to manifest handling
- New beastmode CLI commands
- Changes to the 5-phase workflow itself

## Further Notes

- 49 context docs reference old vocabulary (state/, pipeline/, EpicState). These need vocabulary updates as part of the migration.
- The Stop hook is a Claude Code settings.json configuration — no runtime dependency, just a shell script.
- Frontmatter parsing in the hook can use simple regex or a lightweight YAML parser. The frontmatter schema is minimal and controlled.

## Deferred Ideas

- Session resume capability (using session_id from SDK result messages)
- Cost tracking in manifests (removed from scanner, could be added back to store)
- Manifest archival/retention policy for completed epics
