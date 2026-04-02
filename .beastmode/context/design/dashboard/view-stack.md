# View Stack

## Context
The flat dashboard shows one level of data (epic table). Users need to drill into epics to see features, and into features to see live agent output, without losing orientation.

## Decision
Three view types (EpicList, FeatureList, AgentLog) managed as a push/pop stack. Enter pushes the next view, Escape pops back. Only one view renders in the content area at a time. A breadcrumb bar between header and content area shows the current stack path (e.g., `epics > cancel-cleanup > cancel-logic`). Escape at the root (EpicList) is a no-op.

## Rationale
Push/pop stack is the k9s navigation model — maximizes content space in the terminal by replacing the full content area instead of splitting into list + detail (lazygit model). The breadcrumb bar provides orientation without consuming a persistent side panel. Stack-driven rendering keeps the component model simple: each view is independent, the stack manages transitions.

## Source
.beastmode/artifacts/design/2026-04-02-dashboard-drilldown.md
.beastmode/artifacts/implement/2026-04-02-dashboard-drilldown-view-stack.md
