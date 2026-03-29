# 0. Prime

## 1. Resolve Feature Name

The feature name comes from the skill arguments. Use it directly for all artifact paths in this phase.

## 2. Announce Skill

Greet in persona voice. One sentence. Set expectations for what this phase does and what the user's role is.

@../_shared/persona.md

## 3. Load Project Context

Read (if they exist):
- `.beastmode/context/VALIDATE.md`
- `.beastmode/meta/VALIDATE.md`

Follow L2 convention paths (`context/validate/{domain}.md`) when relevant to the current topic.
Prior decisions, conventions, and learnings inform this phase — don't re-decide what's already been decided.

## 4. Check Feature Completion

Scan for implementation artifacts to verify all features have been implemented:

```bash
ls .beastmode/artifacts/implement/*-$design-*.md 2>/dev/null
```

Cross-reference against the feature plan files to determine completion status.

Print status:

```
Feature Completion Check
────────────────────────
✓ feature-1 — completed
✓ feature-2 — completed
✗ feature-3 — pending

Result: BLOCKED — 1 feature still pending
```

If any features are NOT completed:
- Print which features are pending
- STOP — do not proceed to test execution
- Suggest: "Run `/beastmode:implement <design>-<pending-feature>` to complete remaining features."

If all completed: proceed to next step.

## 5. Identify Test Strategy

From context, determine:
- Test command (e.g., `npm test`, `pytest`)
- Lint command (if configured)
- Type check command (if configured)
- Custom gates from meta
