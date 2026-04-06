# Sync Debug Logging — Implementation Tasks

## Goal

Add structured debug logging throughout the GitHub sync path so path resolution failures and file read errors are visible without a debugger. Uses the existing `opts.logger` with `info`, `debug`, `warn`, `error` levels and structured data parameter (`Record<string, unknown>`).

## Architecture

- **Logger interface:** `Logger` from `cli/src/logger.ts` — `info/debug/warn/error(msg, data?)` + `child(ctx)`
- **Threading:** `opts.logger` already flows through `syncGitHub` → `syncFeature`. `readPrdSections` and `buildArtifactsMap` are private helpers that need a new `logger?: Logger` parameter.
- **Structured data contract:** All path-related log entries include `{ path: string }` in the data parameter for machine-readable filtering.

## Tech Stack

- TypeScript, Bun, Vitest
- Test command: `cd cli && bun --bun vitest run`

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/github/sync.ts` | Modify | Add logger param to `readPrdSections` and `buildArtifactsMap`; add debug/warn log calls |
| `cli/src/__tests__/sync-debug-logging.test.ts` | Create | Unit tests verifying all logging calls with expected messages and structured data |

---

### Task 0: Integration Test (BDD)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/src/__tests__/sync-debug-logging.integration.test.ts`

- [x] **Step 1: Write the integration test file**

