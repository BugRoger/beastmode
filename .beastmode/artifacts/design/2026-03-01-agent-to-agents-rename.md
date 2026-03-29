# Design: Rename .agents to .agentss

**Date:** 2026-03-01
**Status:** Approved

## Overview

Rename the `.agents` directory to `.agentss` across the entire beastmode codebase, including all references in documentation and configuration files.

## Motivation

Consistency and clarity — `.agentss` better reflects that the folder contains artifacts and configuration for multiple agents.

## Approach

**Big Bang (Option A):** Atomic rename with single commit.

## Implementation

### Step 1: Directory Rename

```bash
mv .agents .agentss
```

Includes all subdirectories:
- `.agentss/prime/` (META, STACK, STRUCTURE, CONVENTIONS, ARCHITECTURE, TESTING, AGENTS)
- `.agentss/design/`, `.agentss/plan/`, `.agentss/release/`, `.agentss/research/`, `.agentss/status/`, `.agentss/verify/`
- `.agentss/worktrees/`
- `.agentss/CLAUDE.md`, `.agentss/.gitignore`

### Step 2: File Content Updates

Global find-replace `.agents` → `.agentss` in 36 files (213 occurrences):

| Category | Files |
|----------|-------|
| Root | `CLAUDE.md`, `README.md`, `.gitignore` |
| Skills | 14 SKILL.md files across all skills |
| Templates | `skills/bootstrap/templates/*.md` |
| Prime docs | `.agentss/prime/*.md` |
| Existing artifacts | `.agentss/design/*.md`, `.agentss/plan/*.md` |
| Implement phases | `skills/implement/phases/*.md` |
| Agent definitions | `agents/discovery.md` |

### Step 3: Verification

1. `grep -r "\.agents[^s]" .` — must return zero matches
2. `grep -r "\.agents$" .` — must return zero matches
3. Confirm `.agents/` directory no longer exists
4. Confirm `.agentss/` directory exists with all subdirectories

### Step 4: Commit

Single atomic commit:
```
refactor: rename .agents to .agentss
```

## Edge Cases

- Handle `.agents/` (with trailing slash) and `.agents` (without)
- Update paths in code blocks and inline references
- Update explanatory prose mentioning `.agents`

## Next Steps

Run `/plan` to create implementation tasks:

```
/plan .agentss/design/2026-03-01-agent-to-agents-rename.md
```
