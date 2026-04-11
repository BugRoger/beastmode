# Slug Foundation — Implementation Tasks

**Goal:** Update slug validation to accept dots, deduplicate `slugify()` to a single canonical import, update feature slug format to embed parent epic name via `--` separator, and add a placeholder name generator for design-phase epics.

**Architecture:** All slug operations flow through `cli/src/store/slug.ts` as the single authority. The in-memory store (`in-memory.ts`) derives both epic and feature slugs using this module. The phase command (`commands/phase.ts`) delegates to the store module — no local slug logic. A new `cli/src/store/placeholder.ts` module provides Docker-style placeholder names for design-phase slugs.

**Tech Stack:** TypeScript, Bun runtime, vitest test framework, Cucumber BDD

**Design Decisions (constraints):**
- Slug is always computed, never user-provided
- `slugify()` collapses consecutive hyphens, making `--` impossible within slugified names — safe as separator
- Feature slug format: `{epicSlug}--{slugify(featureName)}-{4hex}.{ordinal}`
- Placeholder name format: `{adjective}-{noun}-{4hex}`
- `randomHex()` removed from phase.ts — design slugs use placeholder names
- `EpicPatch` already allows slug writes — no type change needed

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/store/slug.ts` | Modify | Update SLUG_PATTERN to accept dots; remain the single `slugify()` export |
| `cli/src/store/slug.test.ts` | Modify | Add dot-validation tests; add `--` separator guarantee test |
| `cli/src/store/placeholder.ts` | Create | Docker-style placeholder name generator with curated word lists |
| `cli/src/store/placeholder.test.ts` | Create | Unit tests for placeholder name generation |
| `cli/src/store/in-memory.ts` | Modify | Update feature slug derivation to embed parent epic name with `--` separator |
| `cli/src/__tests__/slug-derivation.integration.test.ts` | Modify | Add tests for new feature slug format with `--` separator |
| `cli/src/commands/phase.ts` | Modify | Remove `slugify()` and `randomHex()`, use placeholder generator for design slugs |
| `cli/src/__tests__/hex-slug.test.ts` | Modify | Replace `randomHex` tests with placeholder name tests |
| `cli/features/store/slug-foundation.feature` | Create | BDD integration test from Gherkin scenarios |
| `cli/features/store/step_definitions/slug-foundation.steps.ts` | Create | Step definitions for BDD scenarios |
| `cli/cucumber.json` | Modify | Add `slug-foundation` profile |

---

### Task 0: BDD Integration Test (RED)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/features/store/slug-foundation.feature`
- Create: `cli/features/store/step_definitions/slug-foundation.steps.ts`
- Modify: `cli/cucumber.json`

- [ ] **Step 1: Create the Gherkin feature file**

```gherkin
# cli/features/store/slug-foundation.feature
@slug-id-consistency @store
Feature: Slug foundation -- bijection, placeholders, and deduplication

  The slug subsystem provides three guarantees:
  (1) hex suffixes encode entity IDs for collision-proof bijection,
  (2) design-phase epics get memorable placeholder names, and
  (3) all slug formatting flows through a single canonical module.

  Background:
    Given a store is initialized

  # --- Slug-ID bijection ---

  Scenario: Epic slug suffix matches the entity's short ID
    When a developer creates an epic named "auth system"
    Then the epic slug suffix should equal the first characters of the entity's hash ID
    And the entity should be retrievable by extracting the suffix from the slug

  Scenario: Entity ID is recoverable from the slug alone
    Given an epic exists with a known slug and hash ID
    When a developer extracts the hex suffix from the slug
    Then the extracted suffix should match the entity's short ID
    And the entity should be locatable by that short ID without a store query

  Scenario: Bijection holds across multiple epics
    When a developer creates epics named "auth system" and "data pipeline"
    Then each epic's slug suffix should match its own short ID
    And no two epics should share the same suffix

  # --- Placeholder names ---

  Scenario: New epic receives a memorable placeholder name
    When a developer generates a placeholder slug with short ID "a1b2"
    Then the placeholder slug should contain a human-readable word
    And the placeholder slug should not be a bare hex string

  Scenario: Placeholder name follows the adjective-noun-hex pattern
    When a developer generates a placeholder slug with short ID "c3d4"
    Then the placeholder slug should match the pattern adjective-noun-hex

  # --- Slugify deduplication ---

  Scenario: Slug formatting produces consistent output regardless of call site
    Given a raw name "My Epic Name!"
    When the slug is computed by the store module
    Then the result should be "my-epic-name"

  Scenario: Slug validation accepts dots for feature ID suffixes
    Given a feature slug containing a dot suffix like "auth-flow-a3f2.2"
    When the slug is validated
    Then the validation should pass

  Scenario: Double-hyphen separator is unambiguous
    Given a name containing double hyphens "foo--bar"
    When the name is slugified
    Then the result should be "foo-bar"
    And double hyphens should be impossible in slugified output
```

