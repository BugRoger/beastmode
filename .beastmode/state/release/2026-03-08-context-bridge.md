# Release: context-bridge

**Version:** v0.14.35
**Date:** 2026-03-08

## Highlights

Adds a statusline-to-hook data bridge that gives beastmode access to real context window metrics instead of estimating. Two bash scripts persist per-session context data to `/tmp/beastmode-{session_id}.json` and inject it as `additionalContext` via a PostToolUse hook.

## Features

- Statusline script that persists context window metrics (used%, remaining%, window size) per session
- PostToolUse hook that reads persisted metrics and injects raw context data into the conversation
- Plugin hook declarations via `hooks/hooks.json` with `${CLAUDE_PLUGIN_ROOT}` portable paths
- Migrated SessionStart hook from project settings to plugin-managed hooks

## Chores

- Cleaned up `.claude/settings.local.json` — removed hook declarations (now plugin-managed)
- Added `hooks` field to `.claude-plugin/plugin.json` for proper plugin hook wiring

## Full Changelog

- feat: add context-bridge-statusline.sh for persisting context metrics
- feat: add context-bridge-hook.sh for injecting context data via PostToolUse
- feat: add hooks/hooks.json with SessionStart and PostToolUse declarations
- chore: wire hooks into plugin.json via hooks field
- chore: remove hooks block from settings.local.json
