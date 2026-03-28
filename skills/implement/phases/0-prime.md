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

1. Resolve the manifest using [worktree-manager.md](../_shared/worktree-manager.md) → "Resolve Manifest" with the design name (worktree directory name)
2. Read the manifest JSON
3. Find the feature entry matching the feature slug from the argument
4. Read the feature plan file referenced in the manifest
5. Read the `architecturalDecisions` from the manifest — these are constraints for implementation

If the feature's status in the manifest is already `completed`, print a warning and STOP.

## 5. Set Feature In-Progress

Update the current feature's status in the manifest to `in-progress`. Write the manifest back.

### Sync GitHub (when enabled)

Read `.beastmode/config.yaml`. If `github.enabled` is `false` or missing, or the manifest has no `github` block, skip GitHub sync.

When `github.enabled` is `true` and the feature has a `github.issue` number:

@../_shared/github.md

Use warn-and-continue for all GitHub calls (see Error Handling Convention in github.md).

1. **Set Feature Status** — update the feature issue label to `status/in-progress`:

```bash
gh issue edit <feature-issue> --remove-label "status/ready" --add-label "status/in-progress"
```

2. **Advance Epic Phase** — if not already at `phase/implement`, set the Epic's phase label:

```bash
gh issue edit <epic-number> --remove-label "phase/plan" --add-label "phase/implement"
```

3. **Add Epic to Project** — call the "Add to Project + Set Status" operation from github.md with the epic URL and status `"Implement"`.

If GitHub sync fails, the manifest status update (`in-progress`) still applies — GitHub will catch up at the next sync point.

## 6. Capture Baseline Snapshot

Before any implementation begins, capture the current state of changed files:

```bash
git diff --name-only HEAD > /tmp/beastmode-baseline-$(date +%s).txt
```

Store the baseline file list. Spec checks in execute will diff against this baseline to avoid flagging files from prior feature implementations.

## 7. Prepare Environment

    # Install dependencies if needed
    npm install  # or appropriate command from .beastmode/context/