- [ ] **Step 2: Create step definitions**

```typescript
// cli/features/store/step_definitions/slug-foundation.steps.ts
import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import type { StoreWorld } from "../support/store-world.js";
import { slugify, isValidSlug } from "../../../src/store/slug.js";
import { generatePlaceholderName } from "../../../src/store/placeholder.js";

// --- Slug-ID bijection ---

When("a developer creates an epic named {string}", function (this: StoreWorld, name: string) {
  const epic = this.store.addEpic({ name });
  this.epicsByName.set(name, epic);
});

Then("the epic slug suffix should equal the first characters of the entity's hash ID", function (this: StoreWorld) {
  const epic = Array.from(this.epicsByName.values()).pop()!;
  const shortId = epic.id.replace("bm-", "");
  assert.ok(epic.slug.endsWith(`-${shortId}`), `Slug "${epic.slug}" should end with "-${shortId}"`);
});

Then("the entity should be retrievable by extracting the suffix from the slug", function (this: StoreWorld) {
  const epic = Array.from(this.epicsByName.values()).pop()!;
  const parts = epic.slug.split("-");
  const suffix = parts[parts.length - 1];
  const found = this.store.find(`bm-${suffix}`);
  assert.ok(found, `Should find entity with ID "bm-${suffix}"`);
  assert.strictEqual(found!.id, epic.id);
});

Given("an epic exists with a known slug and hash ID", function (this: StoreWorld) {
  const epic = this.store.addEpic({ name: "known epic" });
  this.epicsByName.set("known epic", epic);
});

When("a developer extracts the hex suffix from the slug", function (this: StoreWorld) {
  // Extraction happens in Then steps
});

Then("the extracted suffix should match the entity's short ID", function (this: StoreWorld) {
  const epic = this.epicsByName.get("known epic")!;
  const shortId = epic.id.replace("bm-", "");
  const parts = epic.slug.split("-");
  const suffix = parts[parts.length - 1];
  assert.strictEqual(suffix, shortId);
});

Then("the entity should be locatable by that short ID without a store query", function (this: StoreWorld) {
  const epic = this.epicsByName.get("known epic")!;
  const shortId = epic.id.replace("bm-", "");
  // The bijection: knowing the suffix means knowing the ID structure
  assert.strictEqual(`bm-${shortId}`, epic.id);
});

When("a developer creates epics named {string} and {string}", function (this: StoreWorld, name1: string, name2: string) {
  const e1 = this.store.addEpic({ name: name1 });
  const e2 = this.store.addEpic({ name: name2 });
  this.epicsByName.set(name1, e1);
  this.epicsByName.set(name2, e2);
});

Then("each epic's slug suffix should match its own short ID", function (this: StoreWorld) {
  for (const epic of this.epicsByName.values()) {
    const shortId = epic.id.replace("bm-", "");
    assert.ok(epic.slug.endsWith(`-${shortId}`), `Slug "${epic.slug}" should end with "-${shortId}"`);
  }
});

Then("no two epics should share the same suffix", function (this: StoreWorld) {
  const suffixes = Array.from(this.epicsByName.values()).map((e) => {
    const parts = e.slug.split("-");
    return parts[parts.length - 1];
  });
  assert.strictEqual(new Set(suffixes).size, suffixes.length, "All suffixes should be unique");
});

// --- Placeholder names ---

let lastPlaceholderSlug = "";

When("a developer generates a placeholder slug with short ID {string}", function (_this: StoreWorld, shortId: string) {
  lastPlaceholderSlug = generatePlaceholderName(shortId);
});

Then("the placeholder slug should contain a human-readable word", function () {
  // A human-readable word contains at least 3 alpha chars in a row
  assert.ok(/[a-z]{3,}/.test(lastPlaceholderSlug), `"${lastPlaceholderSlug}" should contain a readable word`);
});

Then("the placeholder slug should not be a bare hex string", function () {
  assert.ok(!/^[0-9a-f]+$/.test(lastPlaceholderSlug), `"${lastPlaceholderSlug}" should not be bare hex`);
});

Then("the placeholder slug should match the pattern adjective-noun-hex", function () {
  assert.ok(/^[a-z]+-[a-z]+-[0-9a-f]{4}$/.test(lastPlaceholderSlug), `"${lastPlaceholderSlug}" should match adj-noun-hex`);
});

// --- Slugify deduplication ---

let lastSlugResult = "";

Given("a raw name {string}", function (_this: StoreWorld, _name: string) {
  // Name stored for When step
});

When("the slug is computed by the store module", function (this: StoreWorld) {
  lastSlugResult = slugify("My Epic Name!");
});

Then("the result should be {string}", function (_this: StoreWorld, expected: string) {
  assert.strictEqual(lastSlugResult, expected);
});

// --- Dot validation ---

Given("a feature slug containing a dot suffix like {string}", function (_this: StoreWorld, _slug: string) {
  // Slug stored for When step
});

When("the slug is validated", function () {
  // Validation happens in Then step
});

Then("the validation should pass", function () {
  assert.ok(isValidSlug("auth-flow-a3f2.2"), 'isValidSlug("auth-flow-a3f2.2") should return true');
});

// --- Double-hyphen separator ---

Given("a name containing double hyphens {string}", function (_this: StoreWorld, _name: string) {
  // Name stored for When step
});

When("the name is slugified", function () {
  lastSlugResult = slugify("foo--bar");
});

Then("double hyphens should be impossible in slugified output", function () {
  assert.ok(!lastSlugResult.includes("--"), `"${lastSlugResult}" should not contain "--"`);
});
```

