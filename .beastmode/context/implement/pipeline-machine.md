# Pipeline Machine

## Machine Architecture
- Two XState v5 machines: epicMachine (7 states with side effects) and featureMachine (4 states, pure status tracking)
- ALWAYS use the setup() API — declare all guards, actions, and actors in setup() before createMachine()
- Epic states: design, plan, implement, validate, release, done, cancelled — done and cancelled are terminal (type: "final")
- Feature states: pending, in-progress, completed, blocked — completed is terminal (type: "final")
- CANCEL event is valid from every non-terminal epic state

## Assign Separation Pattern
- ALWAYS place assign() calls inside setup() actions — XState v5.30 requires this for type inference
- Action logic lives in pure compute functions exported from actions.ts
- assign() wrappers in setup() call the compute functions and add lastUpdated timestamps
- Side-effect actions (persist) are stubs — consumers provide real implementations

## Dispatch Metadata
- Every state node declares meta: { dispatchType } — single, fan-out, or skip
- design/plan/validate/release are single, implement is fan-out, done/cancelled are skip
- Watch loop reads dispatch instructions from state metadata

## Service Injection
- Async services use fromPromise with injectable functions via input
- syncGitHub service is non-blocking: errors caught internally, returned as warnings
- No sync function provided = no-op return with warning, never throws

## Actor Lifecycle
- createEpicActor(context) creates and starts a fresh actor
- loadEpic(snapshot, context) restores an actor from persisted snapshot
- Event type constants exported as EPIC_EVENTS and FEATURE_EVENTS

## Guards
- Guards are standalone pure functions in guards.ts, registered by name in setup()
- Guard decisions are event-driven: check event payloads rather than external state
- hasFeatures gates plan-to-implement, allFeaturesCompleted gates implement-to-validate
