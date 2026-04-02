# Context-Sensitive Key Hints

## Context
Different views support different keybindings. A static key hints bar would show keys that don't work in the current context, confusing users.

## Decision
Each view type exports its own key hint set. The bottom bar updates on every push/pop. EpicList: `q quit ↑↓ navigate ↵ drill x cancel a all`. FeatureList: `q quit ↑↓ navigate ↵ drill ⎋ back`. AgentLog: `q quit ↑↓ scroll ⎋ back f follow`.

## Rationale
The interface teaches itself — users always see exactly which keys are available. This follows k9s's pattern where the bottom bar reflects the current resource context.

## Source
.beastmode/artifacts/design/2026-04-02-dashboard-drilldown.md
