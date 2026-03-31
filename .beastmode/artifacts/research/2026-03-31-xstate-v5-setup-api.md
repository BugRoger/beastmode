# Research: XState v5 `setup()` API

**Date:** 2026-03-31
**Phase:** design
**Objective:** Comprehensive reference for XState v5's `setup()` API covering declaration patterns, persistence, metadata, invoke, TypeScript typing, and testing.

## Summary

XState v5's `setup()` API is the canonical way to build type-safe state machines. It separates declaration (types, actions, guards, actors) from configuration (states, transitions), enabling strong TypeScript inference, dependency injection via `provide()`, and clean testability. The persistence API (`getPersistedSnapshot` / `createActor(machine, { snapshot })`) supports full serialize/restore cycles including child actors. State node `meta` provides static metadata accessible at runtime via `snapshot.getMeta()`.

---

## 1. How `setup()` Works

`setup()` accepts declarations, returns a builder with `.createMachine()`. All named references (actions, guards, actors) are string-keyed in the machine config, resolved from the `setup()` declarations. [HIGH -- Context7 official docs]

### Basic Pattern

```typescript
import { setup, assign } from 'xstate';

const machine = setup({
  types: {
    context: {} as { count: number },
    events: {} as { type: 'inc' } | { type: 'dec' },
  },
  actions: {
    increment: assign({
      count: ({ context }) => context.count + 1,
    }),
    decrement: assign({
      count: ({ context }) => context.count - 1,
    }),
  },
}).createMachine({
  context: { count: 0 },
  on: {
    inc: { actions: 'increment' },
    dec: { actions: 'decrement' },
  },
});
```

### Declaring Actions with Params

Actions can receive typed parameters when invoked from config:

```typescript
const machine = setup({
  actions: {
    track: (_, params: { response: string }) => {
      // side effect
    },
    increment: (_, params: { value: number }) => {
      // side effect
    },
  },
}).createMachine({
  entry: [
    { type: 'track', params: { response: 'good' } },
    { type: 'increment', params: { value: 1 } },
  ],
});
```

### Declaring Guards

```typescript
const machine = setup({
  types: {
    context: {} as { count: number },
    events: {} as { type: 'NEXT' },
  },
  guards: {
    hasEnough: ({ context }) => context.count >= 5,
  },
}).createMachine({
  initial: 'waiting',
  states: {
    waiting: {
      on: {
        NEXT: {
          guard: 'hasEnough',  // string ref to declared guard
          target: 'done',
        },
      },
    },
    done: { type: 'final' },
  },
});
```

### Declaring Actors (Services)

Actors are declared with `fromPromise`, `fromCallback`, `fromObservable`, or other machine references:

```typescript
import { setup, fromPromise, assign } from 'xstate';

const machine = setup({
  actors: {
    fetchUser: fromPromise<User, { userId: string }>(async ({ input }) => {
      const response = await fetch(`/api/users/${input.userId}`);
      return response.json();
    }),
  },
}).createMachine({
  initial: 'loading',
  context: { user: null as User | null, userId: '42' },
  states: {
    loading: {
      invoke: {
        src: 'fetchUser',                                    // string ref
        input: ({ context }) => ({ userId: context.userId }),  // dynamic input
        onDone: {
          target: 'success',
          actions: assign({
            user: ({ event }) => event.output,  // typed as User
          }),
        },
        onError: { target: 'failure' },
      },
    },
    success: {},
    failure: {},
  },
});
```

---

## 2. Persistence and Restoration

XState v5 distinguishes between runtime snapshots and serializable persisted snapshots. [HIGH -- Context7 official docs + Stately blog]

### `getSnapshot()` vs `getPersistedSnapshot()`

| Method                     | Includes Transient Data | Serializable | Use Case            |
|----------------------------|------------------------|--------------|---------------------|
| `getSnapshot()`            | Yes                    | No           | Runtime inspection  |
| `getPersistedSnapshot()`   | No                     | Yes          | Storage/restoration |

`getPersistedSnapshot()` strips `invoke`, `tags`, `actorMap`, `history` -- keeps only `value`, `context`, and `status`.

### Persist and Restore Pattern

