---
name: status
description: View session status — tracking, progress, milestones. Use when checking project state. Displays current session and phase progress.
---

# /status

View and manage session status files.

**Usage:**
- `/status` — Show current/most recent session
- `/status list` — List all session files
- `/status <feature>` — Show specific session

<HARD-GATE>
Read @_shared/task-runner.md. Parse and execute the phases below.
</HARD-GATE>

## Phases

1. [Display](phases/1-display.md) — Parse args and show status
