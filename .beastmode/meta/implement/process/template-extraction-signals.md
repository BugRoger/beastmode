# Template Extraction Signals

## Observation 1
### Context
During github-phase-integration implementation, 2026-03-28. The "Sync GitHub" step was replicated across 6 checkpoint files with an identical pattern: read config, check github.enabled, @import github.md, use warn-and-continue.
### Observation
When the same multi-line block is copy-pasted into 6+ files during a single feature implementation, it signals a shared template extraction opportunity. The "Sync GitHub" preamble (config check, import, error handling convention reference) could be a reusable fragment rather than inline repetition. This was not a problem for implementation correctness, but increases maintenance surface for future changes to the pattern.
### Rationale
Repetition count is a leading indicator for template extraction. A pattern repeated 3+ times in a single feature should be flagged during plan review as a candidate for shared abstraction. This does not mean extraction is always correct — sometimes inline repetition is clearer — but it should be a conscious decision, not an accident.
### Source
skills/design/phases/3-checkpoint.md, skills/plan/phases/3-checkpoint.md, skills/implement/phases/3-checkpoint.md, skills/validate/phases/3-checkpoint.md, skills/release/phases/3-checkpoint.md, skills/implement/phases/0-prime.md
### Confidence
[LOW] — first observation
