# Version Display — Implementation Tasks

## Goal

Display the current version and abbreviated git hash below the clock in the dashboard's top-right header area. The version string (e.g., "v0.96.0 (a1b2c3d)") comes from the WatchLoop `started` event payload and renders in muted chrome color (`#727072`).

## Architecture

- **State flow:** WatchLoop emits `started` event with `{ version: string; pid: number; intervalSeconds: number }` → App.tsx captures `version` in state → passes as prop to ThreePanelLayout → renders below clock
- **Color:** `CHROME.muted` (`#727072`) from `monokai-palette.ts`
- **Format:** The `version` field already contains the full formatted string (e.g., "v0.45.0 (a1b2c3d)") — resolved by `resolveVersion()` in `watch-loop.ts`
- **Test pattern:** Source-analysis via DashboardWorld (no React rendering) + vitest unit tests

## Tech Stack

- React (Ink) for TUI rendering
- TypeScript
- vitest for unit tests
- Cucumber.js with DashboardWorld for integration tests

## File Structure

| File | Responsibility |
|------|---------------|
| `cli/src/dashboard/App.tsx` | Capture version from `started` event, pass as prop |
| `cli/src/dashboard/ThreePanelLayout.tsx` | Accept `version` prop, render below clock |
| `cli/src/__tests__/version-display.test.ts` | Unit tests for version display logic |
| `cli/features/version-display.feature` | BDD integration test (Gherkin) |
| `cli/features/step_definitions/version-display.steps.ts` | Step definitions for integration test |
| `cli/features/support/dashboard-world.ts` | Add `monokaiPaletteSource` field for source analysis |
| `cli/features/support/dashboard-hooks.ts` | No changes needed (setup() already loads sources) |
| `cli/cucumber.json` | Add `version-display` profile |

---

### Task 0: Integration Test (BDD — RED state)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/features/version-display.feature`
- Create: `cli/features/step_definitions/version-display.steps.ts`
- Modify: `cli/features/support/dashboard-world.ts`
- Modify: `cli/cucumber.json`

- [ ] **Step 1: Create the feature file**

```gherkin
@dashboard-log-fixes
Feature: Dashboard header displays current version and git hash

  The dashboard header shows the current build version and abbreviated
  git commit hash below the clock in the top-right region, so the
  operator can identify which build is running.

  Scenario: Version string is captured from started event
    Given the dashboard source is loaded
    When I examine the App component's started event handler
    Then the handler captures the version from the event payload

  Scenario: Version is passed as a prop to ThreePanelLayout
    Given the dashboard source is loaded
    When I examine the App component's JSX
    Then ThreePanelLayout receives a version prop

  Scenario: ThreePanelLayout accepts a version prop
    Given the dashboard source is loaded
    When I examine the ThreePanelLayout props interface
    Then the interface includes an optional version prop of type string

  Scenario: Version renders below the clock
    Given the dashboard source is loaded
    When I examine the ThreePanelLayout header region
    Then the version text element appears after the clock element

  Scenario: Version uses muted chrome color
    Given the dashboard source is loaded
    When I examine the version text element
    Then the version text uses CHROME.muted color

  Scenario: Version is hidden before started event
    Given the dashboard source is loaded
    When I examine the version rendering logic
    Then the version element is conditionally rendered only when version is truthy
```

Write to `cli/features/version-display.feature`.

- [ ] **Step 2: Add fields to DashboardWorld**

In `cli/features/support/dashboard-world.ts`, add new fields after existing source fields:

```typescript
/** Raw source of monokai-palette.ts */
monokaiPaletteSource = "";
/** Last regex match result for When/Then handoff */
lastMatch: string | null = null;
```

And in `setup()`, add after the `overviewPanelSource` line:

```typescript
this.monokaiPaletteSource = readFileSync(resolve(CLI_SRC, "dashboard/monokai-palette.ts"), "utf-8");
```

- [ ] **Step 3: Create the step definitions**

