# Infrastructure Over Instructions

## Observation 1
### Context
During manifest-file-management design, 2026-03-29
### Observation
The design moved output.json generation from skill checkpoint instructions (where each skill was responsible for a "Write Phase Output" step) to a Stop hook that fires automatically when Claude finishes responding. The hook scans artifact frontmatter and generates the output.json contract without any skill participation. This eliminated the "Write Phase Output" step from all 5 phase skill checkpoints, removing an instruction-compliance dependency.
### Rationale
When a contract must be enforced across N independent skills, placing enforcement in infrastructure (hooks) is more reliable than placing it in instructions (skill checkpoints). Instructions can be missed, misinterpreted, or skipped. Infrastructure runs unconditionally. The trade-off is reduced skill flexibility -- skills can no longer customize the output contract. But when the contract is standardized (which it is -- artifact frontmatter schema is fixed), infrastructure enforcement eliminates an entire class of compliance bugs.
### Source
.beastmode/artifacts/design/2026-03-29-manifest-file-management.md
### Confidence
[LOW] -- first-time observation; related to redundant-upstream-gatekeeping (Obs 1-2) in that both are about where enforcement logic lives, but distinct: that pattern is about removing unnecessary upstream checks, this pattern is about moving necessary enforcement from instructions to infrastructure
