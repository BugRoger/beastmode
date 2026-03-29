---
phase: plan
epic: readme-update
feature: roadmap-fix
---

# roadmap-fix

**Design:** `.beastmode/artifacts/design/2026-03-29-readme-update.md`

## User Stories

3. As a contributor reading the ROADMAP, I want shipped features in "Now" and only upcoming features in "Next", so that I understand the project's actual state.

## What to Build

Three changes to ROADMAP.md sections:

**"Now" section gains 6 entries.** Add: CLI orchestrator, cmux integration, GitHub state model, terminal phase states, pure manifest state machine, demo recording. These are all shipped as of v0.44.0.

**"Now" section loses 2 entries.** Remove: "Phase auto-chaining" (stale — the `transitions` config was removed in v0.22.0, auto-chaining now works via Skill tool calls without config) and "Visual language spec" (deleted in v0.14.36).

**"Next" section loses 1 entry.** Remove "Demo recording" — it shipped and moves to Now.

**"Later" section update.** Update "GitHub feature tracking" bullet to note that manifest-based GitHub mirroring is already shipped, so the remaining work is the kanban board UI and auto-sync polish.

## Acceptance Criteria

- [ ] ROADMAP "Now" includes CLI orchestrator, cmux integration, GitHub state model, terminal phase states, pure manifest state machine, demo recording
- [ ] ROADMAP "Now" does not include "Phase auto-chaining" or "Visual language spec"
- [ ] ROADMAP "Next" does not include "Demo recording"
- [ ] ROADMAP "Later" GitHub tracking entry notes partial shipping
