# Testing

## Brownfield Verification
- ALWAYS verify L2 files contain project-specific content, not placeholders — real data only
- ALWAYS check: populated sections, actual file paths, real patterns from codebase — completeness
- NEVER accept generic content — every L2 entry should reference actual project artifacts
- Success criteria: all context L2 files populated after `init --brownfield` — no placeholder patterns remaining

## Critical Paths
- ALWAYS test brownfield on a real codebase before release — integration validation
- ALWAYS verify parallel agents produce non-conflicting output — concurrency safety
- ALWAYS verify atomic writes — no partial file states
- Core scenarios: brownfield execution, parallel agent spawning, content merge, atomic file writes, task-runner integration — full coverage
