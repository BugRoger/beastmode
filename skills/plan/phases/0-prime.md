# 0. Prime

## 1. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does and what the user's role is.

Then print the phase indicator from @../_shared/visual-language.md showing **plan** as the current phase.

@../_shared/persona.md

## 2. Load Project Context

Read (if they exist):
- `.beastmode/context/PLAN.md`
- `.beastmode/meta/PLAN.md`

Follow L2 convention paths (`context/plan/{domain}.md`) when relevant to the current topic.
Prior decisions, conventions, and learnings inform this phase — don't re-decide what's already been decided.

## 3. Discover and Enter Feature Worktree

**MANDATORY — do not skip this step.**

Resolve the feature name and enter the worktree:

1. If arguments contain a state file path → extract feature name from filename (strip date prefix and `.md`)
2. If no arguments → scan `.beastmode/worktrees/` for directories:
   - Exactly one → use it automatically
   - Multiple → list with branch names, ask user to pick via `AskUserQuestion`
   - Zero → print: "No active worktrees found. Run /design to start a new feature, or provide a state file path as argument." and STOP
3. Enter the worktree:

```bash
worktree_path=".beastmode/worktrees/$feature"
if [ ! -d "$worktree_path" ]; then
  echo "Error: Worktree not found at $worktree_path"
  exit 1
fi
cd "$worktree_path"
pwd  # confirm you are in the worktree
```

See [worktree-manager.md](../_shared/worktree-manager.md) for full reference.

## 4. Check Research Trigger

Research triggers if ANY:
- Arguments contain research keywords
- Design references unfamiliar technology
- Complex integration required

If triggered, spawn Explore agent, save findings, summarize to user and continue to next step.

## 5. Read Design Document

Read the design doc from arguments (e.g., `.beastmode/state/design/YYYY-MM-DD-<topic>.md`).
