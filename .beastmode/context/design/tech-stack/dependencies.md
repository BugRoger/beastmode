# Dependencies

## Context
Traditional software projects accumulate package dependencies. Need to decide what beastmode depends on.

## Decision
No traditional package dependencies. Core components: Claude Code CLI (runtime), Anthropic Claude API (LLM backend), Git (version control + worktrees), Markdown + YAML (documentation + metadata). Zero npm/pip/cargo packages.

## Rationale
- Beastmode is markdown interpreted by Claude Code — there's nothing to package
- Git provides worktree isolation without additional tooling
- Fewer dependencies means fewer breakage points

## Source
state/design/2026-03-03-vision-alignment.md
