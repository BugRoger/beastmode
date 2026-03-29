# Design: Remove .agents/ References from Beastmode

## Goal

Eliminate all references to `.agents/` in the codebase. Consolidate everything under `.beastmode/`. Delete `.agents/` entirely — no legacy, no transitional state.

## Approach

The `.agents/` directory holds two kinds of data:
1. **Tracked artifacts** (design specs, plans, research) — 7 files tracked by git
2. **Session-only state** (status files, task JSONs, worktrees) — gitignored

Both move into `.beastmode/` with clear separation:

```
.beastmode/
├── state/
│   ├── design/          # tracked: design specs
│   ├── plan/            # tracked: plan docs
│   ├── research/        # tracked: research findings
│   └── ...
├── sessions/            # NEW — gitignored session state
│   ├── status/          # feature status files
│   └── tasks/           # .tasks.json files
├── worktrees/           # already here, no change
└── ...existing structure
```

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Move tracked artifacts to `.beastmode/state/{phase}/` | State directory already exists and is designed for this |
| Create `.beastmode/sessions/` for gitignored data | Clean separation of tracked vs ephemeral; "sessions" communicates lifecycle |
| Research files to `.beastmode/state/research/` | Research is a tracked artifact, not session state |
| Delete `.agents/` entirely | No transitional state — clean break |
| Update `.beastmode/.gitignore` | Add `sessions/` to existing gitignore |

## Files Affected

### Skills (path references in phase files)
- `skills/design/phases/0-prime.md` — research output path
- `skills/design/phases/3-checkpoint.md` — status file path
- `skills/plan/phases/0-prime.md` — status file read
- `skills/implement/phases/0-prime.md` — plan load, status file, tasks.json
- `skills/implement/phases/3-checkpoint.md` — status file path
- `skills/validate/phases/0-prime.md` — status file read
- `skills/release/phases/0-prime.md` — status file discovery
- `skills/status/phases/1-display.md` — status file listing
- `skills/_shared/worktree-manager.md` — status file path
- `skills/_shared/session-tracking.md` — status file + artifact paths
- `skills/_shared/retro.md` — status file read
- `skills/_shared/0-prime-template.md` — status file path

### Context docs (.beastmode/context/)
- `plan/structure.md` — directory layout, key directories, "where to add new code"
- `plan/conventions.md` — import examples, documentation assembly pattern
- `implement/agents.md` — status file coordination, plan references
- `implement/testing.md` — prime file references (stale since prime/ already migrated)

### Agent docs
- `agents/researcher.md` — output path, prime file references
- `agents/discovery.md` — prime file references

### Top-level
- `README.md` — `.agents/` folder section
- `.beastmode/META.md` — directory layout reference

### Data migration
- `git mv` 7 tracked files from `.agents/` to `.beastmode/state/`
- Update `.beastmode/.gitignore` with `sessions/` entry
- `rm -rf .agents/`

## Path Mapping

| Old Path | New Path |
|----------|----------|
| `.agents/design/*.md` | `.beastmode/state/design/*.md` |
| `.agents/plan/*.md` | `.beastmode/state/plan/*.md` |
| `.agents/plan/*.tasks.json` | `.beastmode/sessions/tasks/*.tasks.json` |
| `.agents/research/*.md` | `.beastmode/state/research/*.md` |
| `.agents/status/*.md` | `.beastmode/sessions/status/*.md` |
| `.agents/worktrees/` | (already at `.beastmode/worktrees/`) |
| `.agents/.gitignore` | merged into `.beastmode/.gitignore` |

## Testing

- Verify no remaining `.agents` references in tracked files (excluding CHANGELOG)
- Verify `.beastmode/sessions/` is gitignored
- Verify all skill paths resolve to new locations