```typescript
/**
 * Integration test for sync debug logging.
 * Verifies the GitHub sync path emits structured debug logs
 * for path resolution, file reads, and errors.
 *
 * @fix-worktree-paths
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// --- Mock Bun globals ---
globalThis.Bun = {
  CryptoHasher: class {
    constructor(_algo: string) {}
    update(_data: string) {}
    digest(_format: string) { return "abc123"; }
  },
  spawnSync: (_args: string[]) => ({ success: true, stdout: "", stderr: "" }),
} as any;

// --- Mock gh CLI module ---
const mockCalls: { fn: string; args: unknown[] }[] = [];
function trackCall(fn: string, ...args: unknown[]): void {
  mockCalls.push({ fn, args });
}

vi.mock("../github/cli", () => ({
  ghIssueCreate: async (...args: unknown[]) => { trackCall("ghIssueCreate", ...args); return 42; },
  ghIssueEdit: async (...args: unknown[]) => { trackCall("ghIssueEdit", ...args); return true; },
  ghIssueClose: async (...args: unknown[]) => { trackCall("ghIssueClose", ...args); return true; },
  ghIssueComment: async (...args: unknown[]) => { trackCall("ghIssueComment", ...args); return true; },
  ghIssueComments: async (...args: unknown[]) => { trackCall("ghIssueComments", ...args); return []; },
  ghIssueState: async (...args: unknown[]) => { trackCall("ghIssueState", ...args); return "open"; },
  ghIssueReopen: async (...args: unknown[]) => { trackCall("ghIssueReopen", ...args); return true; },
  ghIssueLabels: async (...args: unknown[]) => { trackCall("ghIssueLabels", ...args); return ["type/epic", "phase/design"]; },
  ghProjectItemAdd: async (...args: unknown[]) => { trackCall("ghProjectItemAdd", ...args); return "item-123"; },
  ghProjectSetField: async (...args: unknown[]) => { trackCall("ghProjectSetField", ...args); return true; },
  ghSubIssueAdd: async (...args: unknown[]) => { trackCall("ghSubIssueAdd", ...args); return true; },
  ghProjectItemDelete: async (...args: unknown[]) => { trackCall("ghProjectItemDelete", ...args); return true; },
}));

import { syncGitHub } from "../github/sync";
import type { EpicSyncInput } from "../github/sync";
import type { SyncRefs } from "../github/sync-refs";
import type { BeastmodeConfig } from "../config";
import type { ResolvedGitHub } from "../github/discovery";
import type { Logger } from "../logger";

// --- Logger spy ---
function createSpyLogger(): Logger & { calls: { level: string; msg: string; data?: Record<string, unknown> }[] } {
  const calls: { level: string; msg: string; data?: Record<string, unknown> }[] = [];
  const logger: any = {
    calls,
    info: (msg: string, data?: Record<string, unknown>) => calls.push({ level: "info", msg, data }),
    debug: (msg: string, data?: Record<string, unknown>) => calls.push({ level: "debug", msg, data }),
    warn: (msg: string, data?: Record<string, unknown>) => calls.push({ level: "warn", msg, data }),
    error: (msg: string, data?: Record<string, unknown>) => calls.push({ level: "error", msg, data }),
    child: () => logger,
  };
  return logger;
}

function makeConfig(): BeastmodeConfig {
  return {
    github: { enabled: true },
    cli: { interval: 60 },
    hitl: { timeout: 30 },
    "file-permissions": { timeout: 60, "claude-settings": "" },
  };
}

function makeResolved(): ResolvedGitHub {
  return { repo: "org/repo" };
}

describe("GitHub sync path emits structured debug logs", () => {
  let tmpDir: string;

  beforeEach(() => {
    mockCalls.length = 0;
    tmpDir = mkdtempSync(join(tmpdir(), "sync-log-"));
  });

  test("Scenario: Sync logs the stored path and resolved path during PRD read", async () => {
    // Given: epic has a design artifact path stored
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    const designFile = "2026-04-06-abc123.md";
    writeFileSync(join(designDir, designFile), "## Problem Statement\nTest problem\n\n## Solution\nTest solution\n");

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-test",
      slug: "test",
      name: "Test",
      phase: "design",
      features: [],
      artifacts: { design: [designFile] },
    };

    // When: sync reads PRD sections
    await syncGitHub(epic, {}, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    // Then: logger receives debug entries with stored and resolved paths
    const debugCalls = logger.calls.filter(c => c.level === "debug");
    const storedPathLog = debugCalls.find(c => c.msg.includes("stored") && c.data?.path);
    const resolvedPathLog = debugCalls.find(c => c.msg.includes("resolved") && c.data?.path);
    expect(storedPathLog).toBeDefined();
    expect(resolvedPathLog).toBeDefined();
  });

  test("Scenario: Sync logs a warning when the design artifact file is missing", async () => {
    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-test",
      slug: "test",
      name: "Test",
      phase: "design",
      features: [],
      artifacts: { design: ["nonexistent.md"] },
    };

    await syncGitHub(epic, {}, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const warns = logger.calls.filter(c => c.level === "warn");
    const missingWarn = warns.find(c => c.msg.includes("not found") || c.msg.includes("missing") || c.msg.includes("does not exist"));
    expect(missingWarn).toBeDefined();
    expect(missingWarn!.data?.path).toBeDefined();
  });

  test("Scenario: Sync logs a warning when the feature plan file is missing", async () => {
    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-test",
      slug: "test",
      name: "Test",
      phase: "plan",
      features: [{ id: "bm-test.1", slug: "feat-a", status: "pending", plan: "nonexistent-plan.md" }],
    };

    await syncGitHub(epic, { "bm-test": { issue: 10 } }, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const warns = logger.calls.filter(c => c.level === "warn");
    const missingWarn = warns.find(c => c.msg.includes("plan") && (c.msg.includes("not found") || c.msg.includes("missing") || c.msg.includes("does not exist")));
    expect(missingWarn).toBeDefined();
  });

  test("Scenario: Sync logs section extraction results for PRD", async () => {
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    const designFile = "2026-04-06-abc123.md";
    writeFileSync(join(designDir, designFile), "## Problem Statement\nTest\n\n## Solution\nTest\n\n## User Stories\nTest\n");

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-test",
      slug: "test",
      name: "Test",
      phase: "design",
      features: [],
      artifacts: { design: [designFile] },
    };

    await syncGitHub(epic, {}, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const debugCalls = logger.calls.filter(c => c.level === "debug");
    const sectionLog = debugCalls.find(c => c.msg.includes("section") || c.msg.includes("extracted"));
    expect(sectionLog).toBeDefined();
  });

  test("Scenario: Sync logs path context with structured data fields", async () => {
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    const designFile = "2026-04-06-abc123.md";
    writeFileSync(join(designDir, designFile), "## Problem Statement\nTest\n");

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-test",
      slug: "test",
      name: "Test",
      phase: "design",
      features: [],
      artifacts: { design: [designFile] },
    };

    await syncGitHub(epic, {}, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const pathLogs = logger.calls.filter(c => c.data?.path !== undefined);
    expect(pathLogs.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [x] **Step 2: Run test to verify it fails (RED)**

Run: `cd cli && bun --bun vitest run src/__tests__/sync-debug-logging.integration.test.ts`
Expected: FAIL — sync functions don't emit any log calls yet

- [x] **Step 3: Commit**

```bash
git add cli/src/__tests__/sync-debug-logging.integration.test.ts
git commit -m "test(sync-debug-logging): add integration test — RED state"
```

---

### Task 1: Add logger parameter to readPrdSections and add path resolution + section extraction logging

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/github/sync.ts:29,353-386,496-498`

