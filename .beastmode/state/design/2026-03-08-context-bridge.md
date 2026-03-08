# Design: Context Bridge

## Goal

Give beastmode access to real context window data instead of estimating, using Claude Code's statusline and hook system as a data bridge.

## Approach

Two bash scripts in the beastmode plugin — a statusline script writes per-session context data to `/tmp/beastmode-{session_id}.json`, a PostToolUse hook reads it and injects raw numbers as `additionalContext`. Pure data layer, no thresholds or opinions.

### Data Flow

```
Assistant message completes
  → Statusline fires
    → Writes /tmp/beastmode-{session_id}.json

Claude calls a tool
  → Tool executes
    → PostToolUse fires
      → Reads /tmp/beastmode-{session_id}.json
      → Injects: "Context: 42% used, 58% remaining (200000 window)"

Beastmode checkpoint
  → context-report.md reads injected value
  → Renders real percentage instead of estimate
```

### Architecture

```
┌─────────────────────┐       ┌──────────────────────────────┐
│   Statusline Script  │       │     PostToolUse Hook          │
│   (bash + jq)        │       │     (bash + jq)               │
│                      │       │                               │
│ stdin: full JSON     │       │ stdin: {session_id, ...}      │
│   - context_window   │       │                               │
│   - session_id       │  ───► │ reads: /tmp/beastmode-{sid}   │
│                      │       │                               │
│ writes:              │       │ stdout: {additionalContext}    │
│   /tmp/beastmode-    │       │   raw context numbers         │
│   {session_id}.json  │       │                               │
└─────────────────────┘       └──────────────────────────────┘
```

## Key Decisions

### Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Session keying | By session_id | Supports phase restarts across sessions for the same feature |
| Beastmode integration | Data layer only | Clean separation — hook persists, beastmode consumes |
| Thresholds | None in hook | Beastmode owns interpretation via config.yaml |
| Language | Bash + jq | Simple, no dependencies beyond jq |
| File placement | Beastmode plugin `hooks/` | Ships with the plugin, managed by marketplace |
| Approach | Statusline writes, PostToolUse injects | Two-script bridge — statusline has context data, hook has conversation access |
| Persisted file path | `/tmp/beastmode-{session_id}.json` | Per-session isolation, auto-cleaned on reboot |
| Plugin wiring | `hooks/hooks.json` via plugin.json | Uses `${CLAUDE_PLUGIN_ROOT}` for portable paths |
| Staleness threshold | 60 seconds | Hook ignores metrics older than 60s |

### Claude's Discretion

None — all decisions were explicitly discussed.

## Components

### 1. `hooks/context-bridge-statusline.sh`

Statusline script (bash + jq):
- Reads full JSON from stdin
- Extracts `session_id`, `context_window.used_percentage`, `context_window.remaining_percentage`, `context_window.context_window_size`
- Writes to `/tmp/beastmode-{session_id}.json` with timestamp
- Renders one-line status display to stdout

Persisted file format:
```json
{
  "used_pct": 42,
  "remaining_pct": 58,
  "context_window_size": 200000,
  "timestamp": 1741456800
}
```

### 2. `hooks/context-bridge-hook.sh`

PostToolUse hook (bash + jq):
- Reads `session_id` from stdin via jq
- Reads `/tmp/beastmode-{session_id}.json`
- If file missing or stale (>60s) — exits silently
- Outputs `additionalContext` with raw numbers
- No thresholds, no warnings, no opinions

### 3. `hooks/hooks.json`

Hook declarations:
- SessionStart: existing `session-start.sh` (moved from settings.local.json)
- PostToolUse: new `context-bridge-hook.sh`
- All paths use `${CLAUDE_PLUGIN_ROOT}`

### 4. Plugin wiring changes

- `.claude-plugin/plugin.json` — add `"hooks": "./hooks/hooks.json"`
- `.claude/settings.local.json` — remove hooks block, keep enabledPlugins only

## Files Affected

| File | Action |
|------|--------|
| `hooks/context-bridge-statusline.sh` | New |
| `hooks/context-bridge-hook.sh` | New |
| `hooks/hooks.json` | New |
| `.claude-plugin/plugin.json` | Modified — add hooks field |
| `.claude/settings.local.json` | Modified — remove hooks block |

## Acceptance Criteria

- [ ] Statusline script writes valid JSON to `/tmp/beastmode-{session_id}.json` after each assistant message
- [ ] PostToolUse hook injects `additionalContext` with used_pct and remaining_pct
- [ ] Hook exits silently when no metrics file exists
- [ ] Hook exits silently when metrics file is stale (>60s)
- [ ] Multiple concurrent sessions produce separate files
- [ ] Plugin hooks.json correctly wires both SessionStart and PostToolUse
- [ ] `.claude/settings.local.json` hooks block removed (plugin owns hooks)
- [ ] Statusline requires only manual user config (documented)

## Testing Strategy

- Verify statusline script writes valid JSON to `/tmp/beastmode-{session_id}.json`
- Verify hook reads the file and outputs valid `additionalContext` JSON
- Verify hook exits silently when file is missing
- Verify hook exits silently when file is stale (>60s)
- Verify multiple concurrent sessions write separate files
- Verify plugin hooks.json correctly wires both SessionStart and PostToolUse

## Deferred Ideas

- Beastmode `context-report.md` integration (read injected value instead of estimating)
- Threshold-based warnings (beastmode could add warning/critical thresholds in config.yaml)
- Context-aware auto-transition decisions (use real remaining % for chaining)
