# Session Status Tracking

## Session Detection

Get the Claude session JSONL path for the current session:

```bash
get_session_path() {
  local FIRST_MSG="$1"  # Unique text from skill's initial arguments
  local PROJECT_PATH="$HOME/.claude/projects/$(pwd | sed 's|/|-|g; s|\.|-|g')"

  for f in "$PROJECT_PATH"/*.jsonl; do
    if grep "$FIRST_MSG" "$f" 2>/dev/null | jq -e 'select(.parentUuid == null)' >/dev/null 2>&1; then
      echo "$f"
      return
    fi
  done
}
```

## Status File Update

On phase completion, update `.agent/status/YYYY-MM-DD-<feature>.md`:

1. **Create file if not exists** with header:
   ```markdown
   # Session: <feature> — YYYY-MM-DD

   ## Context
   - **Feature**: <feature-name>
   - **Related artifacts**:
     - Design: .agent/design/YYYY-MM-DD-<feature>.md
     - Plan: .agent/plan/YYYY-MM-DD-<feature>.md

   ### Executed Phases

   ---

   ## Findings for Retro
   <!-- Accumulated across phases -->
   ```

2. **Add to Executed Phases list**:
   ```markdown
   - [<Phase> — HH:MM](#phase--hhmm) · `<session-path>`
   ```

3. **Append phase section** before "Findings for Retro":
   ```markdown
   ## <Phase> — HH:MM
   **Claude Session**: `<session-path>`
   **Summary:** <what was accomplished>
   **Decisions:** <key decisions made>
   **Issues:** <problems encountered or "None">
   ```

## Feature Name Inference

| Phase | Source |
|-------|--------|
| `/design` | From arguments or user-provided topic |
| `/plan` | From design doc filename |
| `/implement` | From plan doc filename |
| `/verify` | From recent status file or explicit |
| `/release` | From recent status file or explicit |