- [x] **Step 1: Write the unit test for readPrdSections logging**

Add a new test file `cli/src/__tests__/sync-prd-logging.test.ts`:

```typescript
/**
 * Unit tests for readPrdSections debug logging.
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// --- Mock Bun globals ---
globalThis.Bun = {
  CryptoHasher: class {
    constructor(_algo: string) {}
    update(_data: string) {}
    digest(_format: string) { return "abc123"; }
  },
  spawnSync: (_args: string[]) => ({ success: true, stdout: "", stderr: "" }),
} as any;

// --- Mock gh CLI ---
vi.mock("../github/cli", () => ({
  ghIssueCreate: async () => 42,
  ghIssueEdit: async () => true,
  ghIssueClose: async () => true,
  ghIssueComment: async () => true,
  ghIssueComments: async () => [],
  ghIssueState: async () => "open",
  ghIssueReopen: async () => true,
  ghIssueLabels: async () => ["type/epic", "phase/design"],
  ghProjectItemAdd: async () => "item-123",
  ghProjectSetField: async () => true,
  ghSubIssueAdd: async () => true,
  ghProjectItemDelete: async () => true,
}));

import { syncGitHub } from "../github/sync";
import type { EpicSyncInput } from "../github/sync";
import type { BeastmodeConfig } from "../config";
import type { ResolvedGitHub } from "../github/discovery";
import type { Logger } from "../logger";

function createSpyLogger(): Logger & { calls: { level: string; msg: string; data?: Record<string, unknown> }[] } {
  const calls: { level: string; msg: string; data?: Record<string, unknown> }[] = [];
  const logger: any = {
    calls,
    info: (msg: string, data?: Record<string, unknown>) => calls.push({ level: "info", msg, data }),
    debug: (msg: string, data?: Record<string, unknown>) => calls.push({ level: "debug", msg, data }),
    warn: (msg: string, data?: Record<string, unknown>) => calls.push({ level: "warn", msg, data }),
    error: (msg: string, data?: Record<string, unknown>) => calls.push({ level: "error", msg, data }),
    child: () => logger,
  };
  return logger;
}

function makeConfig(): BeastmodeConfig {
  return {
    github: { enabled: true },
    cli: { interval: 60 },
    hitl: { timeout: 30 },
    "file-permissions": { timeout: 60, "claude-settings": "" },
  };
}

function makeResolved(): ResolvedGitHub {
  return { repo: "org/repo" };
}

describe("readPrdSections logging", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "prd-log-"));
  });

  test("logs stored artifact path at debug level with path in structured data", async () => {
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    writeFileSync(join(designDir, "2026-04-06-abc.md"), "## Problem Statement\nTest\n");

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "design",
      features: [],
      artifacts: { design: ["2026-04-06-abc.md"] },
    };

    await syncGitHub(epic, {}, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const debugCalls = logger.calls.filter(c => c.level === "debug");
    const storedLog = debugCalls.find(c => c.msg.includes("stored") && c.data?.path === "2026-04-06-abc.md");
    expect(storedLog).toBeDefined();
  });

  test("logs resolved absolute path at debug level with path in structured data", async () => {
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    writeFileSync(join(designDir, "2026-04-06-abc.md"), "## Problem Statement\nTest\n");

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "design",
      features: [],
      artifacts: { design: ["2026-04-06-abc.md"] },
    };

    await syncGitHub(epic, {}, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const debugCalls = logger.calls.filter(c => c.level === "debug");
    const resolvedLog = debugCalls.find(c => c.msg.includes("resolved") && c.data?.path?.toString().includes(tmpDir));
    expect(resolvedLog).toBeDefined();
  });

  test("logs warning when design artifact file does not exist", async () => {
    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "design",
      features: [],
      artifacts: { design: ["missing.md"] },
    };

    await syncGitHub(epic, {}, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const warns = logger.calls.filter(c => c.level === "warn");
    const missingWarn = warns.find(c => c.data?.path !== undefined && (c.msg.includes("not found") || c.msg.includes("does not exist")));
    expect(missingWarn).toBeDefined();
  });

  test("logs extracted section names at debug level", async () => {
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    writeFileSync(
      join(designDir, "2026-04-06-abc.md"),
      "## Problem Statement\nP\n\n## Solution\nS\n\n## User Stories\nU\n",
    );

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "design",
      features: [],
      artifacts: { design: ["2026-04-06-abc.md"] },
    };

    await syncGitHub(epic, {}, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const debugCalls = logger.calls.filter(c => c.level === "debug");
    const sectionLog = debugCalls.find(c => c.msg.includes("extracted") || c.msg.includes("sections"));
    expect(sectionLog).toBeDefined();
  });

  test("logs error with path context when file read throws", async () => {
    // Create a design directory but make the file unreadable by writing then removing read perms
    // Instead, we test the catch block by providing a path to a directory (not a file)
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    // Create a subdirectory with the artifact name — readFileSync will throw on a directory
    mkdirSync(join(designDir, "2026-04-06-abc.md"), { recursive: true });

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "design",
      features: [],
      artifacts: { design: ["2026-04-06-abc.md"] },
    };

    await syncGitHub(epic, {}, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const errorCalls = logger.calls.filter(c => c.level === "error");
    const readError = errorCalls.find(c => c.data?.path !== undefined);
    expect(readError).toBeDefined();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/sync-prd-logging.test.ts`
