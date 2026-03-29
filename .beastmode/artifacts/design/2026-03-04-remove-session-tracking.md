# Design: Remove Session ID Storage

## Goal

Remove the session JSONL tracking mechanism from beastmode. Cross-session retros are no longer needed, making session ID storage dead weight.

## Approach

Single clean sweep — delete the session-tracking utility, remove all imports, and clean up references in retro agents and context docs. Retro itself stays functional (it works from phase artifacts and git diffs; session JSONL was optional enrichment).

## Key Decisions

- **Delete `session-tracking.md` entirely** — no partial keep, the whole utility goes
- **Keep retro module** — retro agents still review artifacts and git diffs without session JSONL
- **Delete `.beastmode/sessions/` directory** — no longer needed
- **Remove "Session JSONL Access" key decision from architecture doc** — no longer a system capability

## Files Affected

### Delete
- `skills/_shared/session-tracking.md` — entire file
- `.beastmode/sessions/` — entire directory

### Edit (remove `@session-tracking.md` import)
- `skills/_shared/3-checkpoint-template.md`
- `skills/design/phases/3-checkpoint.md`
- `skills/plan/phases/3-checkpoint.md`
- `skills/implement/phases/3-checkpoint.md`
- `skills/validate/phases/3-checkpoint.md`
- `skills/release/phases/3-checkpoint.md`

### Edit (remove session JSONL references)
- `skills/_shared/retro.md` — remove session JSONL from gather step and agent prompt
- `skills/_shared/retro/context-agent.md` — remove "Session JSONL" from artifact sources
- `skills/_shared/retro/meta-agent.md` — remove "Session JSONL" from artifact sources

### Edit (update context docs)
- `.beastmode/context/design/architecture.md` — remove "Session JSONL Access" key decision, remove sessions/ from data flow
- `.beastmode/context/plan/structure.md` — remove `sessions/` from directory layout
- `.beastmode/context/implement/agents.md` — remove status file coordination reference

## Testing Strategy

N/A — pure deletion task. Verify no dangling `@session-tracking` imports remain after removal.
