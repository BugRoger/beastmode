# feature-status Tasks

## Goal

When `buildTreeState` finds a skeleton-seeded feature node whose status is `"pending"` and a session exists that matches it by slug, upgrade the display status to `"in-progress"`. Non-pending statuses (`"completed"`, `"blocked"`) must not be overwritten. This is a runtime-only display change — no store persistence.

## Architecture

- **Source:** `cli/src/dashboard/hooks/use-dashboard-tree-state.ts` — `buildTreeState()` function
- **Test:** `cli/src/__tests__/build-tree-state.test.ts`
- **Types:** `cli/src/store/types.ts` (FeatureStatus), `cli/src/dashboard/tree-types.ts` (FeatureNode)

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/__tests__/build-tree-state.test.ts` | Modify | Add 3 unit tests for status upgrade logic |
| `cli/src/dashboard/hooks/use-dashboard-tree-state.ts` | Modify | Add status upgrade from "pending" to "in-progress" when session matches |

---

### Task 1: Add unit tests and implement status upgrade

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/__tests__/build-tree-state.test.ts`
- Modify: `cli/src/dashboard/hooks/use-dashboard-tree-state.ts:107-113`

- [x] **Step 1: Write failing tests**

Add three tests to `cli/src/__tests__/build-tree-state.test.ts` inside the existing describe block:

```typescript
test("skeleton feature with pending status upgrades to in-progress when session exists", () => {
  const epics = [
    mockEpic("auth", "implement", [
      mockFeature("login-flow", "pending", "auth"),
    ]),
  ];
  const sessions = [{ epicSlug: "auth", phase: "implement", featureSlug: "login-flow" }];
  const getEntries = () => [
    { timestamp: 1000, type: "text" as const, text: "working", seq: 0 },
  ];
  const state = buildTreeState(sessions, getEntries, undefined, undefined, epics);
  const auth = state.epics.find(e => e.slug === "auth")!;
  const loginFlow = auth.features.find(f => f.slug === "login-flow")!;
  expect(loginFlow.status).toBe("in-progress");
});

test("skeleton feature with non-pending status is NOT overwritten by session", () => {
  const epics = [
    mockEpic("auth", "implement", [
      mockFeature("login-flow", "completed", "auth"),
    ]),
  ];
  const sessions = [{ epicSlug: "auth", phase: "implement", featureSlug: "login-flow" }];
  const getEntries = () => [
    { timestamp: 1000, type: "text" as const, text: "working", seq: 0 },
  ];
  const state = buildTreeState(sessions, getEntries, undefined, undefined, epics);
  const auth = state.epics.find(e => e.slug === "auth")!;
  const loginFlow = auth.features.find(f => f.slug === "login-flow")!;
  expect(loginFlow.status).toBe("completed");
});

test("skeleton feature without matching session retains pending status", () => {
  const epics = [
    mockEpic("auth", "implement", [
      mockFeature("login-flow", "pending", "auth"),
    ]),
  ];
  const state = buildTreeState([], () => [], undefined, undefined, epics);
  const auth = state.epics.find(e => e.slug === "auth")!;
  const loginFlow = auth.features.find(f => f.slug === "login-flow")!;
  expect(loginFlow.status).toBe("pending");
});
```

- [x] **Step 2: Run tests to verify they fail**

Run: `bun --bun vitest run cli/src/__tests__/build-tree-state.test.ts`
Expected: First test FAILS (status is "pending", expected "in-progress"). Other two pass.

- [x] **Step 3: Implement the status upgrade**

In `cli/src/dashboard/hooks/use-dashboard-tree-state.ts`, inside the session loop where a matching feature node is found (around line 109), add the status upgrade:

```typescript
    if (session.featureSlug) {
      // Find or create feature node
      let feature = epic.features.find((f) => f.slug === session.featureSlug);
      if (!feature) {
        feature = { slug: session.featureSlug, status: "in-progress", entries: [] };
        epic.features.push(feature);
      } else if (feature.status === "pending") {
        feature.status = "in-progress";
      }
      feature.entries.push(...treeEntries);
      feature.entries.sort((a, b) => a.timestamp - b.timestamp || a.seq - b.seq);
    }
```

- [x] **Step 4: Run tests to verify they pass**

Run: `bun --bun vitest run cli/src/__tests__/build-tree-state.test.ts`
Expected: ALL tests PASS

- [x] **Step 5: Run full test suite**

Run: `bun --bun vitest run`
Expected: No regressions

- [x] **Step 6: Commit**

```bash
git add cli/src/__tests__/build-tree-state.test.ts cli/src/dashboard/hooks/use-dashboard-tree-state.ts
git commit -m "feat(feature-status): upgrade pending features to in-progress when session exists"
```
