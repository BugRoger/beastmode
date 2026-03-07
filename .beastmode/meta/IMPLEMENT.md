# Implement Meta

Process knowledge from implementation phases. Key pattern: markdown-only plans with file-isolated waves execute cleanly in parallel with zero deviations when the plan accurately captures file boundaries. Pattern uniformity across tasks is the second key enabler. Confirmed across 3 features (hitl-gate-config, hitl-adherence, meta-retro-rework). Upstream friction areas: context compaction state loss, subagent coordination gaps, and plugin cache staleness in worktrees.

## Procedures

1. ALWAYS ensure file isolation across parallel wave tasks — plans must assign disjoint file sets to each task within a wave to enable reliable parallel dispatch

## Domains
Three insight clusters: parallel dispatch reliability (file isolation + pattern uniformity, promoted to Procedure after 4 observations across 3 features), structural adaptation patterns (heading depth portability, demoted file preservation), and migration-as-validation. Three upstream records: context compaction state loss, subagent state coordination gaps, plugin cache worktree staleness.
