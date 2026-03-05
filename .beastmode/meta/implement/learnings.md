# Implement Learnings

Friction and insights captured during implement retros.

### 2026-03-04: hitl-gate-config
- **File-isolated waves enable reliable parallel dispatch** (2026-03-04): When the plan accurately separates files across tasks within a wave, parallel agent dispatch works perfectly. All 4 waves in this session completed with 0 deviations. The /plan file isolation analysis (Wave 2 tasks each touching different skill directories) was the key enabler.
- **Annotation tasks are ideal for parallel subagents** (2026-03-04): Tasks that insert content at known locations in existing files (like HITL-GATE annotations) are predictable enough for subagents to execute without controller intervention. The pattern: give exact surrounding context + exact content to insert = reliable results.