```typescript
import { createActor } from 'xstate';

// --- Persist ---
const actor = createActor(machine);
actor.start();
actor.send({ type: 'INCREMENT' });

const persisted = actor.getPersistedSnapshot();
const json = JSON.stringify(persisted);
// store json in localStorage, DB, file, etc.

// --- Restore ---
const restored = JSON.parse(json);
const restoredActor = createActor(machine, {
  snapshot: restored,   // pass persisted snapshot
});
restoredActor.start();  // resumes at persisted state
```

### Auto-Persist via Subscription

```typescript
const actor = createActor(machine);

actor.subscribe(() => {
  localStorage.setItem(
    'machine-state',
    JSON.stringify(actor.getPersistedSnapshot()),
  );
});

actor.start();
```

### Deep Persistence (Child Actors)

Invoked child actors are also persisted when using `getPersistedSnapshot()`. On restore, XState re-creates child actors from the persisted state automatically. [HIGH -- Context7 blog post on xstate-v5]

```typescript
const machine = setup({
  actors: {
    counter: fromTransition(/* ... */),
  },
}).createMachine({
  invoke: {
    src: 'counter',
    id: 'someCounter',  // child actor is persisted too
  },
});

const persisted = actor.getPersistedSnapshot();
// persisted includes child actor state

const restored = createActor(machine, { snapshot: persisted });
restored.start(); // child actor also restored
```

### Non-JSON Context

If context contains non-serializable values (Date, Map, etc.), implement custom serialization:

```typescript
function persist(actor) {
  const snapshot = actor.getPersistedSnapshot();
  return JSON.stringify({
    ...snapshot,
    context: {
      ...snapshot.context,
      lastUpdated: snapshot.context.lastUpdated.toISOString(),
    },
  });
}

function restore(json) {
  const snapshot = JSON.parse(json);
  snapshot.context.lastUpdated = new Date(snapshot.context.lastUpdated);
  return snapshot;
}
```

---

## 3. State Metadata (`meta`)

Static metadata can be attached to any state node via the `meta` property. Accessed at runtime via `snapshot.getMeta()`. [HIGH -- Context7 official docs]

### Attaching Metadata

```typescript
const machine = setup({}).createMachine({
  initial: 'loading',
  states: {
    loading: {
      meta: {
        message: 'Loading data...',
        icon: 'spinner',
      },
    },
    success: {
      meta: {
        message: 'Data loaded',
        icon: 'checkmark',
      },
    },
    error: {
      meta: {
        message: 'Failed to load',
        icon: 'alert',
        retryable: true,
      },
    },
  },
});
```

### Accessing Metadata at Runtime

```typescript
const actor = createActor(machine);
actor.start();

const snapshot = actor.getSnapshot();
const meta = snapshot.getMeta();
// => { 'machine.loading': { message: 'Loading data...', icon: 'spinner' } }
```

`getMeta()` returns an object keyed by fully-qualified state node IDs (e.g., `machineId.stateName`) with their metadata values.

### Use Cases

- UI rendering hints (progress messages, icons)
- Phase descriptions for pipeline machines
- Documentation generation
- Test assertions on state semantics

---

## 4. `invoke` for Async Services

The `invoke` property on a state node starts an actor when that state is entered and stops it when exited. [HIGH -- Context7 official docs]

### `fromPromise` -- One-Shot Async

```typescript
import { setup, fromPromise, assign } from 'xstate';

interface User { id: string; name: string; }

const fetchUser = fromPromise<User, { userId: string }>(
  async ({ input }) => {
    const res = await fetch(`/api/users/${input.userId}`);
    return res.json();
  }
);

const machine = setup({
  actors: { fetchUser },
}).createMachine({
  states: {
    loading: {
      invoke: {
        src: 'fetchUser',
        input: ({ context }) => ({ userId: context.userId }),
        onDone: {
          target: 'success',
          actions: assign({ user: ({ event }) => event.output }),
        },
        onError: {
          target: 'error',
          actions: assign({ error: ({ event }) => event.error }),
        },
      },
    },
  },
});
```

**Key:** `fromPromise<TOutput, TInput>` -- `TOutput` types `event.output` in `onDone`, `TInput` types the `input` property.

### `fromCallback` -- Long-Running with Bidirectional Communication

```typescript
import { fromCallback } from 'xstate';

const listenLogic = fromCallback<EventObject, { interval: number }>(
  ({ sendBack, receive, input }) => {
    const id = setInterval(() => {
      sendBack({ type: 'TICK' });
    }, input.interval);

    receive((event) => {
      if (event.type === 'PAUSE') clearInterval(id);
    });

    return () => clearInterval(id);  // cleanup on stop
  }
);
```

