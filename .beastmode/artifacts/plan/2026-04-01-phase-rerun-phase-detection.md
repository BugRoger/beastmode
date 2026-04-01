---
phase: plan
slug: phase-rerun
epic: phase-rerun
feature: phase-detection
wave: 2
---

# Phase Detection

**Design:** .beastmode/artifacts/design/2026-04-01-phase-rerun.md

## User Stories

1. As a user, I want to run `beastmode plan <slug>` on an epic that's past plan, so that I can redo the plan without starting a new epic.
2. As a user, I want to rerun the current phase (e.g., `beastmode validate <slug>` when already at validate), so that I can retry a phase that produced bad output.
3. As a user, I want a confirmation prompt before regression, so that I don't accidentally destroy phase commits.
4. As a user, I want forward phase jumps to be blocked, so that I can't accidentally skip phases and produce incomplete epics.

## What to Build

Phase detection logic in the CLI phase command that compares the requested phase against the manifest's current phase before dispatch.

**Detection matrix:** Using a phase ordering index, classify the request:
- requested < current → regression (rerun an earlier phase)
- requested == current → same-phase rerun (retry current phase)
- requested == current with no prior tag → normal forward (first run of this phase)
- requested > current → forward jump → blocked with error

**Regression flow:** On regression or same-phase rerun:
1. Look up the predecessor phase's tag (`beastmode/<slug>/<predecessor-phase>`). For same-phase rerun, predecessor is the phase before the current one.
2. If tag missing → error with clear message suggesting manual reset for old epics
3. Show confirmation prompt with destructive warning (which commits will be lost)
4. On confirm: delete downstream tags → hard git reset to predecessor tag → send REGRESS to machine → persist manifest → redispatch the phase
5. `--yes` flag or watch-loop context skips the confirmation prompt

**Forward jump blocking:** If requested phase > manifest phase, print error explaining the current phase and exit without dispatch.

**Integration point:** This logic runs early in the phase command, after manifest load but before worktree creation and session dispatch. It gates entry to the normal dispatch path.

## Acceptance Criteria

- [ ] Regression detected when requested phase < manifest phase
- [ ] Same-phase rerun detected when requested phase == manifest phase
- [ ] Normal forward detected when requested phase == manifest phase with no prior tag
- [ ] Forward jump blocked with error message
- [ ] Confirmation prompt shown before destructive reset
- [ ] Prompt shows which commits/work will be lost
- [ ] `--yes` flag skips confirmation
- [ ] Watch-loop context skips confirmation
- [ ] Tagless epics fail with clear error and manual reset suggestion
- [ ] Git branch reset to predecessor phase tag on confirmation
- [ ] REGRESS event sent to machine after reset
- [ ] Manifest persisted after regression
