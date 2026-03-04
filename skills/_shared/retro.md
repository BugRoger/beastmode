# Phase Retro

Review this phase's work for context doc accuracy and meta learnings.

## 1. Gather Phase Context

Determine current phase and feature:

1. Identify current phase from the skill being executed (design/plan/implement/validate/release)
2. Read phase artifacts (design doc, plan doc) from `.beastmode/state/`
3. Read the phase's context docs from `.beastmode/context/{phase}/`
4. Read the phase's meta doc from `.beastmode/meta/{PHASE}.md`

## 2. Quick-Exit Check

Skip agent review if session was trivial:
- Phase had fewer than ~5 substantive tool calls
- No new patterns, decisions, or discrepancies observed
- Phase was a routine re-run

If skipping, add a one-liner to meta if anything minor was noted, then proceed to next checkpoint step.

## 3. Spawn Review Agents

Launch 2 parallel Explore agents (haiku model):

1. **Context Agent** — read prompt from `agents/retro-context.md`
   - Append: current phase name, paths to context docs, session artifacts
   - Reviews `.beastmode/context/{phase}/` docs for accuracy

2. **Meta Agent** — read prompt from `agents/retro-meta.md`
   - Append: current phase name, paths to meta doc, session artifacts
   - Captures learnings for `.beastmode/meta/{PHASE}.md`

Include in both agent prompts:

```
## Session Context
- **Phase**: {current phase}
- **Feature**: {feature name}
- **Artifacts**: {list of design/plan doc paths}
```

## 4. Present Findings

Show user a summary:

```
### Phase Retro Results

**Context changes** ({N} findings):
- {finding summary} — confidence: {level}

**Meta learnings** ({N} items):
- {learning summary}
```

## 5. Apply Changes

- **Meta learnings**: Auto-append to `.beastmode/meta/{PHASE}.md` under `## Learnings`
- **Context changes**: Present each proposed edit and ask for approval before applying
  - High confidence: "Apply this change? [Y/n]"
  - Medium/Low confidence: "Review suggested change: [apply / skip / edit]"

If no findings from either agent, report: "Phase retro: no changes needed."

## 6. Bottom-Up Summary Bubble

After applying L2 changes, propagate summaries upward:

1. **Update L1 summaries** — For each L1 file in the current domain (`context/{PHASE}.md`, `meta/{PHASE}.md`, `state/{PHASE}.md`):
   - Re-read all L2 @imported files
   - Rewrite the section summary (2-3 sentences) to reflect current L2 content
   - Rewrite the top-level summary paragraph to reflect all sections

2. **Prune stale entries** — In L2 "Related Decisions" sections:
   - Verify each linked state file still exists
   - Remove entries where the link target is missing
   - Flag entries where the one-liner no longer matches the linked file's goal

L0 (PRODUCT.md) updates are handled by /release step 8.5, not by the retro bubble.
