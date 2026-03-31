---
phase: plan
epic: remove-dead-gates
feature: config-cleanup
---

# Config Cleanup

**Design:** `.beastmode/artifacts/design/2026-03-31-remove-dead-gates.md`

## User Stories

3. As a developer, I want removed gates cleaned from config.yaml, so that the config reflects reality

## What to Build

Remove three gate entries from `.beastmode/config.yaml`:

- `plan.feature-set-approval` (currently `auto`)
- `plan.feature-approval` (currently `auto`)
- `design.slug-proposal` (currently `human`)

If removing all entries from a section leaves it empty, remove the section header too (the `plan:` section will be empty after removing both entries). The `design:` section retains its other gates.

## Acceptance Criteria

- [ ] `config.yaml` parses as valid YAML after edits
- [ ] No `feature-set-approval` entry in config
- [ ] No `feature-approval` entry in config
- [ ] No `slug-proposal` entry in config
- [ ] All other gate entries remain unchanged
- [ ] No empty section headers left behind
