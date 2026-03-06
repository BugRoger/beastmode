# Data Domains

## Context
Different types of information have different lifecycles and purposes. Feature state, build knowledge, and self-improvement data need distinct update patterns.

## Decision
Three domains: State (feature workflow at `.beastmode/state/`), Context (published knowledge at `.beastmode/context/`), Meta (learnings/SOPs/overrides at `.beastmode/meta/`). State tracks where features are. Context documents how to build. Meta captures how to improve.

## Rationale
- Clear separation enables focused updates without cross-contamination
- State as workflow tracker maps naturally to feature lifecycle
- Meta enables continuous improvement through retro-captured learnings

## Source
state/design/2026-03-01-bootstrap-discovery-v2.md
