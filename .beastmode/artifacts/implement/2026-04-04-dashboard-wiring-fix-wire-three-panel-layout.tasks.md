# Wire Three-Panel Layout — Implementation Tasks

## Goal

Replace TwoColumnLayout with ThreePanelLayout in App.tsx, pass the `rows` prop, delete dead code and its tests, verify no regressions.

## Architecture

- **Layout switch**: Import swap in App.tsx — TwoColumnLayout → ThreePanelLayout
- **rows prop**: Already computed via `useTerminalSize()` at App.tsx:42, already passed in JSX at line 256 but TwoColumnLayout ignores it. ThreePanelLayout accepts it.
- **Prop compatibility**: ThreePanelLayout is a superset of TwoColumnLayout props — all existing props pass through unchanged.
- **Dead code**: TwoColumnLayout.tsx and its test file are the only deletions.

## Tech Stack

- Bun runtime, bun:test
- React 19 + Ink 6 (terminal UI)
- TypeScript, ESM (.js extensions in imports)

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `cli/src/dashboard/App.tsx` | Modify (lines 7, 253) | Import swap + component swap |
| `cli/src/dashboard/TwoColumnLayout.tsx` | Delete | Dead layout component |
| `cli/src/__tests__/two-column-layout.test.ts` | Delete | Tests for dead component |

---

## Task 1: Wire ThreePanelLayout into App.tsx

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dashboard/App.tsx:7,253`

- [x] **Step 1: Replace TwoColumnLayout import with ThreePanelLayout**

In `cli/src/dashboard/App.tsx`, line 7, change:

```typescript
import TwoColumnLayout from "./TwoColumnLayout.js";
```

to:

```typescript
import ThreePanelLayout from "./ThreePanelLayout.js";
```

- [x] **Step 2: Replace TwoColumnLayout JSX with ThreePanelLayout**

In `cli/src/dashboard/App.tsx`, line 253, change:

```tsx
    <TwoColumnLayout
```

to:

```tsx
    <ThreePanelLayout
```

And at the closing tag (line 276), change:

```tsx
    />
```

The closing tag is already a self-closing style (`/>`) — no change needed there. The `rows={rows}` prop is already passed at line 256. All other props are compatible.

- [x] **Step 3: Run tests to verify no regressions**

Run: `cd cli && bun test src/__tests__/app-integration.test.ts`
Expected: PASS — all 17 tests pass (these test pure data flow, not layout identity)

Run: `cd cli && bun test src/__tests__/three-panel-layout.test.ts`
Expected: PASS — ThreePanelLayout tests pass

- [x] **Step 4: Verify no remaining TwoColumnLayout imports in App.tsx**

Run: `grep -n "TwoColumnLayout" cli/src/dashboard/App.tsx`
Expected: No matches

- [x] **Step 5: Commit**

```bash
git add cli/src/dashboard/App.tsx
git commit -m "feat(dashboard): wire ThreePanelLayout into App.tsx"
```

---

## Task 2: Delete dead TwoColumnLayout code and tests

**Wave:** 1
**Depends on:** Task 1

**Files:**
- Delete: `cli/src/dashboard/TwoColumnLayout.tsx`
- Delete: `cli/src/__tests__/two-column-layout.test.ts`

- [x] **Step 1: Delete TwoColumnLayout component**

```bash
rm cli/src/dashboard/TwoColumnLayout.tsx
```

- [x] **Step 2: Delete TwoColumnLayout test file**

```bash
rm cli/src/__tests__/two-column-layout.test.ts
```

- [x] **Step 3: Verify no remaining imports of TwoColumnLayout across codebase**

Run: `grep -r "TwoColumnLayout" cli/src/`
Expected: Zero matches in source files

Run: `grep -r "from.*TwoColumnLayout" cli/src/`
Expected: Zero matches

- [x] **Step 4: Run full test suite**

Run: `cd cli && bash scripts/test.sh`
Expected: ALL test files passed — no regressions from deletion

- [x] **Step 5: Commit**

```bash
git add -u cli/src/dashboard/TwoColumnLayout.tsx cli/src/__tests__/two-column-layout.test.ts
git commit -m "chore(dashboard): delete dead TwoColumnLayout and its tests"
```
