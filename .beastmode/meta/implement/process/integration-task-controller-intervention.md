# Integration Task Controller Intervention

## Observation 1
### Context
During xstate-pipeline-machine implementation, 2026-03-31. Wave 2 dispatched a single integration task (epic machine definition) that consumed all 4 files produced by parallel Wave 1 (types, guards, actions, services) and wired them into a single XState machine via setup().
### Observation
The integration subagent hit TypeScript compilation errors it could not resolve autonomously. XState v5.30 requires assign() calls to be defined inline within setup() for proper type inference — the subagent structured assign() with explicit type parameters, which fails at compile time. The controller had to intervene and restructure.
### Rationale
Integration tasks that synthesize multiple typed modules into a single API surface may exceed subagent capability when the target API has non-obvious type inference requirements.
### Source
.beastmode/artifacts/implement/2026-03-31-xstate-pipeline-machine-machine-definition.md
### Confidence
[LOW] — first-time observation, single feature
