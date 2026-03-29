# 0. Prime

## 1. Resolve Feature Name

The argument is `<design>-<feature-slug>`. Parse the design name and feature slug from it. The feature name is used for all artifact paths in this phase.

## 2. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does and what the user's role is.

@../_shared/persona.md

## 3. Load Project Context

Read (if they exist):
- `.beastmode/context/IMPLEMENT.md`
- `.beastmode/meta/IMPLEMENT.md`

Follow L2 convention paths (`context/implement/{domain}.md`) when relevant to the current topic.
Prior decisions, conventions, and learnings inform this phase — don't re-decide what's already been decided.

## 4. Resolve Feature Plan

1. Locate the feature plan by convention glob:

```bash
matches=$(ls .beastmode/artifacts/plan/*-$design-$feature.md 2>/dev/null)
```

If no matches, error: "No feature plan found for '$design/$feature'". If multiple, take the latest (date prefix sorts chronologically).

2. Read the feature plan file
3. Read the architectural decisions from the plan's design reference

## 5. Capture Baseline Snapshot

Before any implementation begins, capture the current state of changed files:

```bash
git diff --name-only HEAD > /tmp/beastmode-baseline-$(date +%s).txt
```

Store the baseline file list. Spec checks in execute will diff against this baseline to avoid flagging files from prior feature implementations.

## 6. Prepare Environment

    # Install dependencies if needed
    npm install  # or appropriate command from .beastmode/context/
