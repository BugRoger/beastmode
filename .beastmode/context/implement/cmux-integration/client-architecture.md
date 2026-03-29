# Client Architecture

## Context
The cmux-client feature needed a typed wrapper around the cmux CLI binary for use by pipeline orchestration (cmux-strategy, dispatch-abstraction, startup-reconciliation).

## Decision
Class-based CmuxClient with dependency-injected SpawnFn instead of the plan's free-function approach. ICmuxClient interface extracted for strategy pattern use.

## Rationale
Class approach centralizes exec() and parseJson() as private methods, avoiding repetition across 9 public methods. SpawnFn injection makes unit testing trivial without mocking global Bun.spawn. ICmuxClient enables downstream features to swap dispatch strategies.

## Source
cli/src/cmux-client.ts
