# Session Banner Implementation Plan

**Goal:** Add a SessionStart hook that prints a beastmode activation banner with hardcoded version and random self-deprecating quote.

**Architecture:** Create `hooks/session-start.sh` script, configure hook in `plugin.json` using `${CLAUDE_PLUGIN_ROOT}` path variable. Hook fires on all SessionStart events.

**Tech Stack:** Bash, Claude Code plugin hooks system

**Design Doc:** [.agents/design/2026-03-02-session-banner.md](../design/2026-03-02-session-banner.md)

---

### Task 0: Create hooks directory and session-start script

**Files:**
- Create: `hooks/session-start.sh`

**Step 1: Create hooks directory**

```bash
mkdir -p hooks
```

**Step 2: Create the session-start script**

Create `hooks/session-start.sh`:

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

**Step 3: Make script executable**

```bash
chmod +x hooks/session-start.sh
```

**Step 4: Test script manually**

Run: `bash hooks/session-start.sh`
Expected: Banner with version and random quote (run multiple times to verify randomness)

---

### Task 1: Configure hook in plugin.json

**Files:**
- Modify: `.claude-plugin/plugin.json`

**Step 1: Add hooks configuration to plugin.json**

Update `.claude-plugin/plugin.json` to include the hooks field:

```json
{
  "name": "beastmode",
  "description": "Agentic workflow skills for Claude Code. Activate beastmode.",
  "version": "0.1.12",
  "author": {
    "name": "bugroger"
  },
  "repository": "https://github.com/BugRoger/beastmode",
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/hooks/session-start.sh"
          }
        ]
      }
    ]
  }
}
```

**Step 2: Verify JSON is valid**

Run: `cat .claude-plugin/plugin.json | jq .`
Expected: Valid JSON output with hooks configuration

---

### Task 2: Update plugin version

**Files:**
- Modify: `.claude-plugin/plugin.json`
- Modify: `.agents/prime/STACK.md`

**Step 1: Bump version in plugin.json**

Change version from `0.1.11` to `0.1.12` (already done in Task 1).

**Step 2: Update version reference in STACK.md**

Find and update the version line in `.agents/prime/STACK.md`:

```markdown
- **Version:** 0.1.12 (from plugin.json)
```

---

### Task 3: Update STRUCTURE.md

**Files:**
- Modify: `.agents/prime/STRUCTURE.md`

**Step 1: Add hooks directory to structure**

Add `hooks/` to the directory layout in STRUCTURE.md:

```markdown
beastmode/
├── .agents/                 # Project context & agent artifacts
│   ...
├── hooks/                   # Plugin lifecycle hooks
│   └── session-start.sh    # Beastmode activation banner
├── skills/                  # Agent skills (executable workflows)
```

---

### Task 4: End-to-end verification

**Step 1: Reinstall plugin locally**

After merging to main, update the local plugin:

```bash
claude plugin update beastmode@beastmode-marketplace --scope project
```

**Step 2: Start new Claude Code session**

Start a fresh session and verify banner appears with version and quote.

**Step 3: Test all SessionStart triggers**

- `/clear` — verify banner appears
- Compact (send many messages) — verify banner appears after compaction
- Resume session — verify banner appears

Expected: Banner with `BEASTMODE v0.1.12` appears on all session start events.
