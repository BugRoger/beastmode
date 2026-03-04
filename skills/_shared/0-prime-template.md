# 0. Prime

## 1. Announce Skill

"I'm using the /{skill-name} skill to {skill-purpose}."

## 2. Load Project Context

Read (if they exist):
- `.beastmode/PRODUCT.md` (L0)
- `.beastmode/context/{PHASE}.md` (L1)
- `.beastmode/meta/{PHASE}.md` (L1)

## 3. Check Research Trigger (Optional)

Research triggers if ANY:

**Keyword Detection** — arguments contain:
- "research", "investigate", "explore first"
- "what's SOTA", "best practices", "how do people"

**Complexity Assessment** — topic involves:
- Unfamiliar technology or domain
- External API/service integration
- User expresses uncertainty

If triggered, spawn Explore agent with `@../../agents/researcher.md`.

## 4. Enter Cycle Worktree (if applicable)

```bash
# Derive feature from design/plan doc filename or arguments
feature="<feature-name>"
worktree_path=".beastmode/worktrees/$feature"

if [ -n "$worktree_path" ] && [ -d "$worktree_path" ]; then
  cd "$worktree_path"
  echo "Working in cycle worktree at $worktree_path"
fi
```

## 5. Phase-Specific Setup

<!-- Each skill adds its own context loading here -->
