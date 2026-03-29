# Session Status Tracking

**Goal:** Track session status across all workflow phases with Claude session linkage

**Architecture:** Each phase skill appends to a single status file per feature, recording the Claude session JSONL path for traceability

**Tech Stack:** Markdown status files, bash for session detection, JSONL parsing with jq

---

## 1. Session ID Detection

Each phase skill finds its Claude session by searching for its initial message:

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

**How it works:**
- Searches JSONL files in the project's Claude folder
- Matches the skill's initial arguments
- Confirms it's the session start via `parentUuid == null`
- Returns the full absolute path to the JSONL file

---

## 2. Status File Structure

**Location:** `.agents/status/YYYY-MM-DD-<feature>.md`

**Format:**

```markdown
# Session: <feature> — YYYY-MM-DD

## Context
- **Feature**: <feature-name>
- **Related artifacts**:
  - Design: .agents/design/YYYY-MM-DD-<feature>.md
  - Plan: .agents/plan/YYYY-MM-DD-<feature>.md

### Executed Phases
- [Design — HH:MM](#design--hhmm) · `<absolute-path-to-session.jsonl>`
- [Plan — HH:MM](#plan--hhmm) · `<absolute-path-to-session.jsonl>`
- [Implement — HH:MM](#implement--hhmm) · `<absolute-path-to-session.jsonl>`

---

## Design — HH:MM
**Claude Session**: `<absolute-path-to-session.jsonl>`
**Summary:** <what was accomplished>
**Decisions:** <key decisions made>
**Issues:** <problems encountered or "None">

## Plan — HH:MM
**Claude Session**: `<absolute-path-to-session.jsonl>`
**Summary:** <what was accomplished>
**Decisions:** <key decisions made>
**Issues:** <problems encountered or "None">

...

---

## Findings for Retro
<!-- Accumulated across phases, reviewed by /retro -->
```

---

## 3. Phase Behavior

Each phase skill (design, plan, implement, verify, release):

**On start:**
1. Infer feature name from input artifact or arguments
2. Infer date from artifact filename or today's date

**On completion:**
1. Get Claude session path using `get_session_path()`
2. Create or update `.agents/status/YYYY-MM-DD-<feature>.md`
3. Add entry to "Executed Phases" list in Context section
4. Append phase section with Summary/Decisions/Issues

---

## 4. Feature Name Inference

| Phase | Source |
|-------|--------|
| `/design` | User provides topic, or extracted from arguments |
| `/plan` | From design doc path: `.agents/design/2026-03-01-<feature>.md` → `<feature>` |
| `/implement` | From plan doc path: `.agents/plan/2026-03-01-<feature>.md` → `<feature>` |
| `/verify` | From most recent status file, or passed explicitly |
| `/release` | From most recent status file, or passed explicitly |
| `/retro` | Scans all status files in `.agents/status/` |

---

## 5. Skills to Update

| Skill | Changes |
|-------|---------|
| `/design` | Add status file creation on completion |
| `/plan` | Add status file update on completion |
| `/implement` | Add status file update on completion |
| `/verify` | Add status file update on completion |
| `/release` | Add status file update on completion |
| `/retro` | Remove template, read from `.agents/status/` |
| `/status` | Implement as reader/viewer of status files |

---

## 6. File Changes

**Delete:**
- `skills/retro/templates/session-record.md`

**Modify:**
- `skills/design/SKILL.md` — Add status tracking on completion
- `skills/plan/SKILL.md` — Add status tracking on completion
- `skills/implement/SKILL.md` — Add status tracking on completion
- `skills/verify/SKILL.md` — Add status tracking on completion
- `skills/release/SKILL.md` — Add status tracking on completion
- `skills/retro/SKILL.md` — Update to read from `.agents/status/`
- `skills/status/SKILL.md` — Implement as status file viewer
