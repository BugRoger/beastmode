## Context
The tech stack needs to accommodate a TypeScript CLI alongside the existing dependency-free markdown plugin.

## Decision
Dual-track model: skills remain dependency-free markdown interpreted by Claude Code; CLI (`cli/`) is a separate TypeScript package with Bun runtime, Agent SDK, and its own `package.json`. Plugin distributed via marketplace; CLI installed via `bun link`.

## Rationale
Explicit override of prior "no runtime dependencies" rule. The CLI is a separate package with a separate dependency story — skills remain pure markdown. This preserves the zero-dependency plugin while enabling typed orchestration.

## Source
`.beastmode/state/design/2026-03-28-typescript-pipeline-orchestrator.md`
