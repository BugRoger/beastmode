# Context Bridge Implementation Plan

> **For Claude:** Use /implement to execute this plan task-by-task.

**Goal:** Give beastmode access to real context window data via a statusline-to-hook data bridge.

**Architecture:** Statusline script writes per-session context metrics to `/tmp/beastmode-{session_id}.json`. PostToolUse hook reads the file and injects raw numbers as `additionalContext`. Two bash scripts, no thresholds, pure data layer.

**Tech Stack:** Bash, jq

**Design Doc:** `.beastmode/state/design/2026-03-08-context-bridge.md`

---

### Task 0: Create the statusline script

**Wave:** 1
**Parallel-safe:** true
**Depends on:** `-`

**Files:**
- Create: `hooks/context-bridge-statusline.sh`

**Step 1: Write the statusline script**

```bash
#!/bin/bash
# Context Bridge — Statusline Script
# Persists context window data per session for the PostToolUse hook to read.
# Runs after each assistant message. Receives full JSON on stdin.

input=$(cat)

SESSION_ID=$(echo "$input" | jq -r '.session_id // empty')
USED_PCT=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
REMAINING_PCT=$(echo "$input" | jq -r '.context_window.remaining_percentage // empty')
WINDOW_SIZE=$(echo "$input" | jq -r '.context_window.context_window_size // empty')

# Persist metrics if we have a session ID and context data
if [ -n "$SESSION_ID" ] && [ -n "$USED_PCT" ]; then
  TIMESTAMP=$(date +%s)
  jq -n \
    --argjson used "$USED_PCT" \
    --argjson remaining "${REMAINING_PCT:-0}" \
    --argjson window "${WINDOW_SIZE:-200000}" \
    --argjson ts "$TIMESTAMP" \
    '{used_pct: $used, remaining_pct: $remaining, context_window_size: $window, timestamp: $ts}' \
    > "/tmp/beastmode-${SESSION_ID}.json"
fi

# Render statusline display
DISPLAY_PCT="${USED_PCT:-?}"
echo "beastmode | ctx: ${DISPLAY_PCT}%"
```

**Step 2: Make executable**

Run: `chmod +x hooks/context-bridge-statusline.sh`

**Step 3: Verify script handles missing data gracefully**

Run: `echo '{}' | bash hooks/context-bridge-statusline.sh`
Expected: Outputs `beastmode | ctx: ?%` and creates no tmp file.

Run: `echo '{"session_id":"test-123","context_window":{"used_percentage":42,"remaining_percentage":58,"context_window_size":200000}}' | bash hooks/context-bridge-statusline.sh && cat /tmp/beastmode-test-123.json`
Expected: Outputs `beastmode | ctx: 42%` and file contains valid JSON with `used_pct: 42`.

Run: `rm /tmp/beastmode-test-123.json`

---

### Task 1: Create the PostToolUse hook script

**Wave:** 1
**Depends on:** `-`

**Files:**
- Create: `hooks/context-bridge-hook.sh`

**Step 1: Write the hook script**

```bash
#!/bin/bash
# Context Bridge — PostToolUse Hook
# Reads persisted context metrics and injects them as additionalContext.
# Receives tool event JSON on stdin including session_id.

STALE_SECONDS=60

input=$(cat)

SESSION_ID=$(echo "$input" | jq -r '.session_id // empty')

if [ -z "$SESSION_ID" ]; then
  exit 0
fi

METRICS_FILE="/tmp/beastmode-${SESSION_ID}.json"

if [ ! -f "$METRICS_FILE" ]; then
  exit 0
fi

# Check staleness
TIMESTAMP=$(jq -r '.timestamp // 0' "$METRICS_FILE")
NOW=$(date +%s)
AGE=$(( NOW - TIMESTAMP ))

if [ "$AGE" -gt "$STALE_SECONDS" ]; then
  exit 0
fi

USED=$(jq -r '.used_pct' "$METRICS_FILE")
REMAINING=$(jq -r '.remaining_pct' "$METRICS_FILE")
WINDOW=$(jq -r '.context_window_size' "$METRICS_FILE")

jq -n \
  --arg msg "Context: ${USED}% used, ${REMAINING}% remaining (${WINDOW} window)" \
  '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $msg}}'
```

**Step 2: Make executable**

Run: `chmod +x hooks/context-bridge-hook.sh`

**Step 3: Verify hook with no metrics file**

