# Release 0.1.12

**Date:** 2026-03-02

## Highlights

Added SessionStart hook that displays a beastmode activation banner with hardcoded version and random self-deprecating quote on every session start.

## Features

- **Session banner hook**: New `hooks/session-start.sh` prints activation banner with version `v0.1.12` and randomly selected quote from a pool of 15 self-deprecating messages
- **Plugin hooks configuration**: Added `hooks` field to `plugin.json` with `${CLAUDE_PLUGIN_ROOT}` path variable

## Documentation

- Updated STRUCTURE.md with new `hooks/` directory
- Updated STACK.md version to 0.1.12

## Full Changelog

New files:
- `hooks/session-start.sh` — Beastmode activation banner

Modified files:
- `.claude-plugin/plugin.json` — Added hooks configuration
- `.agents/prime/STRUCTURE.md` — Added hooks directory
- `.agents/prime/STACK.md` — Version bump