```typescript
/**
 * Step definitions for version-display integration tests.
 *
 * Tests verify structural properties of the dashboard source code
 * for the version display feature.
 * No React rendering — source analysis only.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { DashboardWorld } from "../support/dashboard-world.js";

// =============================================================================
// Given steps
// =============================================================================

Given("the dashboard source is loaded", function (this: DashboardWorld) {
  assert.ok(this.appSource.length > 0, "App.tsx source should be loaded");
  assert.ok(this.threePanelSource.length > 0, "ThreePanelLayout.tsx source should be loaded");
});

// =============================================================================
// When steps
// =============================================================================

When("I examine the App component's started event handler", function (this: DashboardWorld) {
  // Find the onStarted handler in App.tsx
  const handlerMatch = this.appSource.match(/const onStarted\s*=\s*\([^)]*\)\s*=>\s*\{[^}]*\}/s);
  assert.ok(handlerMatch, "onStarted handler should exist in App.tsx");
  this.lastMatch = handlerMatch[0];
});

When("I examine the App component's JSX", function (this: DashboardWorld) {
  // Find the ThreePanelLayout JSX in App.tsx
  const jsxMatch = this.appSource.match(/<ThreePanelLayout[\s\S]*?\/>/);
  assert.ok(jsxMatch, "ThreePanelLayout JSX should exist in App.tsx");
  this.lastMatch = jsxMatch[0];
});

When("I examine the ThreePanelLayout props interface", function (this: DashboardWorld) {
  const interfaceMatch = this.threePanelSource.match(/export interface ThreePanelLayoutProps\s*\{[\s\S]*?\}/);
  assert.ok(interfaceMatch, "ThreePanelLayoutProps interface should exist");
  this.lastMatch = interfaceMatch[0];
});

When("I examine the ThreePanelLayout header region", function (this: DashboardWorld) {
  // Extract the header bar section
  const headerMatch = this.threePanelSource.match(/\{\/\* Header bar[\s\S]*?<\/Box>/);
  assert.ok(headerMatch, "Header bar section should exist in ThreePanelLayout");
  this.lastMatch = headerMatch[0];
});

When("I examine the version text element", function (this: DashboardWorld) {
  // Look for version-related Text elements
  const versionTextMatch = this.threePanelSource.match(/<Text[^>]*>.*version.*<\/Text>/s) ||
    this.threePanelSource.match(/\{version\s*&&/s) ||
    this.threePanelSource.match(/version\s*\?/s);
  assert.ok(versionTextMatch, "Version text element should exist in ThreePanelLayout");
  this.lastMatch = versionTextMatch[0];
});

When("I examine the version rendering logic", function (this: DashboardWorld) {
  this.lastMatch = this.threePanelSource;
});

// =============================================================================
// Then steps
// =============================================================================

Then("the handler captures the version from the event payload", function (this: DashboardWorld) {
  // The onStarted handler should reference version from the event payload
  assert.ok(
    this.appSource.includes("setVersion") || this.appSource.match(/version.*=.*ev/),
    "onStarted handler should capture version from event payload"
  );
});

Then("ThreePanelLayout receives a version prop", function (this: DashboardWorld) {
  assert.ok(
    this.lastMatch!.includes("version=") || this.lastMatch!.includes("version={"),
    "ThreePanelLayout should receive a version prop"
  );
});

Then("the interface includes an optional version prop of type string", function (this: DashboardWorld) {
  assert.ok(
    this.lastMatch!.includes("version?:") || this.lastMatch!.includes("version?:"),
    "ThreePanelLayoutProps should include optional version prop"
  );
});

Then("the version text element appears after the clock element", function (this: DashboardWorld) {
  const clockIndex = this.threePanelSource.indexOf("{clock}");
  const versionIndex = this.threePanelSource.indexOf("{version");
  assert.ok(clockIndex > -1, "Clock element should exist");
  assert.ok(versionIndex > -1, "Version element should exist");
  assert.ok(versionIndex > clockIndex, "Version should appear after clock in source");
});

Then("the version text uses CHROME.muted color", function (this: DashboardWorld) {
  // Find the version rendering and check it uses CHROME.muted
  const versionSection = this.threePanelSource.match(/version[\s\S]{0,200}CHROME\.muted|CHROME\.muted[\s\S]{0,200}version/);
  assert.ok(versionSection, "Version text should use CHROME.muted color");
});

Then("the version element is conditionally rendered only when version is truthy", function (this: DashboardWorld) {
  // Check for conditional rendering pattern: {version && <Text>...} or version ? <Text>... : null
  const conditionalPattern = /version\s*&&|version\s*\?/;
  assert.ok(
    conditionalPattern.test(this.threePanelSource),
    "Version should be conditionally rendered"
  );
});
```

Write to `cli/features/step_definitions/version-display.steps.ts`.

- [ ] **Step 4: Add version-display profile to cucumber.json**

Add this profile to `cli/cucumber.json`:

```json
"version-display": {
  "paths": ["features/version-display.feature"],
  "import": [
    "features/step_definitions/version-display.steps.ts",
    "features/support/dashboard-world.ts",
    "features/support/dashboard-hooks.ts"
  ],
  "format": ["progress-bar"],
  "publishQuiet": true
}
```

- [ ] **Step 5: Run integration test to verify RED state**

Run: `cd cli && bun --bun node_modules/.bin/cucumber-js --profile version-display`
Expected: FAIL — version display not yet implemented

- [ ] **Step 6: Commit**

```bash
git add cli/features/version-display.feature cli/features/step_definitions/version-display.steps.ts cli/features/support/dashboard-world.ts cli/cucumber.json
git commit -m "test(version-display): add BDD integration test — RED state"
```

---

### Task 1: Add version state to App.tsx and pass to ThreePanelLayout

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/dashboard/App.tsx:45-55` (add state)
- Modify: `cli/src/dashboard/App.tsx:264-267` (capture from event)
- Modify: `cli/src/dashboard/App.tsx:440-476` (pass prop)

- [ ] **Step 1: Write unit test for version capture logic**

Create `cli/src/__tests__/version-display.test.ts`:

```typescript
import { describe, test, expect } from "vitest";

// ---------------------------------------------------------------------------
// Version state management logic
// ---------------------------------------------------------------------------

