# 0. Prime

## 1. Announce Skill

"I'm using the /design skill to help turn your idea into a design."

## 2. Load Project Context

Read (if they exist):
- `.beastmode/PRODUCT.md`
- `.beastmode/context/DESIGN.md`
- `.beastmode/meta/DESIGN.md`

## 3. Check Research Trigger

Research triggers if ANY:

**Keyword Detection** — arguments contain:
- "research", "investigate", "explore first"
- "what's SOTA", "best practices", "how do people"

**Complexity Assessment** — topic involves:
- Unfamiliar technology or domain
- External API/service integration
- User expresses uncertainty

If triggered:
1. Extract topic from arguments
2. Spawn Explore agent with `@../../agents/researcher.md`
3. Save findings to `.agents/research/YYYY-MM-DD-<topic>.md`
4. Summarize findings to user
5. Continue with design

## 4. Create Cycle Worktree

```bash
topic="<topic-from-arguments>"
mkdir -p .agents/worktrees/cycle
path=".agents/worktrees/cycle/$topic"
branch="cycle/$topic"

git worktree add "$path" -b "$branch"
cd "$path"
```

Report: "Created worktree at `$path` on branch `$branch`"

## 5. Explore Context

- Read relevant files, docs, recent commits
- Understand current architecture
- Identify related components

## 6. Ask Clarifying Questions

- One question at a time
- Multiple choice preferred
- Focus on: purpose, constraints, success criteria
