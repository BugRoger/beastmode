# SOTA vs Training Self-Documentation

## Observation 1
### Context
During github-state-model design, 2026-03-28
### Observation
The research artifact included an explicit "SOTA vs Training" comparison table that mapped each topic to two columns: what Claude's training data likely knows versus verified current reality (2026). This meta-cognitive technique self-documents where the AI's knowledge is stale, giving downstream consumers (design phase, future sessions) a calibrated view of which claims are training-data extrapolations versus live-verified facts. The technique was paired with per-claim confidence tags ([HIGH/MEDIUM/LOW]) throughout the research doc.
### Rationale
When AI agents produce research artifacts, the reliability of claims varies by topic recency. Explicitly documenting the gap between training knowledge and verified current state prevents downstream phases from treating stale training-data claims with the same confidence as live-verified API behavior. This is especially important for fast-moving platform APIs (GitHub sub-issues, issue types, issue fields) where capabilities change quarterly.
### Source
.beastmode/state/research/2026-03-28-github-issue-hierarchy.md
### Confidence
[LOW] -- first-time observation; the technique is novel but only applied once
