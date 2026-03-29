# Manifest-Based Feature Decomposition

## Observation 1
### Context
During github-phase-integration planning, 2026-03-28
### Observation
The plan phase now produces a manifest JSON plus N independent feature plans rather than a single monolithic plan. The manifest tracks feature slugs, plan paths, statuses, and architectural decisions. Each feature plan is a self-contained document with user stories, what-to-build, and acceptance criteria scoped to that feature alone. The github-phase-integration PRD decomposed into 7 features this way.
### Rationale
This structural shift changes the plan phase's output contract. Instead of one large plan file, consumers (implement, validate) now read the manifest to discover features and their individual plans. This is worth tracking because it affects how downstream phases operate.
### Source
state/plan/2026-03-28-github-phase-integration.manifest.json
### Confidence
[HIGH] -- upgraded: third observation recorded (Observation 3), pattern confirmed across three epics

## Observation 2
### Context
During epic-worktree-lifecycle planning, 2026-03-29
### Observation
The plan phase again produced a manifest JSON plus 4 independent feature plans rather than a single monolithic plan. The manifest tracks feature slugs, plan file paths, statuses, GitHub issue numbers, and architectural decisions. Each feature plan (cli-worktree-lifecycle, cancel-command, skill-worktree-sweep, delete-justfile-hooks) is self-contained with user stories, what-to-build sections, and acceptance criteria scoped to that feature alone. The manifest also links back to the design artifact and records the GitHub epic number.
### Rationale
Second production use of the manifest-based decomposition approach. Confirms this is becoming the standard plan output format for multi-feature epics. The manifest's role as the coordination artifact (linking features, tracking status, recording decisions) is consistent across both uses.
### Source
state/plan/2026-03-29-epic-worktree-lifecycle.manifest.json
### Confidence
[MEDIUM] -- second observation, pattern recurring

## Observation 3
### Context
During github-cli-migration planning, 2026-03-29
### Observation
The plan phase again produced a manifest JSON plus 5 independent feature plans (manifest-redesign, phase-output-contract, github-sync-engine, dispatch-pipeline, skill-cleanup). The manifest tracks feature slugs, plan file paths, statuses, and GitHub issue numbers. Each feature plan is self-contained with user stories, what-to-build, and acceptance criteria. User stories trace back to specific design user stories, providing design-to-plan traceability.
### Rationale
Third production use of the manifest-based decomposition approach. Confirms this is the standard plan output format for multi-feature epics. Pattern is now well-established across three distinct epics.
### Source
state/plan/2026-03-28-github-cli-migration.manifest.json
### Confidence
[HIGH] -- third observation, upgraded from MEDIUM; pattern confirmed across three epics

## Observation 4
### Context
During manifest-file-management planning, 2026-03-29
### Observation
The plan phase produced a manifest JSON plus 5 independent feature plans (manifest-modules, directory-rename, consumer-migration, skill-checkpoint, stop-hook) from a 12-user-story PRD. Each feature plan is self-contained with user stories referencing specific design story numbers (e.g., stories 1-3, story 5), providing explicit design-to-plan traceability. The manifest records architectural decisions, feature slugs, plan file paths, and statuses. This was an infrastructure replacement epic where features touch overlapping modules -- the decomposition sliced by responsibility boundary rather than by module.
### Rationale
Fourth confirmation of the manifest-based decomposition approach. New variant: infrastructure replacement epics require slicing by responsibility boundary (not module boundary) to avoid features that conflict during implementation. Story-level traceability back to the design is a useful addition to the feature plan format.
### Source
.beastmode/artifacts/plan/2026-03-29-manifest-file-management.manifest.json
### Confidence
[HIGH] -- fourth observation, pattern confirmed across four epics