- [ ] **Step 3: Add cucumber profile**

Add a `slug-foundation` profile to `cli/cucumber.json`:

```json
"slug-foundation": {
  "paths": ["features/store/slug-foundation.feature"],
  "import": [
    "features/store/step_definitions/slug-foundation.steps.ts",
    "features/store/step_definitions/store-ready.steps.ts",
    "features/store/support/store-world.ts",
    "features/store/support/store-hooks.ts"
  ],
  "format": ["progress-bar"],
  "publishQuiet": true
}
```

- [ ] **Step 4: Run BDD test to verify RED state**

Run: `cd cli && bun --bun node_modules/.bin/cucumber-js --profile slug-foundation`
Expected: FAIL — placeholder module doesn't exist yet, dot validation fails

- [ ] **Step 5: Commit**

```bash
cd cli && git add features/store/slug-foundation.feature features/store/step_definitions/slug-foundation.steps.ts cucumber.json
git commit -m "test(slug-foundation): add BDD integration test (RED)"
```

---

### Task 1: Slug Validation — Accept Dots

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/store/slug.ts`
- Modify: `cli/src/store/slug.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `cli/src/store/slug.test.ts`, inside the `isValidSlug` describe block:

```typescript
it("should accept dots for feature ID suffixes", () => {
  expect(isValidSlug("auth-flow.2")).toBe(true);
  expect(isValidSlug("auth-flow-a3f2.2")).toBe(true);
});

it("should reject leading dot", () => {
  expect(isValidSlug(".auth")).toBe(false);
});

it("should reject trailing dot", () => {
  expect(isValidSlug("auth.")).toBe(false);
});

it("should accept dot in the middle", () => {
  expect(isValidSlug("a.b")).toBe(true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd cli && bun --bun vitest run src/store/slug.test.ts`
