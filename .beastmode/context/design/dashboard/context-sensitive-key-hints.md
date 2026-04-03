# Context-Sensitive Key Hints

## Context
The dashboard supports multiple interaction modes (normal, filter, cancel confirmation). The key hints bar must reflect the currently available keybindings.

## Decision
A single key hints bar at the bottom updates based on interaction mode. Normal mode: `q quit Up/Down navigate / filter x cancel a all`. Filter mode: inline text prompt replacing key hints. Cancel confirmation: `Cancel {slug}? y confirm n/esc abort`. Only one mode active at a time — cancel blocks all other input.

## Rationale
The interface teaches itself — users always see exactly which keys are available. Mode-based rather than view-based after the switch from drill-down to flat three-panel layout.

## Source
.beastmode/artifacts/design/2026-04-03-dashboard-rework.md
