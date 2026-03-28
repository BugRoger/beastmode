# Migration Strategy

## Context
Existing file-based state tracking must coexist with the new GitHub-based model during transition.

## Decision
Additive-first migration: skills write to GitHub alongside existing state files. File-based status tracking deprecated only after GitHub path is proven. Migration order: setup -> design checkpoint -> plan checkpoint -> implement -> validate/release -> deprecate .tasks.json.

## Rationale
Coexistence protects against regression. Additive approach means existing workflows continue to work if GitHub integration has issues. Ordered migration lets each phase be validated independently.

## Source
.beastmode/state/design/2026-03-28-github-state-model.md
