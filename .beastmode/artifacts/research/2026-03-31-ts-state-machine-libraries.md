---
topic: TypeScript State Machine Libraries for CLI Tools
date: 2026-03-31
sources: 3+
---

# TypeScript State Machine Libraries — Research Summary

## XState v5 (Recommended for complex flows)

- **Size:** ~14 kB gzipped, tree-shakes to ~5-10 kB
- **API:** `setup({ actions, guards, actors }).createMachine(config)` — preferred over `provide()`
- **Hooks:** Full onEnter/onExit, guards, actions, invoke for async services
- **Separation:** Definition (pure config with string refs) vs implementation (action/guard functions)
- **Persistence:** `actor.getSnapshot()` → serialize → `createActor(machine, { snapshot })` to rehydrate
- **TypeScript:** First-class, compile-time exhaustive checking
- **Maintenance:** Very active, Stately.ai backed, 26k+ stars
- **CLI usage:** Works in Bun/Node, no React dependency, actor model for backend

## Robot3 (~1 kB gzipped)

- **Issue:** No state-level onEnter/onExit hooks — only transition-level actions
- **Issue:** Stalled maintenance (~6 months inactive)
- **Verdict:** Not suitable — lacks required hook surface

## ts-fsm / typescript-fsm

- Generics for states/events, async support
- Underdocumented, unclear maintenance
- No visualization, no hierarchical states

## Manual Discriminated Unions (0 deps)

- `type State = { type: 'idle' } | { type: 'loading' }` with exhaustive switch
- Full compile-time safety, zero bundle
- No tooling, no visualization, manual everything
- Best for < 8 states with simple transitions

## 2026 Consensus

- XState v5 remains dominant — no new challengers
- `setup()` API preferred over `provide()` — enforces completeness at construction
- CLI best practice: start with manual unions, graduate to XState when complexity justifies it
- General state management (Zustand, Jotai) is separate concern from FSM