- `sendBack`: send events to parent
- `receive`: listen for events from parent
- Return cleanup function

### `fromObservable` -- Stream-Based

```typescript
import { fromObservable } from 'xstate';
import { interval } from 'rxjs';

const timerLogic = fromObservable(({ input }: { input: { ms: number } }) => {
  return interval(input.ms);
});

// In machine config:
invoke: {
  src: 'timer',
  input: { ms: 1000 },
  onSnapshot: {
    actions: ({ event }) => console.log(event.snapshot.context),
    // logs 0, 1, 2, 3, ...
  },
}
```

### Multiple Concurrent Invocations

```typescript
states: {
  checking: {
    invoke: [
      { src: 'checkA', onDone: /* ... */ },
      { src: 'checkB', onDone: /* ... */ },
      { src: 'checkC', onDone: /* ... */ },
    ],
  },
}
```

### Invoke Input Resolution

The `input` property on `invoke` is a function receiving `{ context, event }`:

```typescript
invoke: {
  src: 'fetchData',
  input: ({ context, event }) => ({
    endpoint: context.apiUrl,
    query: event.searchTerm,
  }),
}
```

---

## 5. TypeScript Best Practices

### Type Declaration in `setup()`

All types go in the `types` property using `{} as T` casting pattern: [HIGH -- Context7 official docs]

```typescript
const machine = setup({
  types: {
    context: {} as {
      count: number;
      user: User | null;
    },
    events: {} as
      | { type: 'INCREMENT' }
      | { type: 'SET_USER'; user: User },
    input: {} as {
      initialCount: number;
    },
  },
  // ...
}).createMachine({
  context: ({ input }) => ({
    count: input.initialCount,  // typed
    user: null,
  }),
  // ...
});
```

Alternative concise form (cast entire `types` object):

```typescript
setup({
  types: {} as {
    context: { count: number };
    events: { type: 'inc' } | { type: 'dec' };
    input: { startAt: number };
  },
})
```

### Type Helpers

```typescript
import { type SnapshotFrom, type EventFromLogic, type ActorRefFrom } from 'xstate';

type MySnapshot = SnapshotFrom<typeof machine>;     // full snapshot type
type MyEvent = EventFromLogic<typeof machine>;       // union of all events
type MyActorRef = ActorRefFrom<typeof machine>;      // typed actor reference
```

### `assertEvent` for Event Narrowing

When inside an action or guard where the event type is a union, narrow it:

```typescript
import { assertEvent } from 'xstate';

const machine = setup({
  types: {
    events: {} as
      | { type: 'greet'; message: string }
      | { type: 'submit' },
  },
}).createMachine({
  states: {
    someState: {
      entry: ({ event }) => {
        assertEvent(event, 'greet');
        console.log(event.message);  // now typed as string
      },
    },
  },
});
```

### Typing `fromPromise` Actors

Explicit generics for input/output:

```typescript
const fetchUser = fromPromise<User, { userId: string }>(
  async ({ input }) => {
    // input typed as { userId: string }
    const res = await fetch(`/api/users/${input.userId}`);
    return res.json(); // output typed as User
  }
);
```

### Stubbing Actors for Later `provide()`

When the real implementation is injected at runtime:

```typescript
setup({
  actors: {
    fetchData: fromPromise<Item[], { query: string }>(async () => {
      throw new Error('Not implemented -- override via provide()');
    }),
  },
})
```

### Type-Bound Action Helpers (v5.22.0+)

```typescript
const machineSetup = setup({
  types: {
    context: {} as { count: number },
    events: {} as { type: 'increment' } | { type: 'reset' },
  },
});

const logCount = machineSetup.createAction(({ context, event }) => {
  console.log(`Count: ${context.count}, Event: ${event.type}`);
});

const increment = machineSetup.assign({
  count: ({ context }) => context.count + 1,
});

const machine = machineSetup.createMachine({
  context: { count: 0 },
  on: {
    increment: { actions: [logCount, increment] },
  },
});
```

### Requirements

- TypeScript >= 5.0 required for `setup()` inference [HIGH]
- `strict: true` recommended in tsconfig

---

## 6. Testing XState v5 Machines

