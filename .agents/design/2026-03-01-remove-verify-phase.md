# Design: Remove Verify Phase & Simplify Workflow

**Date:** 2026-03-01
**Status:** Approved

## Summary

Remove the `/verify` phase entirely and simplify the beastmode workflow from a cluttered 9-phase chain to a clean 6-phase core workflow with standalone utility commands.

## Motivation

1. **Simplify workflow** — Too many phases creates cognitive overhead
2. **Never used** — `.agents/verify/` folder is empty; the skill has never been invoked
3. **DRY violation** — Workflow strings copy-pasted across every skill file

## Design

### New 6-Phase Workflow

```
prime → design → plan → implement → release → retro
```

### Standalone Utility Commands

| Command | Purpose |
|---------|---------|
| `/bootstrap` | Initialize project (run once) |
| `/research` | Conduct domain discovery when needed |
| `/status` | Track project state and milestones |

### Changes

#### Delete
- `skills/verify/` folder

#### Update Files

| File | Changes |
|------|---------|
| `README.md` | Update to 6-phase workflow, reorganize skill table into "Workflow" vs "Utilities" |
| `.agents/CLAUDE.md` | "Six-phase workflow (prime → design → plan → implement → release → retro)" |
| `.agents/prime/ARCHITECTURE.md` | Remove Verify Skill component, update all workflow references |
| `.agents/prime/STRUCTURE.md` | Remove `verify/` from folder structures, update skill count |
| `.agents/prime/STACK.md` | Remove `/verify` from command lists |
| `.agents/prime/META.md` | Remove `verify/` from folder structure |
| `skills/bootstrap/SKILL.md` | Remove `verify/` from folder structure, remove `## Workflow` section |
| `skills/bootstrap/templates/META.md` | Remove `verify/` from folder structure |
| `skills/implement/phases/complete.md` | Remove "Handoff to /verify", replace with "Consider `/release`" suggestion |
| `skills/_shared/SESSION-TRACKING.md` | Remove `/verify` row from table |
| `skills/design/SKILL.md` | Remove `## Workflow` section |
| `skills/plan/SKILL.md` | Remove `## Workflow` section |
| `skills/implement/SKILL.md` | Remove `## Workflow` section, remove `/verify` references |
| `skills/status/SKILL.md` | Remove `## Workflow` section |
| `skills/release/SKILL.md` | Remove `## Workflow` section |
| `skills/retro/SKILL.md` | Remove `## Workflow` section |
| `skills/research/SKILL.md` | Remove `## Workflow` section |

#### Behavior Change
- `/implement` completion now suggests `/release` instead of auto-triggering `/verify`

### Historical Docs

Files in `.agents/design/` and `.agents/plan/` that reference verify are historical records — leave unchanged to preserve history.

## Decisions

1. **Clean removal over deprecation** — No backwards compatibility needed; skill was never used
2. **Remove workflow strings from skills** — DRY fix; workflow documented in README.md and ARCHITECTURE.md only
3. **Standalone utilities** — `/bootstrap`, `/research`, `/status` are not part of linear workflow
4. **Suggest /release after implement** — Natural next step without forced handoff

## Next Steps

Run `/plan` to create implementation tasks.
