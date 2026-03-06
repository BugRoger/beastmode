# Product

Beastmode is a workflow system that turns Claude Code into a disciplined engineering partner through opinionated workflow patterns. It provides a structured five-phase workflow (design → plan → implement → validate → release) with context persistence across sessions and a self-improvement meta layer.

## Vision

Turn Claude Code into a disciplined engineering partner through opinionated workflow patterns.

## Goals

- Structured phases (design → plan → implement → validate → release) with consistent sub-phase anatomy (prime → execute → validate → checkpoint)
- Context persistence across sessions via `.beastmode/` artifact storage organized as Product, Context, State, and Meta domains
- Self-improvement through meta layer — retro phases capture learnings that inform future sessions
- Progressive knowledge hierarchy — L0 (PRODUCT.md) provides richest standalone summary, L1 files provide domain summaries, L2 files provide full detail, L3 state artifacts provide provenance

## How It Works

Each skill (/design, /plan, /implement, /validate, /release) follows the same four sub-phases: prime loads context, execute does the work, validate checks quality, checkpoint saves artifacts and captures learnings. Features flow through `.beastmode/state/` directories as they progress through the workflow. Git worktrees provide isolation during implementation.
