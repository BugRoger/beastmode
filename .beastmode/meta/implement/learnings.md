# Implement Learnings

Friction and insights captured during implement retros.

### 2026-03-04: hitl-gate-config
- **File-isolated waves enable reliable parallel dispatch** (2026-03-04): When the plan accurately separates files across tasks within a wave, parallel agent dispatch works perfectly. All 4 waves in this session completed with 0 deviations. The /plan file isolation analysis (Wave 2 tasks each touching different skill directories) was the key enabler.
- **Annotation tasks are ideal for parallel subagents** (2026-03-04): Tasks that insert content at known locations in existing files (like HITL-GATE annotations) are predictable enough for subagents to execute without controller intervention. The pattern: give exact surrounding context + exact content to insert = reliable results.

### 2026-03-05: hitl-adherence
- **Uniform transformation patterns scale to 11+ parallel subagents with zero deviations**: When every task follows the same structural pattern (replace HTML comment + @import with `## N. Gate:` step containing config lookup + human/auto substeps), subagents need no judgment calls. Pattern uniformity is the second key to reliable parallel dispatch (after file isolation).
- **Heading depth must adapt to structural context, but the detection pattern must not**: Gates nested inside subsections (implement 1.4, release 3.1, release 8.6) used ####/##### headings instead of ##/###. The task runner detects `Gate:` in the title regardless of heading level, making the pattern portable across nesting depths.
- **Demoted files should be kept as documentation, not deleted**: `gate-check.md` and `transition-check.md` lost their @import consumers but were retained with "Reference Only" headers. Demoting with explicit headers preserves discoverability while preventing accidental re-import.
