# Testing

Verification strategy for beastmode. Brownfield discovery on real codebases validates context population. No automated test suite — verification is manual via skill invocation and content inspection.

## Brownfield Verification
Success criteria: all context L2 files populated with project-specific content after `init --brownfield`. No placeholder patterns remaining.

1. ALWAYS verify L2 files contain project-specific content, not placeholders
2. ALWAYS check: populated sections, actual file paths, real patterns from codebase
3. NEVER accept generic content — every L2 entry should reference actual project artifacts

## Critical Paths
Core scenarios that must work: brownfield execution, parallel agent spawning, content merge, atomic file writes, gate structure, task-runner integration.

1. ALWAYS test brownfield on a real codebase before release
2. ALWAYS verify parallel agents produce non-conflicting output
3. ALWAYS verify atomic writes — no partial file states
