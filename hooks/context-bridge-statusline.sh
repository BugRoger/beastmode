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
