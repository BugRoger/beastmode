# Strategy Dispatch — Implementation Tasks

## Goal

Make the dashboard command honor the configured `dispatch-strategy` from `.beastmode/config.yaml` instead of hardcoding SDK dispatch. Remove the broken `claude --print` CLI fallback from `dispatchPhase()`.

## Architecture

- Dashboard calls `selectStrategy()` (already exported from `watch.ts`) to resolve the factory
- Selected factory (SDK/cmux/iTerm2) is wired into `ReconcilingFactory` — same pattern as `watchCommand()`
- `dispatchPhase()` catch block (lines 240-284 in watch.ts) that spawns `Bun.spawn("claude", "--print", ...)` is deleted
- When SDK import fails, error propagates — the watch loop's existing error handling catches and retries on next scan

## Tech Stack

- Bun test runner (each file runs in own process via `scripts/test.sh`)
- TypeScript, no YAML frontmatter
- `mock.module()` for module-level mocks (per-process isolation)
- Dependency injection for `selectStrategy()` deps (`checkIterm2`, `checkCmux`)

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/commands/dashboard.ts` | Modify | Wire `selectStrategy()` + config-based factory selection |
| `cli/src/commands/watch.ts` | Modify | Delete CLI fallback catch block (lines 240-284) |
| `cli/src/__tests__/dashboard-strategy.test.ts` | Create | Unit tests for dashboard factory selection |
| `cli/src/__tests__/watch-dispatch.test.ts` | Modify | Add test: SDK import failure throws (no fallback) |

---

### Task 0: Dashboard strategy selection — tests

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/src/__tests__/dashboard-strategy.test.ts`

- [ ] **Step 1: Write test file for dashboard strategy selection**