Expected: FAIL — readPrdSections doesn't log anything yet

- [x] **Step 3: Implement logging in readPrdSections**

In `cli/src/github/sync.ts`:

1. Add `basename, join` to the path import on line 29
2. Add `logger?: Logger` parameter to `readPrdSections`
3. Add debug/warn/error log calls at each resolution step
4. Update the call site at line 496-498 to pass `opts.logger`

The modified `readPrdSections` function (lines 353-386):

```typescript
function readPrdSections(
  epic: EpicSyncInput,
  projectRoot: string,
  logger?: Logger,
): EpicBodyInput["prdSections"] | undefined {
  const designPaths = epic.artifacts?.["design"];
  if (!designPaths || designPaths.length === 0) return undefined;

  const storedPath = designPaths[0];
  logger?.debug("readPrdSections: stored artifact path", { path: storedPath });

  const designPath = resolve(projectRoot, storedPath);
  logger?.debug("readPrdSections: resolved absolute path", { path: designPath });

  if (!existsSync(designPath)) {
    logger?.warn("readPrdSections: design artifact file does not exist", { path: designPath });
    return undefined;
  }

  try {
    const content = readFileSync(designPath, "utf-8");
    const sections = extractSections(content, [
      "Problem Statement",
      "Solution",
      "User Stories",
      "Implementation Decisions",
      "Testing Decisions",
      "Out of Scope",
    ]);

    const result: EpicBodyInput["prdSections"] = {};
    if (sections["Problem Statement"]) result.problem = sections["Problem Statement"];
    if (sections["Solution"]) result.solution = sections["Solution"];
    if (sections["User Stories"]) result.userStories = sections["User Stories"];
    if (sections["Implementation Decisions"]) result.decisions = sections["Implementation Decisions"];
    if (sections["Testing Decisions"]) result.testingDecisions = sections["Testing Decisions"];
    if (sections["Out of Scope"]) result.outOfScope = sections["Out of Scope"];

    const extracted = Object.keys(result);
    logger?.debug(`readPrdSections: extracted ${extracted.length} sections`, { path: storedPath, sections: extracted });

    return Object.keys(result).length > 0 ? result : undefined;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger?.error(`readPrdSections: failed to read design artifact: ${message}`, { path: designPath });
    return undefined;
  }
}
```

The updated call site (line 496-498):

```typescript
  const prdSections = opts.projectRoot
    ? readPrdSections(epic, opts.projectRoot, opts.logger)
    : undefined;
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd cli && bun --bun vitest run src/__tests__/sync-prd-logging.test.ts`
Expected: PASS

- [x] **Step 5: Run full test suite to check for regressions**

Run: `cd cli && bun --bun vitest run`
Expected: PASS (all existing tests still pass)

- [x] **Step 6: Commit**

```bash
git add cli/src/github/sync.ts cli/src/__tests__/sync-prd-logging.test.ts
git commit -m "feat(sync-debug-logging): add logging to readPrdSections"
```

