# Design: Retro Session Paths

**Date:** 2026-03-01
**Feature:** Pass absolute session file paths to retro agents

## Problem

Retro agents review prime files but lack access to the actual conversation history from the development cycle. Session files are tracked in status markdown but only as UUIDs, making them hard to locate and inspect.

## Solution

1. Store absolute paths to session JSONL files in status markdown
2. Pass these paths to retro agents so they can read and analyze the conversation history

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Path format | Full absolute path | No parsing/resolution needed |
| Session scope | All sessions from status file | Full cycle context for retro |
| JSONL processing | Raw, agents read themselves | Simple, no preprocessing |
| Size safeguards | None | Trust agents to handle |
| Storage format | Dedicated "Session Files" section | Machine-readable, no regex parsing |

## Changes

### 1. SESSION-TRACKING.md

**Add to header template** (after "Executed Phases"):

```markdown
### Session Files
<!-- Absolute paths for retro inspection -->
```

**Add phase completion step:**

```markdown
3. **Add to Session Files list**:
   - <full-session-path>
```

**Update "Executed Phases" format:**

```markdown
- [<Phase> — HH:MM](#phase--hhmm) · `<full-session-path>`
```

**Update phase section format:**

```markdown
**Claude Session**: `<full-session-path>`
```

### 2. skills/retro/phases/1-gather.md

**Step 1 changes:**
- Read "Session Files" section from status markdown
- Collect all paths as a list

**Step 2 changes:**
- Add session paths to agent prompts:

```yaml
Agent:
  prompt: |
    [existing prompt content]

    ## Session Files
    Read and analyze these session JSONL files for context:
    - /path/to/session1.jsonl
    - /path/to/session2.jsonl
```

## Files Modified

| File | Change |
|------|--------|
| `skills/_shared/SESSION-TRACKING.md` | Add Session Files section, update templates |
| `skills/retro/phases/1-gather.md` | Read session paths, pass to agents |

## Not Changed

- `get_session_path()` function — already returns full path
- Individual phase skills — already use `get_session_path()`
- Agent prompts in `skills/retro/agents/*.md` — no changes needed
