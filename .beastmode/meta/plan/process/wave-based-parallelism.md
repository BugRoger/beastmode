# Wave-Based Parallelism

## Observation 1
### Context
During init-l2-expansion planning, 2026-03-08
### Observation
7 plan tasks naturally grouped into 3 waves based on dependency analysis: Wave 1 (skeleton files — no dependencies), Wave 2 (agent rewrites — depend on skeleton), Wave 3 (integration + verification — depend on agents). This matches the implement phase's parallel dispatch model where up to 3 independent tasks run concurrently within a wave.
### Rationale
Wave ordering derived from component dependencies, not arbitrary sequencing. Foundation tasks produce artifacts that consumer tasks need as input context.
### Source
state/plan/2026-03-08-init-l2-expansion.md
### Confidence
[MEDIUM] — second observation confirming pattern

## Observation 2
### Context
During github-state-model planning, 2026-03-28
### Observation
6 tasks grouped into 4 waves: Wave 1 (3 parallel-safe foundation tasks with no dependencies), Wave 2 (routing update depending on subcommand), Wave 3 (frontmatter update depending on routing), Wave 4 (end-to-end verification depending on all). The 3-task parallel Wave 1 maximizes throughput for independent creation tasks.
### Rationale
Second confirmation that wave ordering derives from component dependency graphs. Multi-task Wave 1 demonstrates the throughput benefit of identifying independent foundations.
### Source
state/plan/2026-03-28-github-state-model.md
### Confidence
[MEDIUM] — second observation confirming pattern
