# state-scanner

**Design:** .beastmode/state/design/2026-03-28-typescript-pipeline-orchestrator.md
**Architectural Decisions:** see manifest

## User Stories

2. As a developer, I want to run `beastmode watch` so that all epics with completed designs are automatically driven through plan -> release without manual phase invocations.
8. As a developer, I want `beastmode status` to show epic state and cost-to-date so that I understand pipeline progress and spend without running Claude.

## What to Build

A state scanning module that reads all manifest files and state artifacts from `.beastmode/state/` to determine the current phase and next action for each epic. The scanner is a pure function: given a filesystem snapshot, it produces structured state objects.

For each discovered epic (design artifact with a manifest), the scanner determines:

- **Current phase:** derived from which state artifacts exist (design only → needs plan, plan with features → needs implement, all features completed → needs validate, etc.)
- **Next action:** the specific command to dispatch (e.g., `plan <slug>`, `implement <design> <feature>`, `validate <slug>`)
- **Feature progress:** for epics in implement phase, how many features are completed vs pending
- **Gate status:** whether the epic is blocked on a human gate (detected from manifest status or config)
- **Cost-to-date:** aggregated from `.beastmode-runs.json` entries matching the epic

The scanner reads manifests (`.manifest.json`), design docs, plan docs, and run logs. It does not write any state or spawn any processes.

## Acceptance Criteria

- [ ] Given a design with no plan manifest features, returns `next-action: plan`
- [ ] Given all features `completed` in manifest, returns `next-action: validate`
- [ ] Given a manifest with `pending` features after plan, returns `next-action: implement` with feature list
- [ ] Correctly identifies epics blocked on human gates
- [ ] Returns structured state objects with epic name, current phase, features, status, and cost
- [ ] Pure read-only operation — no filesystem writes or process spawns
- [ ] Handles edge cases: missing manifests, partially written state, empty features array
