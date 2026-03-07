# Data Domains

## Context
Different types of information have different lifecycles and purposes. Feature state, build knowledge, and self-improvement data need distinct update patterns.

## Decision
Three domains: State (feature workflow at `.beastmode/state/`), Context (published knowledge at `.beastmode/context/`), Meta (process knowledge at `.beastmode/meta/`). State tracks where features are. Context documents how to build. Meta captures how to improve with two L2 domains per phase: insights (process patterns) and upstream (beastmode feedback). Meta L3 records are topic-clustered with accumulated observations and confidence tags.

## Rationale
- Clear separation enables focused updates without cross-contamination
- State as workflow tracker maps naturally to feature lifecycle
- Meta enables continuous improvement through retro-captured learnings
- Two-domain split (insights vs upstream) separates process patterns from tool feedback
- Topic clustering enables observation accumulation and frequency-based promotion

## Source
state/design/2026-03-01-bootstrap-discovery-v2.md
state/design/2026-03-07-meta-retro-rework.md
