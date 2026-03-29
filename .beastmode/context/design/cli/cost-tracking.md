## Context
Pipeline orchestration needs cost visibility without requiring a Claude session to check spend.

## Decision
Per-dispatch run log appended to `.beastmode-runs.json` with fields: epic, phase, feature, cost_usd, duration_ms, exit_status, timestamp. Cost reporting removed from `beastmode status` — status shows pipeline state only. Run log preserved for external consumption by other tooling.

## Rationale
File-based run log is readable without Claude. JSON format enables programmatic consumption. Per-dispatch granularity supports cost attribution to specific phases and features. Status command is simplified to pure state reporting — cost data is available in the run log for anyone who needs it.

## Source
`.beastmode/artifacts/design/2026-03-28-typescript-pipeline-orchestrator.md`
.beastmode/artifacts/design/2026-03-29-status-unfuckery-v2.md
