## Context
Pipeline orchestration needs cost visibility without requiring a Claude session to check spend.

## Decision
Per-dispatch run log appended to `.beastmode-runs.json` with fields: epic, phase, feature, cost_usd, duration_ms, exit_status, timestamp. `beastmode status` reads this for cost-to-date reporting.

## Rationale
File-based run log is readable without Claude. JSON format enables programmatic consumption. Per-dispatch granularity supports cost attribution to specific phases and features.

## Source
`.beastmode/state/design/2026-03-28-typescript-pipeline-orchestrator.md`
