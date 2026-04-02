# SDK Dispatch Override

## Context
The dashboard's AgentLog view needs live structured message streams from running agent sessions. The `cli.dispatch-strategy` config allows cmux or SDK dispatch, but cmux sessions are terminal processes with no programmatic stream to tap.

## Decision
When the dashboard is running, the dispatch strategy is overridden to SDK regardless of the `cli.dispatch-strategy` config setting. This is a runtime override, not a config change.

## Rationale
The dashboard's value proposition (live drill-down into agent output) depends on SDK async generators yielding typed messages. cmux and iTerm2 sessions produce terminal output that cannot be structured. Forcing SDK dispatch is the minimum viable constraint — it preserves the config for headless `beastmode watch` while guaranteeing the dashboard has the data it needs.

## Source
.beastmode/artifacts/design/2026-04-02-dashboard-drilldown.md
