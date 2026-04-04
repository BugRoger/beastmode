# Dispatch Strategy (supersedes SDK-forced override)

## Context
The dashboard originally forced SDK dispatch at runtime, overriding the operator's configured `cli.dispatch-strategy`, because live message streaming required SDK async generators. The `dashboard-dispatch-fix` epic changed this: the dashboard now respects the configured strategy.

## Decision
The dashboard calls `selectStrategy(config.cli["dispatch-strategy"])` — the same function the watch command uses. When the configured strategy is SDK, live streaming proceeds as before. When the configured strategy is non-SDK (cmux/iTerm2/auto-resolved to non-SDK), the log panel falls back to WatchLoop lifecycle event entries (dispatching / completed / failed).

## Rationale
Forcing SDK violated the operator's config and prevented testing non-SDK dispatch paths through the dashboard. The event-log fallback provides meaningful visibility for non-SDK strategies at acceptable cost (lifecycle-only granularity instead of per-message streaming). The unified `selectStrategy()` path eliminates the divergence between dashboard and watch dispatch behavior.

## Dissent / Prior Decision
The prior design (forced SDK) was justified because non-SDK paths had no structured output to display. The event-log fallback resolves this constraint — it provides a graceful degradation path rather than requiring SDK to be forced. Future designs that add structured output to cmux/iTerm2 sessions could further close the gap.

## Source
.beastmode/artifacts/design/2026-04-04-dashboard-dispatch-fix.output.json
.beastmode/artifacts/plan/2026-04-04-dashboard-dispatch-fix-strategy-dispatch.md
.beastmode/artifacts/plan/2026-04-04-dashboard-dispatch-fix-event-log-fallback.md
