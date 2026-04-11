# prefix-resolution — Write Plan

## Goal

Add opt-in prefix matching to `resolveIdentifier()` so CLI users can type the human-readable portion of a collision-proof slug (e.g., `dashboard-redesign`) and have it resolve to the full slug (e.g., `dashboard-redesign-f3a7`). Internal callers retain exact-match semantics.

## Architecture

- **Resolution chain:** exact ID → exact slug → prefix slug (only when `allowPrefix: true`)
- **Prefix match:** scan all epic slugs where `slug.startsWith(identifier + "-")`. Single match → return. Multiple → ambiguity error. Zero → not-found.
- **CLI entry points:** Only `phaseCommand()` and `cancelEpic()` pass `allowPrefix: true`.
- **All other callers** (reconcile, scan, fan-out, watch loop) retain exact-match-only semantics via default `allowPrefix: false`.

## Tech Stack

- TypeScript, Bun runtime, vitest test framework
- Tests go in `cli/src/__tests__/` with vitest imports
- Source in `cli/src/store/resolve.ts` and `cli/src/commands/`

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/store/resolve.ts` | Modify | Add `allowPrefix` to `ResolveOptions`, implement prefix scan after slug match |
| `cli/src/store/resolve.test.ts` | Modify | Add prefix resolution unit tests (bun:test — existing file, outside vitest include) |
| `cli/src/__tests__/prefix-resolution.integration.test.ts` | Create | BDD integration test covering all Gherkin scenarios |
| `cli/src/commands/phase.ts` | Modify | Pass `allowPrefix: true` to `resolveIdentifier()` |
| `cli/src/commands/cancel-logic.ts` | Modify | Pass `allowPrefix: true` to `resolveIdentifier()` |

---

## Task 0: Integration Test (BDD)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/src/__tests__/prefix-resolution.integration.test.ts`

- [x] **Step 1: Write the integration test**

```typescript
/**
 * BDD integration test for CLI prefix resolution.
 *
 * @collision-proof-slugs @cli
 * Feature: CLI prefix resolution -- human-readable prefix resolves to full slug
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryTaskStore } from "../store/in-memory.js";
import { resolveIdentifier } from "../store/resolve.js";

describe("CLI prefix resolution", () => {
  let store: InMemoryTaskStore;

  beforeEach(() => {
    store = new InMemoryTaskStore();
    // Background: two epics with collision-proof slugs
    store.addEpic({ name: "Dashboard Redesign", slug: "dashboard-redesign-f3a7" });
    store.addEpic({ name: "Auth System", slug: "auth-system-b2c4" });
  });

  it("Exact slug match takes priority over prefix match", () => {
    const result = resolveIdentifier(store, "dashboard-redesign-f3a7");
    expect(result.kind).toBe("found");
    if (result.kind === "found") {
      expect(result.entity.slug).toBe("dashboard-redesign-f3a7");
    }
  });

  it("Prefix match resolves to full slug", () => {
    const result = resolveIdentifier(store, "dashboard-redesign", {
      allowPrefix: true,
    });
    expect(result.kind).toBe("found");
    if (result.kind === "found") {
      expect(result.entity.slug).toBe("dashboard-redesign-f3a7");
    }
  });

  it("Prefix match works with partial name", () => {
    const result = resolveIdentifier(store, "dashboard", {
      allowPrefix: true,
    });
    expect(result.kind).toBe("found");
    if (result.kind === "found") {
      expect(result.entity.slug).toBe("dashboard-redesign-f3a7");
    }
  });

  it("Ambiguous prefix match returns an error", () => {
    // Add a second dashboard-prefixed epic
    store.addEpic({ name: "Dashboard Metrics", slug: "dashboard-metrics-e5f6" });

    const result = resolveIdentifier(store, "dashboard", {
      allowPrefix: true,
    });
    expect(result.kind).toBe("ambiguous");
    if (result.kind === "ambiguous") {
      const slugs = result.matches.map((e) => e.slug).sort();
      expect(slugs).toContain("dashboard-redesign-f3a7");
      expect(slugs).toContain("dashboard-metrics-e5f6");
    }
  });

  it("Exact entity ID match takes priority over prefix", () => {
    // Look up by entity ID — should match by ID, not prefix
    const epics = store.listEpics();
    const target = epics.find((e) => e.slug === "dashboard-redesign-f3a7")!;
    const result = resolveIdentifier(store, target.id, {
      allowPrefix: true,
    });
    expect(result.kind).toBe("found");
    if (result.kind === "found") {
      expect(result.entity.id).toBe(target.id);
    }
  });

  it("Internal callers use exact match only (no prefix expansion)", () => {
    // Without allowPrefix, "dashboard-redesign" should NOT match "dashboard-redesign-f3a7"
    const result = resolveIdentifier(store, "dashboard-redesign");
    expect(result.kind).toBe("not-found");
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/prefix-resolution.integration.test.ts`
Expected: FAIL — `allowPrefix` is not a recognized option yet; at minimum the "Prefix match resolves to full slug" test will fail because `resolveIdentifier` ignores the unknown option and returns not-found.