---

### Task 2: Add logging to syncFeature plan reader and buildArtifactsMap

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/github/sync.ts:684-703,919-935`
- Create: `cli/src/__tests__/sync-feature-logging.test.ts`

- [x] **Step 1: Write the unit test for feature plan reader logging**

Create `cli/src/__tests__/sync-feature-logging.test.ts`:

```typescript
/**
 * Unit tests for syncFeature plan reader and buildArtifactsMap logging.
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// --- Mock Bun globals ---
globalThis.Bun = {
  CryptoHasher: class {
    constructor(_algo: string) {}
    update(_data: string) {}
    digest(_format: string) { return "abc123"; }
  },
  spawnSync: (_args: string[]) => ({ success: true, stdout: "", stderr: "" }),
} as any;

// --- Mock gh CLI ---
vi.mock("../github/cli", () => ({
  ghIssueCreate: async () => 42,
  ghIssueEdit: async () => true,
  ghIssueClose: async () => true,
  ghIssueComment: async () => true,
  ghIssueComments: async () => [],
  ghIssueState: async () => "open",
  ghIssueReopen: async () => true,
  ghIssueLabels: async () => ["type/epic", "phase/design"],
  ghProjectItemAdd: async () => "item-123",
  ghProjectSetField: async () => true,
  ghSubIssueAdd: async () => true,
  ghProjectItemDelete: async () => true,
}));

import { syncGitHub } from "../github/sync";
import type { EpicSyncInput } from "../github/sync";
import type { BeastmodeConfig } from "../config";
import type { ResolvedGitHub } from "../github/discovery";
import type { Logger } from "../logger";

function createSpyLogger(): Logger & { calls: { level: string; msg: string; data?: Record<string, unknown> }[] } {
  const calls: { level: string; msg: string; data?: Record<string, unknown> }[] = [];
  const logger: any = {
    calls,
    info: (msg: string, data?: Record<string, unknown>) => calls.push({ level: "info", msg, data }),
    debug: (msg: string, data?: Record<string, unknown>) => calls.push({ level: "debug", msg, data }),
    warn: (msg: string, data?: Record<string, unknown>) => calls.push({ level: "warn", msg, data }),
    error: (msg: string, data?: Record<string, unknown>) => calls.push({ level: "error", msg, data }),
    child: () => logger,
  };
  return logger;
}

function makeConfig(): BeastmodeConfig {
  return {
    github: { enabled: true },
    cli: { interval: 60 },
    hitl: { timeout: 30 },
    "file-permissions": { timeout: 60, "claude-settings": "" },
  };
}

function makeResolved(): ResolvedGitHub {
  return { repo: "org/repo" };
}

describe("syncFeature plan reader logging", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "feat-log-"));
  });

  test("logs warning when feature plan file does not exist", async () => {
    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "plan",
      features: [{ id: "bm-1.1", slug: "feat-a", status: "pending", plan: "nonexistent.md" }],
    };

    await syncGitHub(epic, { "bm-1": { issue: 10 } }, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const warns = logger.calls.filter(c => c.level === "warn");
    const planWarn = warns.find(c => c.msg.includes("plan") && (c.msg.includes("not found") || c.msg.includes("does not exist")));
    expect(planWarn).toBeDefined();
  });

  test("logs stored and resolved plan path at debug level", async () => {
    const planDir = join(tmpDir, ".beastmode", "artifacts", "plan");
    mkdirSync(planDir, { recursive: true });
    writeFileSync(join(planDir, "feat-plan.md"), "## User Stories\nTest\n\n## What to Build\nStuff\n");

    // Note: syncFeature currently resolves plan via resolve(projectRoot, feature.plan)
    // which means the plan file must exist at that relative path from projectRoot.
    // For the test to find it, we use the basename approach the fix-worktree-paths epic adds.
    // Since this feature only adds logging (not the path fix), we place the file where
    // the current code expects it.
    writeFileSync(join(tmpDir, "feat-plan.md"), "## User Stories\nTest\n\n## What to Build\nStuff\n");

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "plan",
      features: [{ id: "bm-1.1", slug: "feat-a", status: "pending", plan: "feat-plan.md" }],
    };

    await syncGitHub(epic, { "bm-1": { issue: 10 } }, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const debugCalls = logger.calls.filter(c => c.level === "debug");
    const planLog = debugCalls.find(c => c.msg.includes("plan") && c.data?.path);
    expect(planLog).toBeDefined();
  });
});

describe("buildArtifactsMap logging", () => {
  test("logs each phase raw path and normalized path at debug level", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "art-log-"));
    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "design",
      features: [],
      artifacts: { design: ["/absolute/path/to/design.md"] },
    };

    await syncGitHub(epic, {}, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const debugCalls = logger.calls.filter(c => c.level === "debug");
    const artifactLog = debugCalls.find(c => c.msg.includes("artifact") && c.msg.includes("design"));
    expect(artifactLog).toBeDefined();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/sync-feature-logging.test.ts`
Expected: FAIL — no logging in feature plan reader or buildArtifactsMap

- [x] **Step 3: Implement logging in syncFeature plan reader**

In `cli/src/github/sync.ts`, modify the feature plan reading block (lines 684-703):

```typescript
  // Read plan sections from feature plan (if projectRoot available)
  let userStory: string | undefined;
  let whatToBuild: string | undefined;
  let acceptanceCriteria: string | undefined;
  if (opts.projectRoot && feature.plan) {
    const planPath = resolve(opts.projectRoot, feature.plan);
    opts.logger?.debug("syncFeature: stored plan path", { path: feature.plan });
    opts.logger?.debug("syncFeature: resolved plan path", { path: planPath });
    try {
      if (existsSync(planPath)) {
        const planContent = readFileSync(planPath, "utf-8");
        const section = extractSection(planContent, "User Stories");
        if (section) userStory = section;
        const wtb = extractSection(planContent, "What to Build");
        if (wtb) whatToBuild = wtb;
        const ac = extractSection(planContent, "Acceptance Criteria");
        if (ac) acceptanceCriteria = ac;
      } else {
        opts.logger?.warn("syncFeature: plan file does not exist", { path: planPath });
      }
    } catch {
      // Graceful degradation
    }
  }
```

- [x] **Step 4: Implement logging in buildArtifactsMap**

Add a `logger?: Logger` parameter to `buildArtifactsMap` (lines 919-935):

```typescript
function buildArtifactsMap(
  entity: { design?: string; plan?: string; implement?: string; validate?: string; release?: string },
  projectRoot?: string,
  logger?: Logger,
): Record<string, string[]> | undefined {
  const map: Record<string, string[]> = {};
  const phases = ["design", "plan", "implement", "validate", "release"] as const;
  for (const phase of phases) {
    const rawPath = entity[phase];
    if (rawPath) {
      const normalized = projectRoot && isAbsolute(rawPath)
        ? relative(projectRoot, rawPath)
        : rawPath;
      logger?.debug(`buildArtifactsMap: ${phase} artifact`, { path: rawPath, normalized });
      map[phase] = [normalized];
    }
  }
  return Object.keys(map).length > 0 ? map : undefined;
}
```

Update the call site (line 981) to pass the logger:

```typescript
      artifacts: buildArtifactsMap(epicEntity, opts.projectRoot, opts.logger),
```

- [x] **Step 5: Run test to verify it passes**

Run: `cd cli && bun --bun vitest run src/__tests__/sync-feature-logging.test.ts`
Expected: PASS

- [x] **Step 6: Run full test suite**

Run: `cd cli && bun --bun vitest run`
Expected: PASS

- [x] **Step 7: Commit**

```bash
git add cli/src/github/sync.ts cli/src/__tests__/sync-feature-logging.test.ts
git commit -m "feat(sync-debug-logging): add logging to syncFeature and buildArtifactsMap"
```

---

### Task 3: Add error surface logging to sync catch blocks

**Wave:** 2
**Depends on:** Task 1, Task 2

**Files:**
- Modify: `cli/src/github/sync.ts:383-384,700-701,1015-1018`
- Create: `cli/src/__tests__/sync-error-logging.test.ts`

- [ ] **Step 1: Write the unit test for error catch block logging**

Create `cli/src/__tests__/sync-error-logging.test.ts`:

```typescript
/**
 * Unit tests for sync error catch block logging.
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// --- Mock Bun globals ---
globalThis.Bun = {
  CryptoHasher: class {
    constructor(_algo: string) {}
    update(_data: string) {}
    digest(_format: string) { return "abc123"; }
  },
  spawnSync: (_args: string[]) => ({ success: true, stdout: "", stderr: "" }),
} as any;

// --- Mock gh CLI ---
vi.mock("../github/cli", () => ({
  ghIssueCreate: async () => 42,
  ghIssueEdit: async () => true,
  ghIssueClose: async () => true,
  ghIssueComment: async () => true,
  ghIssueComments: async () => [],
  ghIssueState: async () => "open",
  ghIssueReopen: async () => true,
  ghIssueLabels: async () => ["type/epic", "phase/design"],
  ghProjectItemAdd: async () => "item-123",
  ghProjectSetField: async () => true,
  ghSubIssueAdd: async () => true,
  ghProjectItemDelete: async () => true,
}));

import { syncGitHub } from "../github/sync";
import type { EpicSyncInput } from "../github/sync";
import type { BeastmodeConfig } from "../config";
import type { ResolvedGitHub } from "../github/discovery";
import type { Logger } from "../logger";

function createSpyLogger(): Logger & { calls: { level: string; msg: string; data?: Record<string, unknown> }[] } {
  const calls: { level: string; msg: string; data?: Record<string, unknown> }[] = [];
  const logger: any = {
    calls,
    info: (msg: string, data?: Record<string, unknown>) => calls.push({ level: "info", msg, data }),
    debug: (msg: string, data?: Record<string, unknown>) => calls.push({ level: "debug", msg, data }),
    warn: (msg: string, data?: Record<string, unknown>) => calls.push({ level: "warn", msg, data }),
    error: (msg: string, data?: Record<string, unknown>) => calls.push({ level: "error", msg, data }),
    child: () => logger,
  };
  return logger;
}

function makeConfig(): BeastmodeConfig {
  return {
    github: { enabled: true },
    cli: { interval: 60 },
    hitl: { timeout: 30 },
    "file-permissions": { timeout: 60, "claude-settings": "" },
  };
}

function makeResolved(): ResolvedGitHub {
  return { repo: "org/repo" };
}

describe("sync error catch block logging", () => {
  test("readPrdSections logs error with path context when readFileSync throws", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "err-log-"));
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    // Create a directory where a file is expected — readFileSync throws on directories
    mkdirSync(join(designDir, "bad-artifact.md"), { recursive: true });

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "design",
      features: [],
      artifacts: { design: ["bad-artifact.md"] },
    };

    await syncGitHub(epic, {}, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const errors = logger.calls.filter(c => c.level === "error");
    const readErr = errors.find(c => c.data?.path !== undefined);
    expect(readErr).toBeDefined();
  });

  test("syncFeature plan reader logs error with path when readFileSync throws", async () => {
    const tmpDir = mkdtempSync(join(tmpdir(), "err-log-"));
    // Create a directory where the plan file is expected
    mkdirSync(join(tmpDir, "bad-plan.md"), { recursive: true });

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "plan",
      features: [{ id: "bm-1.1", slug: "feat-a", status: "pending", plan: "bad-plan.md" }],
    };

    await syncGitHub(epic, { "bm-1": { issue: 10 } }, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const errors = logger.calls.filter(c => c.level === "error");
    const readErr = errors.find(c => c.data?.path !== undefined && c.msg.includes("plan"));
    expect(readErr).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/sync-error-logging.test.ts`
Expected: FAIL — catch blocks don't log yet

- [ ] **Step 3: Implement error logging in catch blocks**

In `cli/src/github/sync.ts`:

The `readPrdSections` catch block (around line 383) was already updated in Task 1 with error logging. Verify it's in place.

Update the `syncFeature` plan reader catch block (around line 700):

```typescript
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      opts.logger?.error(`syncFeature: failed to read plan file: ${message}`, { path: planPath });
    }
```

Also update the main `syncGitHubForEpic` catch block (around line 1015) to include path context:

```typescript
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    opts.logger?.warn(`GitHub sync failed (non-blocking): ${message}`, { epicId: opts.epicId });
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd cli && bun --bun vitest run src/__tests__/sync-error-logging.test.ts`
Expected: PASS

- [ ] **Step 5: Run full test suite**

Run: `cd cli && bun --bun vitest run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add cli/src/github/sync.ts cli/src/__tests__/sync-error-logging.test.ts
git commit -m "feat(sync-debug-logging): add error logging to sync catch blocks"
```
