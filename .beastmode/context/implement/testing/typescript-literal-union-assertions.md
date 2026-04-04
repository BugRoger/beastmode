# TypeScript Literal Union Assertions in Tests

## Context
During flashy-dashboard validation, `nyan-banner.test.ts` failed with a `toContain` overload mismatch on `NYAN_PALETTE` — a typed readonly tuple of 6 hex literal strings.

## Decision
When asserting membership in a TypeScript `readonly [LiteralA, LiteralB, ...]` tuple, widen the assertion target to `readonly string[]` and add an explicit `toBeDefined()` guard before the `toContain` call.

```typescript
// Fails: overload mismatch on literal union
expect(NYAN_PALETTE).toContain(result);

// Correct: widen type, guard first
expect(result).toBeDefined();
expect(NYAN_PALETTE as readonly string[]).toContain(result);
```

## Rationale
TypeScript's type narrowing in test matchers does not automatically widen `readonly [A, B, C, ...]` to `readonly string[]` for overload resolution. The `toBeDefined()` guard is necessary because `toContain` on `undefined` produces a misleading failure.

## Source
- .beastmode/artifacts/validate/2026-04-04-flashy-dashboard.md