```typescript
import { describe, test, expect, beforeEach, mock } from "bun:test";

// ---------- module-level mocks ----------

const mockSelectStrategy = mock(async (configured: string) => ({
  strategy: "sdk" as "iterm2" | "cmux" | "sdk",
  sessionId: undefined as string | undefined,
}));

const mockDispatchPhase = mock(async () => ({
  id: "test-id",
  worktreeSlug: "test-slug",
  promise: Promise.resolve({ success: true, exitCode: 0, costUsd: 0, durationMs: 100 }),
}));

// Mock ReconcilingFactory as a class that stores its inner factory
class MockReconcilingFactory {
  inner: any;
  resolved: any;
  constructor(inner: any, _projectRoot: string, _logger: any) {
    this.inner = inner;
  }
}

mock.module("../commands/watch.js", () => ({
  selectStrategy: mockSelectStrategy,
  dispatchPhase: mockDispatchPhase,
  ReconcilingFactory: MockReconcilingFactory,
}));

// Mock config loader
const mockLoadConfig = mock((_root: string) => ({
  github: { enabled: false },
  cli: { "dispatch-strategy": "sdk" as string | undefined },
  hitl: {},
  "file-permissions": {},
}));

mock.module("../config.js", () => ({
  loadConfig: mockLoadConfig,
}));

// Mock factory classes
class MockSdkSessionFactory {
  dispatchFn: any;
  constructor(dispatchFn: any) { this.dispatchFn = dispatchFn; }
}

class MockCmuxSessionFactory {
  client: any;
  constructor(client: any) { this.client = client; }
}

class MockITermSessionFactory {
  client: any;
  constructor(client: any) { this.client = client; }
}

mock.module("../dispatch/factory.js", () => ({
  SdkSessionFactory: MockSdkSessionFactory,
  SessionEmitter: class {},
}));

mock.module("../dispatch/cmux.js", () => ({
  CmuxSessionFactory: MockCmuxSessionFactory,
  CmuxClient: class {},
  cmuxAvailable: async () => false,
}));

mock.module("../dispatch/it2.js", () => ({
  ITermSessionFactory: MockITermSessionFactory,
  It2Client: class {},
  iterm2Available: async () => ({ available: false }),
  IT2_SETUP_INSTRUCTIONS: "",
}));

// Mock other imports dashboard.ts uses
mock.module("../logger.js", () => ({
  createLogger: () => ({
    log: () => {},
    warn: () => {},
    error: () => {},
  }),
}));

mock.module("./watch-loop.js", () => ({
  WatchLoop: class {
    constructor() {}
    start() { return Promise.resolve(); }
    stop() { return Promise.resolve(); }
    isRunning() { return false; }
  },
}));

mock.module("../manifest/store.js", () => ({
  listEnriched: async () => [],
}));

mock.module("../github/discovery.js", () => ({
  discoverGitHub: async () => null,
}));

// Prevent React/Ink rendering
mock.module("ink", () => ({
  render: () => ({ waitUntilExit: () => Promise.resolve() }),
}));

mock.module("react", () => ({
  default: { createElement: () => null },
  createElement: () => null,
}));

mock.module("../dashboard/App.js", () => ({
  default: () => null,
}));

// Mock node:fs for findProjectRoot
mock.module("node:fs", () => ({
  existsSync: (p: string) => p.includes(".beastmode"),
  readFileSync: () => "",
}));

// ---------- import after mocks ----------

import { dashboardCommand } from "../commands/dashboard.js";

// ---------- helpers ----------

function makeConfig(strategy?: string) {
  return {
    github: { enabled: false },
    cli: { "dispatch-strategy": strategy },
    hitl: {},
    "file-permissions": {},
  } as any;
}

// ---------- tests ----------

describe("dashboard strategy selection", () => {
  beforeEach(() => {
    mockSelectStrategy.mockClear();
    mockDispatchPhase.mockClear();
  });

  test("calls selectStrategy with config dispatch-strategy value", async () => {
    mockSelectStrategy.mockImplementation(async () => ({ strategy: "sdk" as const }));
    const config = makeConfig("cmux");
    await dashboardCommand(config, [], 0);

    expect(mockSelectStrategy).toHaveBeenCalledTimes(1);
    const [configuredArg] = mockSelectStrategy.mock.calls[0];
    expect(configuredArg).toBe("cmux");
  });

  test("defaults to 'sdk' when dispatch-strategy is undefined", async () => {
    mockSelectStrategy.mockImplementation(async () => ({ strategy: "sdk" as const }));
    const config = makeConfig(undefined);
    await dashboardCommand(config, [], 0);

    expect(mockSelectStrategy).toHaveBeenCalledTimes(1);
    const [configuredArg] = mockSelectStrategy.mock.calls[0];
    expect(configuredArg).toBe("sdk");
  });

  test("creates SdkSessionFactory when strategy is sdk", async () => {
    mockSelectStrategy.mockImplementation(async () => ({ strategy: "sdk" as const }));
    const config = makeConfig("sdk");
    await dashboardCommand(config, [], 0);

    // Verify ReconcilingFactory got an SdkSessionFactory as inner
    // The mock captures the constructor arg
    expect(mockSelectStrategy).toHaveBeenCalledTimes(1);
  });

  test("creates CmuxSessionFactory when strategy is cmux", async () => {
    mockSelectStrategy.mockImplementation(async () => ({ strategy: "cmux" as const }));
    const config = makeConfig("cmux");
    await dashboardCommand(config, [], 0);

    expect(mockSelectStrategy.mock.calls[0][0]).toBe("cmux");
  });

  test("creates ITermSessionFactory when strategy is iterm2", async () => {
    mockSelectStrategy.mockImplementation(async () => ({
      strategy: "iterm2" as const,
      sessionId: "w0t0p0:test",
    }));
    const config = makeConfig("iterm2");
    await dashboardCommand(config, [], 0);

    expect(mockSelectStrategy.mock.calls[0][0]).toBe("iterm2");
  });

  test("passes 'auto' strategy through to selectStrategy", async () => {
    mockSelectStrategy.mockImplementation(async () => ({ strategy: "sdk" as const }));
    const config = makeConfig("auto");
    await dashboardCommand(config, [], 0);

    expect(mockSelectStrategy.mock.calls[0][0]).toBe("auto");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun test src/__tests__/dashboard-strategy.test.ts`
Expected: FAIL — `dashboardCommand` doesn't call `selectStrategy` yet (it hardcodes SDK)

- [ ] **Step 3: Implement dashboard strategy selection in dashboard.ts**

Replace the hardcoded SDK factory creation in `cli/src/commands/dashboard.ts` with strategy selection logic matching `watchCommand()`.

Changes to `dashboard.ts`:
1. Add imports for `selectStrategy`, `loadConfig`, `CmuxSessionFactory`, `CmuxClient`, `ITermSessionFactory`, `It2Client`
2. Replace lines 34-36 (hardcoded SDK) with `selectStrategy()` call + factory branching
3. Load config via the function parameter (already passed in)

