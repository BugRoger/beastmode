# Test Updates

**Goal:** Fix all test files that use the old Logger mock API (log/detail/trace) to use the new 4-level interface (info/debug/warn/error). Verify all logger-importing tests pass.

**Architecture:** The Logger interface exposes exactly 5 methods: `info`, `debug`, `warn`, `error`, `child`. The old methods `log`, `detail`, `trace` have been removed. Any test mock providing a Logger must match this interface.

**Tech Stack:** TypeScript, vitest, cli/src/

## File Structure

- Modify: `cli/src/__tests__/pipeline-runner.test.ts` — update nullLogger mock from old API to new 4-level API
- Modify: `cli/src/__tests__/early-issues.test.ts` — update nullLogger mock from old API to new 4-level API
- Modify: `cli/src/__tests__/sync-helper.test.ts` — update customLogger mock from old API to new 4-level API

## Tasks

### Task 1: Fix pipeline-runner.test.ts nullLogger mock

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/__tests__/pipeline-runner.test.ts:147-155` (nullLogger definition)

- [x] **Step 1: Update nullLogger to use new 4-level API**

Replace the old mock logger (lines 147-155):

```typescript
const nullLogger = {
  log: noop,
  detail: noop,
  debug: noop,
  trace: noop,
  warn: noop,
  error: noop,
  child: () => nullLogger,
} as any;
```

With the new 4-level API:

```typescript
const nullLogger = {
  info: noop,
  debug: noop,
  warn: noop,
  error: noop,
  child: () => nullLogger,
} as any;
```

- [x] **Step 2: Run pipeline-runner tests to verify they pass**

Run: `npx vitest run cli/src/__tests__/pipeline-runner.test.ts`
Expected: All tests PASS

- [x] **Step 3: Run full test suite to verify no regressions**

Run: `npx vitest run`
Expected: No new failures (pre-existing Bun-related failures are expected)

- [x] **Step 4: Commit**

```bash
git add cli/src/__tests__/pipeline-runner.test.ts
git commit -m "feat(test-updates): fix pipeline-runner nullLogger mock for 4-level API"
```

### Task 2: Fix early-issues.test.ts nullLogger mock

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/__tests__/early-issues.test.ts:23-31` (nullLogger definition)

- [x] **Step 1: Update nullLogger to use new 4-level API**

Replace old mock (lines 23-31):
```typescript
const nullLogger = {
  log: () => {},
  detail: () => {},
  debug: () => {},
  trace: () => {},
  warn: () => {},
  error: () => {},
  child: () => nullLogger,
} as any;
```

With:
```typescript
const nullLogger = {
  info: () => {},
  debug: () => {},
  warn: () => {},
  error: () => {},
  child: () => nullLogger,
} as any;
```

- [x] **Step 2: Run early-issues tests**

Run: `npx vitest run cli/src/__tests__/early-issues.test.ts`
Expected: Tests pass (pre-existing mockGhIssueCreate count failure is unrelated)

- [x] **Step 3: Commit**

```bash
git add cli/src/__tests__/early-issues.test.ts
git commit -m "feat(test-updates): fix early-issues nullLogger mock for 4-level API"
```

### Task 3: Fix sync-helper.test.ts customLogger mock

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/__tests__/sync-helper.test.ts:256-264` (customLogger definition)

- [x] **Step 1: Update customLogger to use new 4-level API**

Replace old mock (lines 256-264):
```typescript
const customLogger: any = {
  log: () => {},
  warn: (msg: string) => warnMessages.push(msg),
  error: () => {},
  debug: () => {},
  detail: () => {},
  trace: () => {},
  child: () => customLogger,
};
```

With:
```typescript
const customLogger: any = {
  info: () => {},
  warn: (msg: string) => warnMessages.push(msg),
  error: () => {},
  debug: () => {},
  child: () => customLogger,
};
```

- [x] **Step 2: Run sync-helper tests**

Run: `npx vitest run cli/src/__tests__/sync-helper.test.ts`
Expected: Pre-existing failures unrelated to logger mock

- [x] **Step 3: Commit**

```bash
git add cli/src/__tests__/sync-helper.test.ts
git commit -m "feat(test-updates): fix sync-helper customLogger mock for 4-level API"
```
