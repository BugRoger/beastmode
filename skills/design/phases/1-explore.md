# 1. Explore Context

## 1. Announce Skill

"I'm using the /design skill to help turn your idea into a design."

## 2. Check Project State

- Read relevant files, docs, recent commits
- Understand current architecture
- Identify related components

## 3. Create Cycle Worktree

Create isolated worktree for the entire feature cycle:

```bash
# Extract topic from arguments or user input
topic="<topic-name>"

# Create worktree
mkdir -p .agents/worktrees/cycle
path=".agents/worktrees/cycle/$topic"
branch="cycle/$topic"

# Verify worktree dir is gitignored
git check-ignore -q .agents/worktrees 2>/dev/null || {
  echo ".agents/worktrees/" >> .gitignore
  git add .gitignore
  git commit -m "chore: ignore .agents/worktrees/"
}

# Create worktree with new branch
git worktree add "$path" -b "$branch"
cd "$path"
```

Report: "Created worktree at `$path` on branch `$branch`"

## 4. Ask Clarifying Questions

- **One question at a time** — don't overwhelm
- **Multiple choice preferred** — easier to answer
- Focus on: purpose, constraints, success criteria
- Follow threads — if answer reveals complexity, dig deeper

## 5. Create Tasks

Create a task for each step in the design process:
1. Explore project context
2. Ask clarifying questions
3. Propose 2-3 approaches
4. Present design
5. Write design doc
6. Transition to implementation
