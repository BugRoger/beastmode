# Guidance Authority

## Context
Retro agents and sub-agents were independently printing next-step commands, causing repetition and burying the actual transition instruction.

## Decision
Single authoritative source for next-step commands: the transition gate in the checkpoint phase only. Retro agents are explicitly banned from printing transition guidance.

## Rationale
- Single authority eliminates competing guidance
- Retro ban is explicit because retro output naturally precedes the transition gate, making it the most visible source of duplication

## Source
state/design/2026-03-08-phase-end-guidance.md