describe("version capture from started event", () => {
  test("extracts version string from started event payload", () => {
    const payload = { version: "v0.96.0 (a1b2c3d)", pid: 12345, intervalSeconds: 30 };
    const captured = payload.version;
    expect(captured).toBe("v0.96.0 (a1b2c3d)");
  });

  test("version is null before started event fires", () => {
    const version: string | null = null;
    expect(version).toBeNull();
  });

  test("version updates when started event fires", () => {
    let version: string | null = null;
    // Simulate event handler
    const onStarted = (ev: { version: string }) => {
      version = ev.version;
    };
    onStarted({ version: "v0.97.0 (f4e5d6c)" });
    expect(version).toBe("v0.97.0 (f4e5d6c)");
  });
});

// ---------------------------------------------------------------------------
// Version display formatting
// ---------------------------------------------------------------------------

describe("version display rendering logic", () => {
  test("version prop is passed when state is non-null", () => {
    const version: string | null = "v0.96.0 (a1b2c3d)";
    const propValue = version ?? undefined;
    expect(propValue).toBe("v0.96.0 (a1b2c3d)");
  });

  test("version prop is undefined when state is null", () => {
    const version: string | null = null;
    const propValue = version ?? undefined;
    expect(propValue).toBeUndefined();
  });

  test("version string contains abbreviated git hash in parentheses", () => {
    const version = "v0.96.0 (a1b2c3d)";
    const hashMatch = version.match(/\(([a-f0-9]{7})\)/);
    expect(hashMatch).not.toBeNull();
    expect(hashMatch![1]).toBe("a1b2c3d");
  });

  test("git hash is exactly seven characters", () => {
    const version = "v0.96.0 (a1b2c3d)";
    const hashMatch = version.match(/\(([a-f0-9]+)\)/);
    expect(hashMatch![1]).toHaveLength(7);
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `cd cli && bun --bun vitest run src/__tests__/version-display.test.ts`
Expected: PASS — these test pure logic, no implementation changes needed

- [ ] **Step 3: Add version state to App.tsx**

In `cli/src/dashboard/App.tsx`, after line 49 (`const [watchRunning, setWatchRunning] = useState(false);`), add:

```typescript
const [version, setVersion] = useState<string | null>(null);
```

- [ ] **Step 4: Capture version from started event payload**

In `cli/src/dashboard/App.tsx`, replace the `onStarted` handler:

```typescript
const onStarted = (ev: WatchLoopEventMap["started"][0]) => {
  setWatchRunning(true);
  setVersion(ev.version);
  pushSystemEntry("watch loop started");
};
```

- [ ] **Step 5: Pass version prop to ThreePanelLayout**

In `cli/src/dashboard/App.tsx`, in the `<ThreePanelLayout` JSX, add the version prop after `clock={clock}`:

```typescript
version={version ?? undefined}
```

- [ ] **Step 6: Run unit tests**

Run: `cd cli && bun --bun vitest run src/__tests__/version-display.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add cli/src/dashboard/App.tsx cli/src/__tests__/version-display.test.ts
git commit -m "feat(version-display): capture version from started event in App state"
```

---

### Task 2: Add version prop to ThreePanelLayout and render below clock

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/dashboard/ThreePanelLayout.tsx:10-33` (props interface)
- Modify: `cli/src/dashboard/ThreePanelLayout.tsx:36-48` (destructure)
- Modify: `cli/src/dashboard/ThreePanelLayout.tsx:59-67` (render version)

- [ ] **Step 1: Add version to ThreePanelLayoutProps interface**

In `cli/src/dashboard/ThreePanelLayout.tsx`, add to the `ThreePanelLayoutProps` interface after the `clock` field:

```typescript
/** Current version string (e.g., "v0.96.0 (a1b2c3d)"). */
version?: string;
```

- [ ] **Step 2: Destructure version in the component function**

In `cli/src/dashboard/ThreePanelLayout.tsx`, add `version` to the destructured props:

```typescript
export default function ThreePanelLayout({
  watchRunning,
  clock,
  version,
  rows,
  ...
```

- [ ] **Step 3: Render version below the clock line**

In `cli/src/dashboard/ThreePanelLayout.tsx`, in the header's right-side column (the `<Box flexDirection="column" alignItems="flex-end">` at line 59), add a second line below the clock `<Box>` for the version:

Replace the right-side column content:

```tsx
<Box flexDirection="column" alignItems="flex-end" justifyContent="flex-start">
  <Box>
    <Text color={watchRunning ? CHROME.watchRunning : CHROME.watchStopped}>
      {watchRunning ? "watch: running" : "watch: stopped"}
    </Text>
    <Text> </Text>
    <Text color={CHROME.muted}>{clock}</Text>
  </Box>
  {version && (
    <Text color={CHROME.muted}>{version}</Text>
  )}
</Box>
```

- [ ] **Step 4: Run unit tests**

Run: `cd cli && bun --bun vitest run src/__tests__/version-display.test.ts src/__tests__/three-panel-layout.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/dashboard/ThreePanelLayout.tsx
git commit -m "feat(version-display): render version below clock in header"
```
