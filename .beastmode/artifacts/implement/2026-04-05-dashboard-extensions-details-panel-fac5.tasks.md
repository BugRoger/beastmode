# Details Panel — Implementation Tasks

## Goal

Wire the existing `DetailsPanel` component into the dashboard, replacing the old `OverviewPanel`. Rename the panel title from "OVERVIEW" to "DETAILS" in `ThreePanelLayout`. Compute `DetailsPanelSelection` from navigation state in `App.tsx` and pass scroll offset from the keyboard hook.

## Architecture

- **details-panel.ts** — Selection types and `resolveDetailsContent()` (already implemented)
- **DetailsPanel.tsx** — React component (already implemented)
- **overview-panel.ts** — Helper functions reused by details-panel.ts (keep)
- **OverviewPanel.tsx** — Old component (superseded by DetailsPanel.tsx)
- **ThreePanelLayout.tsx** — Panel title rename
- **App.tsx** — Wire DetailsPanel in place of OverviewPanel

## Tech Stack

- React 18 + Ink 5 (terminal UI)
- TypeScript (strict mode)
- Vitest for testing
- Bun runtime

## File Structure

- **Modify:** `cli/src/dashboard/ThreePanelLayout.tsx` — Change panel title from "OVERVIEW" to "DETAILS"
- **Modify:** `cli/src/dashboard/App.tsx` — Replace OverviewPanel with DetailsPanel, compute selection, pass scroll props
- **Modify:** `cli/src/__tests__/details-panel.integration.test.ts` — Fix the panel title test (import.meta.dir → __dirname compat)

---

### Task 0: Fix integration test (RED → runnable)

**Wave:** 0
**Depends on:** -

**Files:**
- Modify: `cli/src/__tests__/details-panel.integration.test.ts`

The integration test's panel title check uses `import.meta.dir` which is Bun-only. Under vitest (Node), it returns `undefined`. Fix to use `import.meta.url` with `fileURLToPath` for cross-runtime compatibility.

- [ ] **Step 1: Fix the panel title test to use cross-runtime path resolution**

In `cli/src/__tests__/details-panel.integration.test.ts`, replace the `import.meta.dir` usage:

```typescript
  test('Panel title is "DETAILS" not "OVERVIEW"', async () => {
    const { readFileSync } = await import("fs");
    const { resolve, dirname } = await import("path");
    const { fileURLToPath } = await import("url");
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const layoutPath = resolve(
      currentDir,
      "../dashboard/ThreePanelLayout.tsx",
    );
    const content = readFileSync(layoutPath, "utf-8");
    expect(content).toContain('title="DETAILS"');
    expect(content).not.toContain('title="OVERVIEW"');
  });
```

- [ ] **Step 2: Run test to verify it fails with expected assertion (not runtime error)**

Run: `npx vitest run cli/src/__tests__/details-panel.integration.test.ts`
Expected: FAIL — `title="DETAILS"` not found (because ThreePanelLayout still says "OVERVIEW")

- [ ] **Step 3: Commit**

```bash
git add cli/src/__tests__/details-panel.integration.test.ts
git commit -m "test(details-panel): fix integration test path resolution for vitest"
```

---

### Task 1: Rename panel title from OVERVIEW to DETAILS

**Wave:** 1
**Depends on:** Task 0

**Files:**
- Modify: `cli/src/dashboard/ThreePanelLayout.tsx`

- [ ] **Step 1: Change the panel title**

In `cli/src/dashboard/ThreePanelLayout.tsx` line 65, change:
```tsx
<PanelBox title="OVERVIEW" flexGrow={1}>
```
to:
```tsx
<PanelBox title="DETAILS" flexGrow={1}>
```

- [ ] **Step 2: Run integration test to verify panel title assertion passes**

Run: `npx vitest run cli/src/__tests__/details-panel.integration.test.ts`
Expected: The "Panel title is DETAILS not OVERVIEW" test PASSES. Others still pass.

- [ ] **Step 3: Commit**

```bash
git add cli/src/dashboard/ThreePanelLayout.tsx
git commit -m "feat(details-panel): rename panel title from OVERVIEW to DETAILS"
```

---

### Task 2: Wire DetailsPanel into App.tsx

**Wave:** 1
**Depends on:** Task 0

**Files:**
- Modify: `cli/src/dashboard/App.tsx`

- [ ] **Step 1: Replace OverviewPanel import with DetailsPanel**

In `cli/src/dashboard/App.tsx`:
- Remove: `import OverviewPanel from "./OverviewPanel.js";`
- Add: `import DetailsPanel from "./DetailsPanel.js";`
- Add: `import type { DetailsPanelSelection } from "./details-panel.js";`

- [ ] **Step 2: Compute DetailsPanelSelection from nav state**

After the `filteredEpics` computation (around line 134), add:

```typescript
  // --- Compute details panel selection from nav state ---
  const detailsSelection: DetailsPanelSelection =
    keyboard.nav.selectedIndex === 0
      ? { kind: "all" }
      : (() => {
          const epic = filteredEpics[keyboard.nav.selectedIndex - 1];
          return epic
            ? { kind: "epic", slug: epic.slug }
            : { kind: "all" };
        })();
```

- [ ] **Step 3: Reset details scroll on selection change**

After the `detailsSelection` computation, add an effect:

```typescript
  // Reset details scroll when selection changes
  const prevSelectionRef = useRef<string>("");
  const selectionKey = detailsSelection.kind === "all"
    ? "all"
    : detailsSelection.kind === "epic"
      ? `epic:${detailsSelection.slug}`
      : `feature:${detailsSelection.epicSlug}:${detailsSelection.featureSlug}`;
  useEffect(() => {
    if (selectionKey !== prevSelectionRef.current) {
      keyboard.resetDetailsScroll();
      prevSelectionRef.current = selectionKey;
    }
  }, [selectionKey]);
```

- [ ] **Step 4: Replace OverviewPanel with DetailsPanel in JSX**

Replace the `detailsSlot` prop in the `ThreePanelLayout` (around line 396):

From:
```tsx
      detailsSlot={
        <OverviewPanel
          epics={filteredEpics}
          activeSessions={activeSessions}
          gitStatus={gitStatus}
        />
      }
```

To:
```tsx
      detailsSlot={
        <DetailsPanel
          selection={detailsSelection}
          projectRoot={projectRoot}
          epics={filteredEpics}
          activeSessions={activeSessions.size}
          gitStatus={gitStatus}
          scrollOffset={keyboard.detailsScrollOffset}
          visibleHeight={Math.max(1, Math.floor((rows ?? 24) * 0.4 * 0.6) - 2)}
        />
      }
```

Note: `activeSessions` is a `Set<string>` in App.tsx but DetailsPanel expects `number`. Pass `.size`.
`visibleHeight` is approximate: 40% of rows (left column) × 60% (overview panel portion) minus 2 for border/title.

- [ ] **Step 5: Run the full integration test**

Run: `npx vitest run cli/src/__tests__/details-panel.integration.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add cli/src/dashboard/App.tsx
git commit -m "feat(details-panel): wire DetailsPanel into App replacing OverviewPanel"
```