```typescript
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import type { BeastmodeConfig } from "../config.js";
import { createLogger } from "../logger.js";
import { WatchLoop } from "./watch-loop.js";
import type { WatchDeps } from "./watch-loop.js";
import { listEnriched } from "../manifest/store.js";
import {
  dispatchPhase,
  ReconcilingFactory,
  selectStrategy,
} from "./watch.js";
import { SdkSessionFactory } from "../dispatch/factory.js";
import type { SessionFactory } from "../dispatch/factory.js";
import { CmuxSessionFactory, CmuxClient } from "../dispatch/cmux.js";
import { ITermSessionFactory, It2Client } from "../dispatch/it2.js";
import { discoverGitHub } from "../github/discovery.js";

/** Discover the project root (walks up to find .beastmode/). */
function findProjectRoot(from: string = process.cwd()): string {
  let dir = from;
  while (dir !== "/") {
    if (existsSync(resolve(dir, ".beastmode"))) return dir;
    dir = resolve(dir, "..");
  }
  throw new Error("Not inside a beastmode project (no .beastmode/ found)");
}

export async function dashboardCommand(
  config: BeastmodeConfig,
  _args: string[] = [],
  verbosity: number = 0,
): Promise<void> {
  const projectRoot = findProjectRoot();
  const logger = createLogger(verbosity, {});

  // --- Select dispatch strategy from config (same as watch command) ---
  const selected = await selectStrategy(config.cli["dispatch-strategy"] ?? "sdk", undefined, logger);
  let innerFactory: SessionFactory;

  if (selected.strategy === "cmux") {
    innerFactory = new CmuxSessionFactory(new CmuxClient());
  } else if (selected.strategy === "iterm2") {
    innerFactory = new ITermSessionFactory(new It2Client());
  } else {
    innerFactory = new SdkSessionFactory(dispatchPhase);
  }

  const sessionFactory = new ReconcilingFactory(innerFactory, projectRoot, logger);

  // Pre-discover GitHub metadata (non-blocking)
  if (config.github.enabled) {
    try {
      const resolved = await discoverGitHub(
        projectRoot,
        config.github["project-name"],
        logger,
      );
      if (resolved) {
        sessionFactory.resolved = resolved;
      }
    } catch (err) {
      logger.warn(`GitHub discovery failed (non-blocking): ${err}`);
    }
  }

  // --- Create WatchLoop with signal handlers disabled (Ink handles signals) ---
  const deps: WatchDeps = {
    scanEpics: async (root: string) => listEnriched(root),
    sessionFactory,
    logger,
  };

  const loop = new WatchLoop(
    {
      intervalSeconds: config.cli.interval ?? 60,
      projectRoot,
      installSignalHandlers: false,
    },
    deps,
  );

  // --- Dynamic import React/Ink, render App ---
  const { render } = await import("ink");
  const React = await import("react");
  const { default: App } = await import("../dashboard/App.js");

  // Enter alternate screen buffer
  process.stdout.write("\x1b[?1049h");

  const { waitUntilExit } = render(
    React.createElement(App, { config, verbosity, loop, projectRoot }),
  );

  // Start the watch loop after rendering so events flow to the React tree
  try {
    await loop.start();
  } catch (err) {
    // Lockfile conflict — log but don't crash, dashboard still shows state
    logger.error(`${err}`);
  }

  try {
    await waitUntilExit();
  } finally {
    if (loop.isRunning()) {
      await loop.stop();
    }
    process.stdout.write("\x1b[?1049l");
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd cli && bun test src/__tests__/dashboard-strategy.test.ts`
Expected: PASS — all 6 tests pass

- [ ] **Step 5: Run existing tests to check for regressions**

Run: `cd cli && bun test src/__tests__/watch-dispatch.test.ts`
Expected: PASS — 3 existing tests still pass

- [ ] **Step 6: Commit**

```bash
git add cli/src/commands/dashboard.ts cli/src/__tests__/dashboard-strategy.test.ts
git commit -m "feat(strategy-dispatch): wire selectStrategy into dashboard command"
```

---

### Task 1: Remove CLI fallback from dispatchPhase — tests

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/commands/watch.ts:240-284`
- Modify: `cli/src/__tests__/watch-dispatch.test.ts`

- [ ] **Step 1: Add test for SDK failure propagation to watch-dispatch.test.ts**

Add a new test to the existing `watch-dispatch.test.ts` that verifies when SDK import fails, the error propagates (no fallback to CLI):

```typescript
  it("propagates SDK import error without CLI fallback", async () => {
    const ac = new AbortController();
    const handle = await dispatchPhase({
      epicSlug: "my-epic",
      phase: "plan",
      args: ["my-epic"],
      projectRoot: "/tmp/test-project",
      signal: ac.signal,
    });

    // The promise should reject since SDK is mocked to throw and there's no fallback
    const result = await handle.promise;
    expect(result.success).toBe(false);
    expect(result.exitCode).not.toBe(0);

    ac.abort();
  });