The recommended pattern is **Arrange, Act, Assert** using `createActor`, `send`, `getSnapshot`. [HIGH -- Context7 official testing docs]

### Basic State Transition Test

```typescript
import { setup, createActor, assign } from 'xstate';
import { test, expect } from 'vitest';

test('actor transitions correctly', () => {
  const toggleMachine = setup({}).createMachine({
    initial: 'inactive',
    context: { count: 0 },
    states: {
      inactive: {
        on: {
          activate: {
            target: 'active',
            actions: assign({ count: ({ context }) => context.count + 1 }),
          },
        },
      },
      active: {
        on: { deactivate: 'inactive' },
      },
    },
  });

  const actor = createActor(toggleMachine);
  actor.start();

  expect(actor.getSnapshot().value).toBe('inactive');
  expect(actor.getSnapshot().context.count).toBe(0);

  actor.send({ type: 'activate' });

  expect(actor.getSnapshot().value).toBe('active');
  expect(actor.getSnapshot().context.count).toBe(1);
});
```

### Testing Guards

Use `provide()` to set initial context for guard testing:

```typescript
test('guard prevents transition when count < 5', () => {
  const actor = createActor(machine);
  actor.start();
  actor.send({ type: 'NEXT' });
  expect(actor.getSnapshot().value).toBe('waiting');  // guard blocked
});

test('guard allows transition when count >= 5', () => {
  // Override context for test
  const testMachine = machine.provide({});
  // Alternative: create machine with input that sets count >= 5
});
```

### Mocking Actors with `provide()`

```typescript
test('handles fetch failure', async () => {
  const failingFetch = fromPromise(async () => {
    throw new Error('Network error');
  });

  const testMachine = machine.provide({
    actors: {
      fetchUser: failingFetch,  // mock replaces real actor
    },
  });

  const actor = createActor(testMachine);
  actor.start();

  // Wait for promise to settle
  await new Promise(resolve => setTimeout(resolve, 0));

  expect(actor.getSnapshot().value).toBe('error');
});
```

### Mocking Actions

```typescript
test('mocking actions', () => {
  const mockLogger = vi.fn();

  const machine = setup({
    actions: {
      logMessage: mockLogger,
    },
  }).createMachine({
    initial: 'idle',
    states: {
      idle: {
        on: {
          start: {
            target: 'running',
            actions: { type: 'logMessage', params: { message: 'Started!' } },
          },
        },
      },
      running: {},
    },
  });

  const actor = createActor(machine);
  actor.start();
  actor.send({ type: 'start' });

  expect(actor.getSnapshot().value).toBe('running');
  expect(mockLogger).toHaveBeenCalledWith(
    expect.anything(),          // action meta
    { message: 'Started!' },    // params
  );
});
```

### `waitFor` Utility

For async operations, `waitFor` waits until a predicate matches the actor's snapshot:

```typescript
import { waitFor } from 'xstate';

test('reaches success state after fetch', async () => {
  const actor = createActor(machine);
  actor.start();
  actor.send({ type: 'FETCH' });

  const snapshot = await waitFor(
    actor,
    (snapshot) => snapshot.matches('success'),
    { timeout: 5_000 },
  );

  expect(snapshot.context.data).toBeDefined();
});
```

### Testing Final States

```typescript
test('reaches final state', async () => {
  const actor = createActor(machine);
  actor.start();
  actor.send({ type: 'COMPLETE' });

  const snapshot = await waitFor(
    actor,
    (s) => s.status === 'done',
  );

  expect(snapshot.output).toEqual({ result: 42 });
});
```

### `toPromise` for Simple Async Tests

```typescript
import { toPromise } from 'xstate';

test('machine produces output', async () => {
  const actor = createActor(machine);
  actor.start();
  actor.send({ type: 'GO' });

  const output = await toPromise(actor);
  expect(output).toEqual({ count: 42 });
});
```

### `provide()` vs `setup()` for Testing

| Aspect     | `setup()`                        | `provide()`                        |
|------------|----------------------------------|------------------------------------|
| Timing     | At machine creation              | After machine creation             |
| Type safety| Enforces all implementations     | Does NOT validate completeness     |
| Use case   | Default implementations + types  | Override for tests / runtime DI    |
| Returns    | Builder with `.createMachine()`  | New machine instance with overrides|

**Best practice:** Define real defaults in `setup()`, override specific pieces with `provide()` in tests.

---

