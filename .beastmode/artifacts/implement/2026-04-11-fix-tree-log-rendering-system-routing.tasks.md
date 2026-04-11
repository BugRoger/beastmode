# system-routing — Write Plan

## Goal

Gate `systemRef.entries.push()` in DashboardSink.write() so that only entries without `context.epic` reach the SYSTEM leaf. Epic-scoped entries are already routed to FallbackEntryStore — no visibility is lost.

## Architecture Constraint

- SYSTEM routing: only push entries where `context.epic` is falsy to `systemRef.entries`
- Existing epic-scoped routing to FallbackEntryStore is unchanged

## Tech Stack

- TypeScript, vitest, Bun

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/dashboard/dashboard-sink.ts` | Modify | Add `!context.epic` guard before `systemRef.entries.push()` |
| `cli/src/__tests__/dashboard-sink.test.ts` | Modify | Update existing tests, add new routing gate test |

---

### Task 1: Add SYSTEM routing gate and update tests

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dashboard/dashboard-sink.ts:48-58`
- Modify: `cli/src/__tests__/dashboard-sink.test.ts`

- [x] **Step 1: Update test — "always pushes to systemRef entries" becomes routing-aware**

The existing test at line 86 ("always pushes to systemRef entries") asserts that an entry WITH `context.epic` goes to systemRef. After the fix, it should NOT. Update this test to verify the new routing: entry with epic context should NOT appear in systemRef.entries.

Also add a new test that entries WITHOUT epic context DO appear in systemRef.entries.

In `cli/src/__tests__/dashboard-sink.test.ts`, replace the test "always pushes to systemRef entries" (lines 86-99) with:

```typescript
  test("entry with epic context is excluded from systemRef entries", () => {
    const sink = new DashboardSink({ fallbackStore, systemRef });
    sink.write({
      level: "info",
      timestamp: 1000,
      msg: "hello",
      context: { epic: "e", phase: "p" },
    });

    expect(systemRef.entries).toHaveLength(0);
  });

  test("entry without epic context is pushed to systemRef entries", () => {
    const sink = new DashboardSink({ fallbackStore, systemRef });
    sink.write({
      level: "info",
      timestamp: 1000,
      msg: "hello",
      context: {},
    });

    expect(systemRef.entries).toHaveLength(1);
    expect(systemRef.entries[0].message).toBe("hello");
    expect(systemRef.entries[0].level).toBe("info");
    expect(systemRef.entries[0].seq).toBe(0);
  });
```

- [x] **Step 2: Update test — "systemRef entry includes epic prefix" now expects no entry**

The test "systemRef entry includes epic prefix when context has epic" (lines 101-111) asserts the prefix format on a systemRef entry. After the fix, entries with epic context won't reach systemRef at all. Replace this test:

```typescript
  test("entry with epic context does not reach systemRef (no prefix test needed)", () => {
    const sink = new DashboardSink({ fallbackStore, systemRef });
    sink.write({
      level: "info",
      timestamp: 1000,
      msg: "hello",
      context: { epic: "my-epic", phase: "plan" },
    });

    expect(systemRef.entries).toHaveLength(0);
  });
```

- [x] **Step 3: Update test — "receives all entries regardless of level" adjusts systemRef count**

The test "receives all entries regardless of level (no gating)" (lines 152-167) writes 4 entries all with epic context and asserts `systemRef.entries` has length 4. After the fix, systemRef should have 0 for these epic-scoped entries. Update the assertion:

```typescript
  test("receives all entries regardless of level (no gating on fallbackStore)", () => {
    const sink = new DashboardSink({ fallbackStore, systemRef });
    const levels = ["info", "debug", "warn", "error"] as const;
    for (const level of levels) {
      sink.write({
        level,
        timestamp: 1000,
        msg: `${level} msg`,
        context: { epic: "e", phase: "p" },
      });
    }

    const stored = fallbackStore.get("e", "p", undefined);
    expect(stored).toHaveLength(4);
    // Epic-scoped entries excluded from systemRef
    expect(systemRef.entries).toHaveLength(0);
  });
```

- [x] **Step 4: Run tests to verify they FAIL (RED state)**

Run: `cd cli && bun --bun vitest run src/__tests__/dashboard-sink.test.ts`
Expected: FAIL — the source still pushes all entries to systemRef

- [x] **Step 5: Implement the routing gate in DashboardSink.write()**

In `cli/src/dashboard/dashboard-sink.ts`, replace lines 48-58 (the unconditional systemRef push) with a conditional that only pushes when there's no epic context:

```typescript
    // Push to system entries only for non-epic-scoped entries
    if (!context.epic) {
      this.systemRef.entries.push({
        timestamp,
        level,
        message: msg,
        seq: this.systemRef.nextSeq(),
      });
    }
```

Note: the prefix construction (lines 50-52) is removed because entries reaching systemRef no longer have epic context, so the prefix would always be empty.

Also update the JSDoc comment at the top of the file (line 6) from "Pushes all entries to SystemEntryRef" to "Pushes non-epic entries to SystemEntryRef".

- [x] **Step 6: Run tests to verify they PASS (GREEN state)**

Run: `cd cli && bun --bun vitest run src/__tests__/dashboard-sink.test.ts`
Expected: PASS — all tests green

- [x] **Step 7: Commit**

```bash
git add cli/src/dashboard/dashboard-sink.ts cli/src/__tests__/dashboard-sink.test.ts
git commit -m "feat(system-routing): gate systemRef entries on !context.epic"
```
