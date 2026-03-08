# 0. Prime

## 1. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does and what the user's role is.

@../_shared/persona.md

## 2. Load Project Context

Read (if they exist):
- `.beastmode/context/PLAN.md`
- `.beastmode/meta/PLAN.md`

Follow L2 convention paths (`context/plan/{domain}.md`) when relevant to the current topic.
Prior decisions, conventions, and learnings inform this phase — don't re-decide what's already been decided.

<HARD-GATE>
All work happens in a worktree. No exceptions.
Documentation, single-file edits, and "lightweight" tasks all require worktrees.
If you judge the task as too small for a worktree, you are wrong.
</HARD-GATE>

## 3. Discover and Enter Feature Worktree

**MANDATORY — do not skip this step.**

Follow [worktree-manager.md](../_shared/worktree-manager.md):

1. **Discover Feature** — resolve feature name from arguments or filesystem scan. Uses "Derive Feature Name" for extraction. Do NOT search for similarly named worktrees or artifacts.
2. **Enter Worktree** — cd into the worktree and verify with pwd.

The resolved `feature` name is used for all artifact paths in this phase.

## 4. Check Research Trigger

Research triggers if ANY:
- Arguments contain research keywords
- Design references unfamiliar technology
- Complex integration required

If triggered, spawn Explore agent with `@../../agents/common-researcher.md`, save findings, summarize to user and continue to next step.

## 5. Read Design Document

Resolve the design artifact using [worktree-manager.md](../_shared/worktree-manager.md) → "Resolve Artifact" with type=`design` and the feature name from step 3.

Read the resolved file path.
