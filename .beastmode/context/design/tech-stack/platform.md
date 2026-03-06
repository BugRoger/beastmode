# Platform

## Context
Need a host environment that supports multi-step agentic workflows with tool access and subagent spawning.

## Decision
Claude Code is the host environment. Skills execute as agentic workflows interpreted by Claude Code's skill system. Distribution via Claude Code marketplace.

## Rationale
- Claude Code provides skill execution runtime and subagent spawning natively
- Marketplace distribution handles versioning and updates
- No need for custom runtime — Claude Code already provides everything

## Source
state/design/2026-03-04-agents-to-beastmode-migration.md