Run: `echo '{"session_id":"nonexistent"}' | bash hooks/context-bridge-hook.sh`
Expected: No output, exit 0.

**Step 4: Verify hook with valid metrics**

Run: `echo '{"used_pct":42,"remaining_pct":58,"context_window_size":200000,"timestamp":'$(date +%s)'}' > /tmp/beastmode-hook-test.json && echo '{"session_id":"hook-test"}' | bash hooks/context-bridge-hook.sh`
Expected: JSON output with `additionalContext` containing "Context: 42% used, 58% remaining".

Run: `rm /tmp/beastmode-hook-test.json`

---

### Task 2: Create hooks.json declaration

**Wave:** 1
**Depends on:** `-`

**Files:**
- Create: `hooks/hooks.json`

**Step 1: Write hooks.json**

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/session-start.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/context-bridge-hook.sh"
          }
        ]
      }
    ]
  }
}
```

**Step 2: Verify valid JSON**

Run: `jq . hooks/hooks.json`
Expected: Pretty-printed JSON, no errors.

---

### Task 3: Wire hooks into plugin manifest

**Wave:** 2
**Parallel-safe:** true
**Depends on:** Task 2

**Files:**
- Modify: `.claude-plugin/plugin.json`

**Step 1: Add hooks field to plugin.json**

Add `"hooks": "./hooks/hooks.json"` to the existing plugin.json:

```json
{
  "name": "beastmode",
  "description": "Agentic workflow skills for Claude Code. Activate beastmode.",
  "version": "0.14.34",
  "author": {
    "name": "bugroger"
  },
  "repository": "https://github.com/BugRoger/beastmode",
  "hooks": "./hooks/hooks.json"
}
```

**Step 2: Verify valid JSON**

Run: `jq . .claude-plugin/plugin.json`
Expected: Pretty-printed JSON with hooks field.

---

### Task 4: Clean up settings.local.json

**Wave:** 2
**Depends on:** Task 2

**Files:**
- Modify: `.claude/settings.local.json`

**Step 1: Remove hooks block, keep enabledPlugins**

Replace entire file with:

```json
{
  "enabledPlugins": {
    "commons@overrides": true,
    "beastmode@beastmode-marketplace": true
  }
}
```

**Step 2: Verify valid JSON**

Run: `jq . .claude/settings.local.json`
Expected: Pretty-printed JSON with only enabledPlugins.

---

### Task 5: Integration test

**Wave:** 3
**Depends on:** Task 0, Task 1, Task 2, Task 3, Task 4

**Files:**
- Test: `hooks/context-bridge-statusline.sh`
- Test: `hooks/context-bridge-hook.sh`

**Step 1: End-to-end test — statusline writes, hook reads**

Run:
```bash
# Simulate statusline writing
echo '{"session_id":"e2e-test","context_window":{"used_percentage":55,"remaining_percentage":45,"context_window_size":200000}}' | bash hooks/context-bridge-statusline.sh

# Simulate hook reading
echo '{"session_id":"e2e-test"}' | bash hooks/context-bridge-hook.sh
```

Expected statusline output: `beastmode | ctx: 55%`
Expected hook output: JSON with `"additionalContext": "Context: 55% used, 45% remaining (200000 window)"`

**Step 2: Verify stale file handling**

Run:
```bash
# Write a metrics file with old timestamp
echo '{"used_pct":55,"remaining_pct":45,"context_window_size":200000,"timestamp":1000000000}' > /tmp/beastmode-stale-test.json
echo '{"session_id":"stale-test"}' | bash hooks/context-bridge-hook.sh
```

Expected: No output (file is stale).

**Step 3: Verify concurrent sessions**

Run:
```bash
echo '{"session_id":"session-a","context_window":{"used_percentage":30,"remaining_percentage":70,"context_window_size":200000}}' | bash hooks/context-bridge-statusline.sh
echo '{"session_id":"session-b","context_window":{"used_percentage":75,"remaining_percentage":25,"context_window_size":200000}}' | bash hooks/context-bridge-statusline.sh

cat /tmp/beastmode-session-a.json | jq .used_pct
cat /tmp/beastmode-session-b.json | jq .used_pct
```

Expected: `30` and `75` respectively.

**Step 4: Cleanup**

Run: `rm -f /tmp/beastmode-e2e-test.json /tmp/beastmode-stale-test.json /tmp/beastmode-session-a.json /tmp/beastmode-session-b.json`