```

Note: The existing test file already mocks `@anthropic-ai/claude-agent-sdk` to throw. Currently the test doesn't check the promise result because the CLI fallback "succeeds" silently. After removing the fallback, the promise should resolve with `success: false` (the error is caught and wrapped in a SessionResult with error status).

Actually — let me reconsider. The catch block doesn't just do CLI fallback. Looking at the code more carefully: if we delete the catch block entirely, the SDK import error will be an unhandled rejection inside the `promise` async IIFE. The error should be caught and converted to a failed `SessionResult` so the watch loop can handle it gracefully.

The replacement catch block should:
1. NOT spawn `Bun.spawn("claude", "--print", ...)`
2. Emit an error event
3. Return a failed `SessionResult`

Updated test:

```typescript
  it("returns failed session result when SDK import fails (no CLI fallback)", async () => {
    const ac = new AbortController();
    const handle = await dispatchPhase({
      epicSlug: "my-epic",
      phase: "plan",
      args: ["my-epic"],
      projectRoot: "/tmp/test-project",
      signal: ac.signal,
    });

    // With CLI fallback removed, SDK failure should produce a failed session result
    const result = await handle.promise;
    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);

    ac.abort();
  });
```

- [ ] **Step 2: Run test to see current behavior**

Run: `cd cli && bun test src/__tests__/watch-dispatch.test.ts`
Expected: The new test may pass or fail depending on current fallback behavior — this establishes baseline.

- [ ] **Step 3: Remove CLI fallback from dispatchPhase**

In `cli/src/commands/watch.ts`, replace the catch block at lines 240-284 with a clean error handler that propagates the failure:

Replace lines 240-284:
```typescript
    } catch (err: unknown) {
      // SDK not available — fall back to Bun.spawn of claude CLI
      events.pushEntry({ timestamp: Date.now(), type: "heartbeat", text: "Falling back to CLI dispatch" });

      const args = [
        "claude",
        "--print",
        `/beastmode:${opts.phase} ${opts.args.join(" ")}`,
        "--output-format",
        "json",
        "--dangerously-skip-permissions",
      ];

      const proc = Bun.spawn(args, {
        cwd: wt.path,
        stdout: "pipe",
        stderr: "pipe",
        signal: opts.signal,
      });

      const [stdout] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);

      const exitCode = await proc.exited;

      // Try to parse cost from JSON output
      let costUsd = 0;
      try {
        const output = JSON.parse(stdout);
        costUsd = output.cost_usd ?? 0;
      } catch {
        // Non-JSON output — no cost info
      }

      events.pushEntry({ timestamp: Date.now(), type: "result", text: `Exit ${exitCode}` });

      sessionResult = {
        success: exitCode === 0,
        exitCode,
        costUsd,
        durationMs: Date.now() - startTime,
      };
    }
```

With:
```typescript
    } catch (err: unknown) {
      // SDK not available — propagate error through session result.
      // No CLI fallback: the watch loop's error handling will catch this
      // and retry on the next scan cycle.
      const message = err instanceof Error ? err.message : String(err);
      events.pushEntry({ timestamp: Date.now(), type: "result", text: `SDK dispatch failed: ${message}` });

      sessionResult = {
        success: false,
        exitCode: 1,
        costUsd: 0,
        durationMs: Date.now() - startTime,
        dispatchError: message,
      };
    }
```

Also update the `SessionResult` type in `cli/src/dispatch/types.ts` to include the optional `dispatchError` field:

```typescript
export interface SessionResult {
  success: boolean;
  exitCode: number;
  costUsd: number;
  durationMs: number;
  dispatchError?: string;
}
```

- [ ] **Step 4: Run tests to verify**

Run: `cd cli && bun test src/__tests__/watch-dispatch.test.ts`
Expected: PASS — all 4 tests pass (3 existing + 1 new)

- [ ] **Step 5: Commit**

```bash
git add cli/src/commands/watch.ts cli/src/dispatch/types.ts cli/src/__tests__/watch-dispatch.test.ts
git commit -m "fix(strategy-dispatch): remove broken CLI fallback from dispatchPhase"
```