## Common Pitfalls

1. **`provide()` does not enforce completeness** -- missing actor implementations are a runtime error, not a compile error. Always define stubs in `setup()`. [HIGH]

2. **`getSnapshot()` is not serializable** -- always use `getPersistedSnapshot()` for storage. [HIGH]

3. **`fromPromise` actors cannot receive events** -- they resolve or reject, that's it. Use `fromCallback` for bidirectional communication. [HIGH]

4. **`assign()` must return new objects** -- XState v5 uses immutable context updates. Don't mutate `context` directly. [HIGH]

5. **`input` replaces v4's `data` and `withContext()`** -- old patterns are removed. [HIGH]

6. **Event typing in actions** -- inside `entry`/`exit` actions, the event type is the union of all possible triggering events. Use `assertEvent()` to narrow. [MEDIUM]

7. **`invoke.input` is a function** -- it receives `({ context, event })`, not raw values. Static objects work but dynamic input requires the function form. [HIGH]

## SOTA vs Training

| Topic | Current (2026) | Potential Training Staleness |
|-------|----------------|------------------------------|
| `setup()` API | Stable since v5, no breaking changes | Training may still show v4 `createMachine` with 2nd arg |
| `provide()` | Available, but does not enforce completeness | May be presented as equivalent to v4's `withConfig()` |
| Type helpers | `SnapshotFrom`, `EventFromLogic`, `ActorRefFrom` stable | Training may reference v4's `InterpreterFrom` |
| `getPersistedSnapshot()` | Canonical for persistence | Training may show v4's `state.toJSON()` |
| `meta` access | `snapshot.getMeta()` | Training may show `state.meta` direct access (v4) |
| Testing | `createActor` + `waitFor` + `provide()` | Training may show v4's `interpret()` + `onTransition` |
| Type-bound helpers | Available since v5.22.0 | Training unlikely to know about `machineSetup.createAction()` |

## Don't Hand-Roll

- **State serialization** -- use `getPersistedSnapshot()`, don't write custom serializers for the machine state structure
- **Actor lifecycle** -- use `invoke` / `spawn`, don't manage start/stop manually
- **Type inference** -- use `setup()` types, don't write manual type annotations for snapshot/event types
- **Event assertion** -- use `assertEvent()`, don't write manual type guards
- **Async waiting in tests** -- use `waitFor()` / `toPromise()`, don't write manual setTimeout/poll loops

## Codebase Context

This project uses:
- **Runtime:** Bun with native TypeScript
- **Testing:** Bun test runner (compatible with vitest-like API)
- **No React** -- this is a CLI tool, so React-specific patterns (useActor, createActorContext) are irrelevant
- **Persistence needed** -- pipeline state must survive across CLI invocations (file-based, not localStorage)

## Recommendations

1. **Use `setup().createMachine()` exclusively** -- never use bare `createMachine()` with a 2nd argument
2. **Define all actors as stubs in `setup()`** even if they'll be overridden via `provide()` -- catches type errors at compile time
3. **Use `fromPromise<Output, Input>`** with explicit generics for all async actors -- don't rely on inference alone
4. **Persist via `getPersistedSnapshot()`** to JSON files for CLI state recovery between sessions
5. **Use `meta` on state nodes** for phase descriptions, display names, and UI hints
6. **Test with `createActor` + `send` + `getSnapshot`** -- the Arrange/Act/Assert pattern maps cleanly to Bun's test runner
7. **Use `waitFor` for async tests**, `toPromise` when testing machines with final states
8. **Use `provide()` in tests** to inject mock actors -- keeps production code clean

## Sources

- Stately official docs (`setup.mdx`, `actors.mdx`, `invoke.mdx`, `testing.mdx`, `persistence.mdx`, `typescript.mdx`, `promise-actors.mdx`, `migration.mdx`) via Context7 `/statelyai/docs` -- [HIGH]
- XState v5 source repo examples via Context7 `/statelyai/xstate/xstate@5.20.1` -- [HIGH]
- Stately blog: "XState v5" (2023-12-01), "Persisting State" (2023-10-02), "Migrating to v5" (2024-02-02) via Context7 -- [HIGH]
- Perplexity aggregated results from stately.ai/docs, mintlify mirrors, GitHub discussions -- [MEDIUM]
- `fromPromise` detailed API from stately.ai/docs/promise-actors -- [HIGH]
