# Dead Code Cleanup — Tasks

## Goal

Remove `deduplicateSlug()`, `hashId()`, and `collectSlugs()` from the codebase. These functions supported hash-based slug deduplication which is being replaced by ordinal-based derivation. Since wave 1 (slug-derivation) hasn't landed yet, this task also patches `addFeature()` to stop calling the deleted functions — using `slugify()` directly for the slug, with ordinal appended from the feature ID.

## Architecture

- **slug.ts**: Remove `hashId()` (private) and `deduplicateSlug()` (exported). Keep `slugify()` and `isValidSlug()`.
- **in-memory.ts**: Remove `collectSlugs()` private method. Patch `addFeature()` to derive slug from `slugify(name) + "-" + ordinal` instead of calling `deduplicateSlug(slugify(name), id, collectSlugs())`.
- **index.ts**: Remove `deduplicateSlug` from the barrel re-export.
- **slug.test.ts**: Remove the `deduplicateSlug` describe block. Keep `slugify` and `isValidSlug` tests.

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/store/slug.ts` | Modify | Delete `hashId()` and `deduplicateSlug()` |
| `cli/src/store/in-memory.ts` | Modify | Delete `collectSlugs()`, patch `addFeature()` slug derivation |
| `cli/src/store/index.ts` | Modify | Remove `deduplicateSlug` from barrel export |
| `cli/src/store/slug.test.ts` | Modify | Remove `deduplicateSlug` test block |

---

### Task 1: Delete dead functions from slug.ts and clean barrel export

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/store/slug.ts:32-53`
- Modify: `cli/src/store/index.ts:25`

- [x] **Step 1: Delete `hashId()` and `deduplicateSlug()` from slug.ts**

Remove lines 32-53 from `cli/src/store/slug.ts`. The file should end after `slugify()` (line 30).

After edit, `slug.ts` should contain only:
```typescript
/**
 * Slug utilities for entity naming in the store module.
 */

/** Slug format: lowercase alphanumeric with optional hyphens, no leading/trailing hyphens */
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/**
 * Validate a string against the slug format.
 */
export function isValidSlug(input: string): boolean {
  return SLUG_PATTERN.test(input);
}

/**
 * Normalize a string to a valid slug.
 * Lowercases, replaces non-alphanumeric with hyphens, collapses multiple hyphens,
 * strips leading/trailing hyphens.
 */
export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (slug.length === 0) {
    throw new Error(`Cannot slugify empty or all-special-character input: "${input}"`);
  }
  return slug;
}
```

- [x] **Step 2: Remove `deduplicateSlug` from barrel export in index.ts**

In `cli/src/store/index.ts`, change line 25 from:
```typescript
export { slugify, isValidSlug, deduplicateSlug } from "./slug.js";
```
to:
```typescript
export { slugify, isValidSlug } from "./slug.js";
```

- [x] **Step 3: Run type check to verify no compile errors**

Run: `cd cli && bunx tsc --noEmit 2>&1 | head -30`
Expected: Errors about `deduplicateSlug` import in `in-memory.ts` and possibly `slug.test.ts` — these are expected and will be fixed in Tasks 2 and 3.

- [x] **Step 4: Commit**

```bash
git add cli/src/store/slug.ts cli/src/store/index.ts
git commit -m "feat(dead-code-cleanup): delete hashId() and deduplicateSlug() from slug module"
```

---

### Task 2: Patch addFeature() and delete collectSlugs() from in-memory.ts

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/store/in-memory.ts:16,55-63,147-150`

- [x] **Step 1: Update import to remove `deduplicateSlug`**

In `cli/src/store/in-memory.ts`, change line 16 from:
```typescript
import { slugify, deduplicateSlug } from "./slug.js";
```
to:
```typescript
import { slugify } from "./slug.js";
```

- [x] **Step 2: Delete `collectSlugs()` method**

Remove the `collectSlugs()` private method (lines 55-63):
```typescript
  /**
   * Collect all existing slugs from entities
   */
  private collectSlugs(): Set<string> {
    const slugs = new Set<string>();
    for (const entity of this.entities.values()) {
      if ("slug" in entity) {
        slugs.add(entity.slug);
      }
    }
    return slugs;
  }
```

- [x] **Step 3: Patch `addFeature()` to use ordinal-based slug derivation**

In `addFeature()`, replace the slug derivation block (lines 147-150):
```typescript
    const rawSlug = opts.slug ?? opts.name;
    const normalizedSlug = slugify(rawSlug);
    const existingSlugs = this.collectSlugs();
    const finalSlug = deduplicateSlug(normalizedSlug, id, existingSlugs);
```
with:
```typescript
    const rawSlug = opts.slug ?? opts.name;
    const normalizedSlug = slugify(rawSlug);
    const ordinal = id.split(".").pop()!;
    const finalSlug = `${normalizedSlug}-${ordinal}`;
```

This derives the feature slug as `{slugified-name}-{ordinal}` using the ordinal from the feature ID (e.g., `bm-a1b2.3` produces ordinal `3`, slug becomes `auth-flow-3`).

- [x] **Step 4: Run type check**

Run: `cd cli && bunx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to `in-memory.ts` (slug.test.ts may still error — fixed in Task 3).

- [x] **Step 5: Commit**

```bash
git add cli/src/store/in-memory.ts
git commit -m "feat(dead-code-cleanup): remove collectSlugs() and patch addFeature() to ordinal slugs"
```

---

### Task 3: Remove deduplicateSlug tests from slug.test.ts

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/store/slug.test.ts:1-2,62-89`

- [x] **Step 1: Remove `deduplicateSlug` import**

In `cli/src/store/slug.test.ts`, change line 2 from:
```typescript
import { slugify, isValidSlug, deduplicateSlug } from "./slug.js";
```
to:
```typescript
import { slugify, isValidSlug } from "./slug.js";
```

- [x] **Step 2: Delete the `deduplicateSlug` describe block**

Remove lines 62-89 (the entire `describe("deduplicateSlug", ...)` block).

- [x] **Step 3: Run tests to verify remaining tests pass**

Run: `cd cli && bun --bun vitest run src/store/slug.test.ts 2>&1`
Expected: PASS — `slugify` and `isValidSlug` tests still pass, no reference to `deduplicateSlug`.

- [x] **Step 4: Run the full store test suite**

Run: `cd cli && bun --bun vitest run src/store/ 2>&1`
Expected: All tests pass. No test depends on the deleted functions.

- [x] **Step 5: Commit**

```bash
git add cli/src/store/slug.test.ts
git commit -m "feat(dead-code-cleanup): remove deduplicateSlug tests"
```

---

### Task 4: Final verification — grep for any remaining references

**Wave:** 2
**Depends on:** Task 1, Task 2, Task 3

**Files:**
- Read-only: entire `cli/` directory

- [x] **Step 1: Grep for deduplicateSlug**

Run: `grep -r "deduplicateSlug" cli/ --include="*.ts" --include="*.js"`
Expected: No output (zero matches).

- [x] **Step 2: Grep for hashId function reference**

Run: `grep -r "hashId" cli/src/store/slug --include="*.ts"`
Expected: No output. (Note: `hashId` as a local variable in cucumber steps is unrelated — only checking slug module.)

- [x] **Step 3: Grep for collectSlugs**

Run: `grep -r "collectSlugs" cli/ --include="*.ts" --include="*.js"`
Expected: No output (zero matches).

- [x] **Step 4: Run full test suite**

Run: `cd cli && bun --bun vitest run 2>&1 | tail -20`
Expected: All tests pass.

- [x] **Step 5: Commit (no-op — verification only)**

No files changed. This task is verification-only.
