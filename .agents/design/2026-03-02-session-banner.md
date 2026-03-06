# Design: Session Banner Hook

**Date:** 2026-03-02
**Status:** Approved

## Goal

Add a hook that prints a beastmode activation banner with hardcoded version on every session start. The banner includes a randomly selected self-deprecating quote that rotates each release.

## Approach

**Plugin-Distributed Hook** — Ship `hooks/session-start.sh` inside the plugin. Hook fires on all `SessionStart` events (startup, resume, clear, compact). Version and quotes are hardcoded in the script, updated each release.

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hook location | `hooks/session-start.sh` in plugin | Version-controlled, updates with plugin |
| Trigger | All SessionStart events | User wants maximum visibility |
| Version | Hardcoded `v0.1.12` | Absolute certainty of active version |
| Quote selection | `$RANDOM` from array | Simple, no dependencies |
| Quote refresh | Manual each release | Part of release checklist |

## Components

### New Files

| File | Purpose |
|------|---------|
| `hooks/session-start.sh` | Banner script with version + quotes |

### Hook Script

```bash
#!/bin/bash

quotes=(
  "time to mass hallucinate some code"
  "i remembered nothing. let's go."
  "vibes only, no thoughts"
  "statistically this ends in flames"
  "let's fuck around and find out"
  "i forgor but we're doing this anyway"
  "oh great, another mass hallucination begins"
  "i'm not a real beast, i just mass hallucinate on tv"
  "let's see how creatively i can fail today"
  "no memory, only hubris"
  "confidence of a model, competence of a prompt"
  "hallucinating responsibly since 2024"
  "my context window is bigger than my attention span"
  "technically correct is the best kind of correct"
  "i've made a huge mass hallucination"
)

quote=${quotes[$RANDOM % ${#quotes[@]}]}

cat << EOF
 _______________________________________________
/                                               \\
| BEASTMODE v0.1.12                             |
| "$quote"
\\_______________________________________________ /

EOF
```

### Configuration

Plugin needs hook configuration. Research during /plan to determine:
- Whether Claude Code auto-discovers `hooks/` directory
- Or if `.claude/settings.json` in plugin needs explicit hook config

## Testing Strategy

- Run hook script manually: `bash hooks/session-start.sh`
- Verify random quote selection across multiple runs
- Test in actual Claude Code session to confirm banner appears
- Verify banner shows on all SessionStart events (startup, resume, clear, compact)