---

## Task 1: Implement prefix matching in resolveIdentifier()

**Wave:** 1
**Depends on:** Task 0

**Files:**
- Modify: `cli/src/store/resolve.ts`

- [x] **Step 1: Add `allowPrefix` to ResolveOptions**

In `cli/src/store/resolve.ts`, add the `allowPrefix` field to the `ResolveOptions` interface:

```typescript
export interface ResolveOptions {
  /** When true, resolve feature IDs to their parent epic (for phase commands). */
  resolveToEpic?: boolean;
  /** When true, attempt prefix matching on epic slugs after exact match fails. CLI entry points only. */
  allowPrefix?: boolean;
}
```

- [ ] **Step 2: Implement prefix scan after slug matching**

In `cli/src/store/resolve.ts`, in the `resolveIdentifier()` function, add a prefix scan step after the existing slug matching (after the "No matches at all" check at line 82) but before the ambiguity/single-match handling. Replace the block from "No matches at all" through the end of the function:

```typescript
  // No matches at all — try prefix matching if opted in
  if (matches.length === 0) {
    if (options?.allowPrefix) {
      // Step 3: Prefix scan on epic slugs
      const prefixMatches: Entity[] = [];
      for (const epic of epics) {
        if (epic.slug.startsWith(identifier + "-")) {
          prefixMatches.push(epic);
        }
      }

      if (prefixMatches.length === 1) {
        let entity = prefixMatches[0];
        if (options?.resolveToEpic && entity.type === "feature") {
          const parent = store.getEpic(entity.parent);
          if (!parent) return { kind: "not-found" };
          entity = parent;
        }
        return { kind: "found", entity };
      }

      if (prefixMatches.length > 1) {
        return { kind: "ambiguous", matches: prefixMatches };
      }
    }

    return { kind: "not-found" };
  }

  // Ambiguity: identifier matches both an ID and a slug of different entities
  if (matches.length > 1) {
    return { kind: "ambiguous", matches };
  }

  // Single match — apply resolveToEpic if needed
  let entity = matches[0];

  if (options?.resolveToEpic && entity.type === "feature") {
    const parent = store.getEpic(entity.parent);
    if (!parent) {
      return { kind: "not-found" };
    }
    entity = parent;
  }

  return { kind: "found", entity };
```

- [ ] **Step 3: Update the module JSDoc comment**

Update the file header comment to reflect the new 4-step lookup:

```typescript
/**
 * ID resolution for phase commands.
 *
 * Three-step lookup (four with prefix matching):
 * 1. Try as entity ID — exact match on bm-xxxx pattern
 * 2. Try as slug — match on entity's slug field
 * 3. Try as prefix — match epic slugs starting with identifier + "-" (opt-in only)
 * 4. Return not-found (manifest fallback handled by caller)
 *
 * Detects ambiguity when an identifier matches both an ID and a slug
 * of different entities, or when a prefix matches multiple slugs.
 */
```

- [ ] **Step 4: Run integration test to verify it passes**

Run: `cd cli && bun --bun vitest run src/__tests__/prefix-resolution.integration.test.ts`
Expected: PASS — all 6 scenarios should be green.

- [ ] **Step 5: Commit**

```bash
git add cli/src/store/resolve.ts cli/src/__tests__/prefix-resolution.integration.test.ts
git commit -m "feat(prefix-resolution): add opt-in prefix matching to resolveIdentifier()"
```

---

## Task 2: Wire allowPrefix into CLI entry points

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/commands/phase.ts`
- Modify: `cli/src/commands/cancel-logic.ts`

- [ ] **Step 1: Add allowPrefix to phaseCommand()**

In `cli/src/commands/phase.ts`, on the line calling `resolveIdentifier()` (line 62), add `allowPrefix: true` to the options object:

```typescript
    const resolution = resolveIdentifier(taskStore, worktreeSlug, { resolveToEpic: true, allowPrefix: true });
```

- [ ] **Step 2: Add allowPrefix to cancelEpic()**

In `cli/src/commands/cancel-logic.ts`, on the line calling `resolveIdentifier()` (line 91), add `allowPrefix: true` to the options object:

```typescript
  const resolution = resolveIdentifier(taskStore, identifier, { resolveToEpic: true, allowPrefix: true });
```

- [ ] **Step 3: Run integration test to verify wiring doesn't break anything**

Run: `cd cli && bun --bun vitest run src/__tests__/prefix-resolution.integration.test.ts`
Expected: PASS — all scenarios still green.

- [ ] **Step 4: Run full test suite to check for regressions**

Run: `cd cli && bun --bun vitest run`
Expected: No new test failures beyond pre-existing ones.

- [ ] **Step 5: Commit**

```bash
git add cli/src/commands/phase.ts cli/src/commands/cancel-logic.ts
git commit -m "feat(prefix-resolution): wire allowPrefix into phaseCommand and cancelEpic"
```
