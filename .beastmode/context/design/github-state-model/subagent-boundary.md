# Subagent Boundary

## Context
Implement phase dispatches subagents per task. These agents need a clear boundary around what state they can access.

## Decision
Implement subagents are GitHub-unaware. Only the checkpoint (main conversation) reads/writes the manifest and syncs GitHub. Subagents do pure implementation work with no manifest or GitHub access.

## Rationale
Centralizing GitHub operations in checkpoint keeps the integration surface small and testable. Subagents having no awareness of GitHub eliminates an entire class of race conditions and error modes.

## Source
.beastmode/state/design/2026-03-28-github-phase-integration.md