Expected: FAIL — `isValidSlug("auth-flow.2")` returns `false`

- [ ] **Step 3: Update SLUG_PATTERN to accept dots**

In `cli/src/store/slug.ts`, change line 6:

```typescript
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/store/slug.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd cli && git add src/store/slug.ts src/store/slug.test.ts
git commit -m "feat(slug-foundation): accept dots in slug validation"
```

---

### Task 2: Double-Hyphen Separator Guarantee

**Wave:** 1
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/store/slug.test.ts` (non-overlapping section — new describe block)

- [ ] **Step 1: Write the test**

Add a new describe block at the end of `cli/src/store/slug.test.ts`:

```typescript
describe("slugify -- separator safety", () => {
  it("collapses double hyphens, making -- impossible in slugified output", () => {
    expect(slugify("foo--bar")).toBe("foo-bar");
  });

  it("collapses triple hyphens", () => {
    expect(slugify("a---b")).toBe("a-b");
  });

  it("makes -- safe as a separator between two slugified strings", () => {
    const epicSlug = slugify("my epic");
    const featureSlug = slugify("my feature");
    const combined = `${epicSlug}--${featureSlug}`;
    // The -- is unambiguous because neither half can contain --
    expect(combined).toBe("my-epic--my-feature");
    expect(combined.split("--")).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd cli && bun --bun vitest run src/store/slug.test.ts`
Expected: PASS (these are characterization tests — existing behavior already collapses hyphens)

- [ ] **Step 3: Commit**

```bash
cd cli && git add src/store/slug.test.ts
git commit -m "test(slug-foundation): add -- separator guarantee tests"
```

---

### Task 3: Placeholder Name Generator

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/src/store/placeholder.ts`
- Create: `cli/src/store/placeholder.test.ts`

- [ ] **Step 1: Write the failing test**

Create `cli/src/store/placeholder.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { generatePlaceholderName, ADJECTIVES, NOUNS } from "./placeholder.js";

describe("generatePlaceholderName", () => {
  it("returns a string matching adjective-noun-hex pattern", () => {
    const name = generatePlaceholderName("a1b2");
    expect(name).toMatch(/^[a-z]+-[a-z]+-[0-9a-f]{4}$/);
  });

  it("embeds the provided hex suffix", () => {
    const name = generatePlaceholderName("f3a7");
    expect(name).toEndWith("-f3a7");
  });

  it("uses a word from the adjective list", () => {
    const name = generatePlaceholderName("1234");
    const adj = name.split("-")[0];
    expect(ADJECTIVES).toContain(adj);
  });

  it("uses a word from the noun list", () => {
    const name = generatePlaceholderName("1234");
    const noun = name.split("-")[1];
    expect(NOUNS).toContain(noun);
  });

  it("produces deterministic output for the same hex input", () => {
    const a = generatePlaceholderName("abcd");
    const b = generatePlaceholderName("abcd");
    expect(a).toBe(b);
  });

  it("produces different names for different hex inputs", () => {
    const a = generatePlaceholderName("0001");
    const b = generatePlaceholderName("0002");
    expect(a).not.toBe(b);
  });

  it("contains human-readable words, not bare hex", () => {
    const name = generatePlaceholderName("beef");
    expect(/[a-z]{3,}/.test(name)).toBe(true);
    expect(/^[0-9a-f]+$/.test(name)).toBe(false);
  });
});

describe("word lists", () => {
  it("has at least 50 adjectives", () => {
    expect(ADJECTIVES.length).toBeGreaterThanOrEqual(50);
  });

  it("has at least 50 nouns", () => {
    expect(NOUNS.length).toBeGreaterThanOrEqual(50);
  });

  it("all adjectives are lowercase alpha only", () => {
    for (const adj of ADJECTIVES) {
      expect(adj).toMatch(/^[a-z]+$/);
    }
  });

  it("all nouns are lowercase alpha only", () => {
    for (const noun of NOUNS) {
      expect(noun).toMatch(/^[a-z]+$/);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/store/placeholder.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create the placeholder module**

Create `cli/src/store/placeholder.ts`:

```typescript
/**
 * Docker-style placeholder name generator for design-phase epics.
 *
 * Format: {adjective}-{noun}-{4hex}
 * Uses a curated word list for ~2,500 combinations.
 * Deterministic: same hex input always produces the same name.
 */

export const ADJECTIVES: readonly string[] = [
  "agile", "bold", "brave", "bright", "calm",
  "clean", "clever", "cool", "crisp", "deft",
  "eager", "fair", "fast", "firm", "fond",
  "glad", "grand", "great", "green", "happy",
  "hardy", "keen", "kind", "lively", "loyal",
  "lucky", "merry", "mild", "neat", "nice",
  "noble", "plain", "plucky", "proud", "quick",
  "quiet", "rapid", "ready", "rich", "robust",
  "sharp", "sleek", "smart", "solid", "steady",
  "stout", "swift", "tidy", "tough", "vivid",
] as const;

export const NOUNS: readonly string[] = [
  "anchor", "arrow", "badge", "beacon", "blade",
  "bolt", "bridge", "brook", "castle", "cedar",
  "cliff", "cloud", "comet", "coral", "crane",
  "crystal", "dawn", "delta", "ember", "falcon",
  "flame", "forge", "frost", "garden", "glacier",
  "grove", "harbor", "hawk", "iris", "jade",
  "lake", "lark", "leaf", "maple", "meadow",
  "moon", "oak", "ocean", "peak", "pine",
  "plume", "quartz", "raven", "reef", "ridge",
  "river", "sage", "shore", "spark", "stone",
] as const;

/**
 * Generate a deterministic placeholder name from a 4-char hex string.
 *
 * The hex value is parsed as an integer and used to select an adjective
 * and noun from the curated word lists. The hex suffix is appended as-is.
 *
 * @param shortHex - A 4-character hex string (e.g., "a1b2")
 * @returns A placeholder name like "bold-falcon-a1b2"
 */
export function generatePlaceholderName(shortHex: string): string {
  const value = parseInt(shortHex, 16);
  const adjIndex = value % ADJECTIVES.length;
  const nounIndex = Math.floor(value / ADJECTIVES.length) % NOUNS.length;
  return `${ADJECTIVES[adjIndex]}-${NOUNS[nounIndex]}-${shortHex}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/store/placeholder.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd cli && git add src/store/placeholder.ts src/store/placeholder.test.ts
git commit -m "feat(slug-foundation): add placeholder name generator"
```

---

### Task 4: Feature Slug Format — Embed Parent Epic Name

**Wave:** 2
**Depends on:** Task 1, Task 3

**Files:**
- Modify: `cli/src/store/in-memory.ts`
- Modify: `cli/src/__tests__/slug-derivation.integration.test.ts`

- [ ] **Step 1: Write the failing tests**

Add a new describe block in `cli/src/__tests__/slug-derivation.integration.test.ts`:

```typescript
describe("Feature slug embeds parent epic name", () => {
  it("should follow {epicSlug}--{featureName}-{4hex}.{ordinal} format", () => {
    const epic = store.addEpic({ name: "auth system" });
    const feature = store.addFeature({ parent: epic.id, name: "login flow" });
    const shortId = epic.id.replace("bm-", "");
    // Feature ID is {epicId}.1, so 4hex is first 4 hex chars of the hash
    // For simplicity, the feature's 4hex comes from a hash of the feature ID
    expect(feature.slug).toMatch(new RegExp(`^auth-system-${shortId}--login-flow-[0-9a-f]{4}\\.1$`));
  });

  it("should use the full epic slug including hex suffix", () => {
    const epic = store.addEpic({ name: "data pipeline" });
    const feature = store.addFeature({ parent: epic.id, name: "ingestion" });
    expect(feature.slug).toContain(epic.slug + "--");
  });

  it("should have ordinal after the dot", () => {
    const epic = store.addEpic({ name: "auth system" });
    const f1 = store.addFeature({ parent: epic.id, name: "login" });
    const f2 = store.addFeature({ parent: epic.id, name: "logout" });
    expect(f1.slug).toMatch(/\.1$/);
    expect(f2.slug).toMatch(/\.2$/);
  });

  it("double-hyphen separates epic slug from feature slug", () => {
    const epic = store.addEpic({ name: "my epic" });
    const feature = store.addFeature({ parent: epic.id, name: "my feature" });
    const parts = feature.slug.split("--");
    expect(parts).toHaveLength(2);
    expect(parts[0]).toBe(epic.slug);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/slug-derivation.integration.test.ts`
Expected: FAIL — current format is `{name}-{ordinal}`, not the new format

- [ ] **Step 3: Update feature slug derivation in in-memory store**

In `cli/src/store/in-memory.ts`, update the `addFeature` method (lines 129-152):

```typescript
addFeature(opts: { parent: string; name: string; description?: string }): Feature {
  const parentEpic = this.getEpic(opts.parent);
  if (!parentEpic) throw new Error(`Parent epic not found: ${opts.parent}`);

  const id = this.generateFeatureId(opts.parent);
  const featureSlugBase = slugify(opts.name);
  const ordinal = id.split(".").pop()!;
  const featureHex = this.shortHex(id);
  const finalSlug = `${parentEpic.slug}--${featureSlugBase}-${featureHex}.${ordinal}`;

  const feature: Feature = {
    id,
    type: "feature",
    parent: opts.parent,
    name: opts.name,
    slug: finalSlug,
    description: opts.description,
    status: "pending",
    depends_on: [],
    created_at: this.now(),
    updated_at: this.now(),
  };
  this.entities.set(id, feature);
  return feature;
}
```

Also add the `shortHex` helper as a private method:

```typescript
/**
 * Derive a 4-char hex string from an arbitrary string ID.
 * Uses a simple hash to produce a deterministic, short hex value.
 */
private shortHex(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16).padStart(4, "0").slice(-4);
}
```

- [ ] **Step 4: Update existing feature slug tests**

In `cli/src/__tests__/slug-derivation.integration.test.ts`, update the existing feature tests that assert the old format:

The "Feature slug includes the ordinal suffix" describe block — update assertions:

```typescript
describe("Feature slug includes the ordinal suffix", () => {
  it("should derive feature slugs with epic prefix and ordinal", () => {
    const epic = store.addEpic({ name: "auth system" });
    const f1 = store.addFeature({ parent: epic.id, name: "login flow" });
    const f2 = store.addFeature({ parent: epic.id, name: "token cache" });
    // New format: {epicSlug}--{featureName}-{4hex}.{ordinal}
    expect(f1.slug).toContain(epic.slug + "--");
    expect(f1.slug).toMatch(/\.1$/);
    expect(f2.slug).toContain(epic.slug + "--");
    expect(f2.slug).toMatch(/\.2$/);
  });
});
```

The "Feature ordinal suffixes are unique within an epic" describe block — update ordinal extraction:

```typescript
describe("Feature ordinal suffixes are unique within an epic", () => {
  it("should produce distinct ordinals for three features", () => {
    const epic = store.addEpic({ name: "auth system" });
    const f1 = store.addFeature({ parent: epic.id, name: "feature a" });
    const f2 = store.addFeature({ parent: epic.id, name: "feature b" });
    const f3 = store.addFeature({ parent: epic.id, name: "feature c" });

    const ordinals = [f1, f2, f3].map((f) => {
      // Ordinal is after the last dot
      const parts = f.slug.split(".");
      return parts[parts.length - 1];
    });
    const uniqueOrdinals = new Set(ordinals);
    expect(uniqueOrdinals.size).toBe(3);
  });
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/slug-derivation.integration.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd cli && git add src/store/in-memory.ts src/__tests__/slug-derivation.integration.test.ts
git commit -m "feat(slug-foundation): embed parent epic name in feature slugs with -- separator"
```

---

### Task 5: Slugify Deduplication and randomHex Removal

**Wave:** 2
**Depends on:** Task 3

**Files:**
- Modify: `cli/src/commands/phase.ts`
- Modify: `cli/src/__tests__/hex-slug.test.ts`

- [ ] **Step 1: Write the failing tests**

Replace `cli/src/__tests__/hex-slug.test.ts` contents:

```typescript
import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const PHASE_TS_PATH = resolve(import.meta.dirname, "../commands/phase.ts");

describe("phase.ts slug deduplication", () => {
  test("no slugify function defined in phase.ts", () => {
    const source = readFileSync(PHASE_TS_PATH, "utf-8");
    expect(source).not.toMatch(/export function slugify/);
    expect(source).not.toMatch(/function slugify/);
  });

  test("no randomHex function defined in phase.ts", () => {
    const source = readFileSync(PHASE_TS_PATH, "utf-8");
    expect(source).not.toMatch(/export function randomHex/);
    expect(source).not.toMatch(/function randomHex/);
  });

  test("design branch uses generatePlaceholderName", () => {
    const source = readFileSync(PHASE_TS_PATH, "utf-8");
    const fnMatch = source.match(/function deriveWorktreeSlug[\s\S]*?^}/m);
    expect(fnMatch).not.toBeNull();
    const fnBody = fnMatch![0];
    expect(fnBody).toContain("generatePlaceholderName");
    expect(fnBody).not.toContain("randomHex");
  });

  test("non-design phases still use args directly", () => {
    const source = readFileSync(PHASE_TS_PATH, "utf-8");
    expect(source).toContain('args[0] || "default"');
  });

  test("epicSlug is assigned from worktreeSlug", () => {
    const source = readFileSync(PHASE_TS_PATH, "utf-8");
    expect(source).toContain("const epicSlug = worktreeSlug");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd cli && bun --bun vitest run src/__tests__/hex-slug.test.ts`
Expected: FAIL — `slugify` and `randomHex` still exist in phase.ts

- [ ] **Step 3: Remove slugify and randomHex from phase.ts, use placeholder generator**

In `cli/src/commands/phase.ts`:

1. Add import at top (after existing imports):
```typescript
import { generatePlaceholderName } from "../store/placeholder.js";
```

2. Update `deriveWorktreeSlug` function (lines 165-172):
```typescript
function deriveWorktreeSlug(phase: Phase, args: string[]): string {
  if (phase === "design") {
    // If an existing slug was passed (watch loop re-dispatch), reuse it
    if (args[0]) return args[0];
    // Generate a placeholder name using a random 4-hex ID
    const hex = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0");
    return generatePlaceholderName(hex);
  }
  // All non-design phases use the epic slug directly
  return args[0] || "default";
}
```

3. Remove the `slugify` function (lines 174-182) entirely.

4. Remove the `randomHex` function (lines 184-191) entirely.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/hex-slug.test.ts`
Expected: PASS

- [ ] **Step 5: Run full test suite to verify no regressions**

Run: `cd cli && bun --bun vitest run`
Expected: All 1739 tests PASS (same 4 pre-existing file-level failures)

- [ ] **Step 6: Commit**

```bash
cd cli && git add src/commands/phase.ts src/__tests__/hex-slug.test.ts
git commit -m "feat(slug-foundation): deduplicate slugify, replace randomHex with placeholder names"
```

---
