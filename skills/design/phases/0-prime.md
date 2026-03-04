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

## 4. Create Feature Worktree

**MANDATORY — do not skip this step.**

Derive `<feature>` from the user's topic (kebab-case, e.g. `git-branching-strategy`).

```bash
mkdir -p .beastmode/worktrees
git worktree add ".beastmode/worktrees/<feature>" -b "feature/<feature>"
cd ".beastmode/worktrees/<feature>"
pwd  # confirm you are in the worktree
```

All subsequent work in this session MUST happen inside the worktree. If `cd` or `pwd` shows you are still in the main repo, STOP and fix it.

See @../_shared/worktree-manager.md for full reference.

## 5. Explore Context

- Read relevant files, docs, recent commits
- Understand current architecture
- Identify related components

## 6. Ask Clarifying Questions

- One question at a time
- Multiple choice preferred
- Focus on: purpose, constraints, success criteria
