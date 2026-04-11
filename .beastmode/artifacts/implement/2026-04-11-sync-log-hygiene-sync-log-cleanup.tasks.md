# Sync Log Cleanup — Implementation Tasks

## Goal

Eliminate spurious warn/error log output from the sync engine by:
1. Adding phase gates to skip artifact reads when the producing phase hasn't completed
2. Downgrading misleveled log calls to their correct severity
3. Enriching all sync warnings with phase context via `logger.child()`

## Architecture

- **Phase ordering:** `phaseIndex()` already exists in `cli/src/types.ts` — use it to build `isPhaseAtOrPast(current, threshold)` inline or as a utility
- **Logger:** Custom logger in `cli/src/logger.ts` with `child(ctx)` method that merges context
- **Sync engine:** `cli/src/github/sync.ts` — `readPrdSections()`, `syncFeature()`, `syncGitHub()`, `syncGitHubForEpic()`
- **Branch link:** `cli/src/github/branch-link.ts` — `linkBranches()`, `linkOneBranch()`
- **Test framework:** Vitest with spy loggers, Bun globals mocked

## Tech Stack

- TypeScript, Bun runtime
- Vitest (pool: forks)
- Custom Logger interface with `child()` support

## File Structure

| File | Responsibility |
|------|---------------|
| `cli/src/types.ts` | Add `isPhaseAtOrPast()` utility |
| `cli/src/github/sync.ts` | Phase gates, log level fixes, phase context via `logger.child()` |
| `cli/src/github/branch-link.ts` | Log level downgrade, phase context |
| `cli/src/__tests__/phase-ordering.test.ts` | Unit tests for `isPhaseAtOrPast()` |
| `cli/src/__tests__/sync-log-cleanup.test.ts` | Integration tests for phase gates, log levels, phase context |
| `cli/src/__tests__/sync-prd-logging.test.ts` | Update existing test (error -> warn expectation) |

---

### Task 0: Integration Test (RED)

**Wave:** 0
**Depends on:** -

**Files:**
- Create: `cli/src/__tests__/sync-log-cleanup.integration.test.ts`

- [ ] **Step 1: Write the integration test file**

```typescript
/**
 * Integration tests for sync-log-cleanup feature.
 *
 * Covers: phase gates, log level classification, phase context enrichment.
 * Expected to FAIL before implementation (RED state).
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// --- Mock Bun globals ---
try {
  Object.defineProperty(globalThis, "Bun", {
    value: {
      CryptoHasher: class {
        constructor(_algo: string) {}
        update(_data: string) {}
        digest(_format: string) {
          return "abc123";
        }
      },
      spawnSync: (_args: string[]) => ({
        success: true,
        stdout: "",
        stderr: "",
      }),
    },
    configurable: true,
  });
} catch {
  // Bun might already be set
}

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

function createSpyLogger(): Logger & {
  calls: { level: string; msg: string; data?: Record<string, unknown> }[];
} {
  const calls: {
    level: string;
    msg: string;
    data?: Record<string, unknown>;
  }[] = [];
  const logger: any = {
    calls,
    info: (msg: string, data?: Record<string, unknown>) =>
      calls.push({ level: "info", msg, data }),
    debug: (msg: string, data?: Record<string, unknown>) =>
      calls.push({ level: "debug", msg, data }),
    warn: (msg: string, data?: Record<string, unknown>) =>
      calls.push({ level: "warn", msg, data }),
    error: (msg: string, data?: Record<string, unknown>) =>
      calls.push({ level: "error", msg, data }),
    child: (ctx: Record<string, unknown>) => {
      const childLogger: any = {
        calls,
        info: (msg: string, data?: Record<string, unknown>) =>
          calls.push({ level: "info", msg, data: { ...ctx, ...data } }),
        debug: (msg: string, data?: Record<string, unknown>) =>
          calls.push({ level: "debug", msg, data: { ...ctx, ...data } }),
        warn: (msg: string, data?: Record<string, unknown>) =>
          calls.push({ level: "warn", msg, data: { ...ctx, ...data } }),
        error: (msg: string, data?: Record<string, unknown>) =>
          calls.push({ level: "error", msg, data: { ...ctx, ...data } }),
        child: (ctx2: Record<string, unknown>) =>
          childLogger,
      };
      return childLogger;
    },
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

// ============================================================================
// Feature 1: Phase-aware artifact gating
// ============================================================================

describe("sync phase-aware artifact gating", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "sync-gate-"));
  });

  test("design-phase sync skips PRD artifact read without logging a warning", async () => {
    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "design",
      features: [],
      artifacts: { design: ["2026-04-06-abc.md"] },
    };

    await syncGitHub(epic, {}, makeConfig(), makeResolved(), {
      logger,
      projectRoot: tmpDir,
    });

    const warns = logger.calls.filter((c) => c.level === "warn");
    const prdWarns = warns.filter(
      (c) =>
        c.msg.includes("design artifact") || c.msg.includes("readPrdSections"),
    );
    expect(prdWarns).toHaveLength(0);
  });

  test("design-phase sync skips plan file reads without logging a warning", async () => {
    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "design",
      features: [
        { id: "bm-1.1", slug: "feat-a", status: "pending", plan: "plan.md" },
      ],
    };

    await syncGitHub(
      epic,
      { "bm-1": { issue: 10 } },
      makeConfig(),
      makeResolved(),
      { logger, projectRoot: tmpDir },
    );

    const warns = logger.calls.filter((c) => c.level === "warn");
    const planWarns = warns.filter(
      (c) => c.msg.includes("plan") && c.msg.includes("does not exist"),
    );
    expect(planWarns).toHaveLength(0);
  });

  test("plan-phase sync skips plan file reads without logging a warning", async () => {
    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "plan",
      features: [
        { id: "bm-1.1", slug: "feat-a", status: "pending", plan: "plan.md" },
      ],
    };

    await syncGitHub(
      epic,
      { "bm-1": { issue: 10 } },
      makeConfig(),
      makeResolved(),
      { logger, projectRoot: tmpDir },
    );

    const warns = logger.calls.filter((c) => c.level === "warn");
    const planWarns = warns.filter(
      (c) => c.msg.includes("plan") && c.msg.includes("does not exist"),
    );
    expect(planWarns).toHaveLength(0);
  });

  test("implement-phase sync reads design artifact normally", async () => {
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    writeFileSync(
      join(designDir, "2026-04-06-abc.md"),
      "## Problem Statement\nTest\n",
    );

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "implement",
      features: [],
      artifacts: { design: ["2026-04-06-abc.md"] },
    };

    await syncGitHub(epic, { "bm-1": { issue: 10 } }, makeConfig(), makeResolved(), {
      logger,
      projectRoot: tmpDir,
    });

    const debugCalls = logger.calls.filter((c) => c.level === "debug");
    const extracted = debugCalls.find(
      (c) => c.msg.includes("extracted") || c.msg.includes("sections"),
    );
    expect(extracted).toBeDefined();
  });

  test("implement-phase sync reads plan files normally", async () => {
    const planDir = join(tmpDir, ".beastmode", "artifacts", "plan");
    mkdirSync(planDir, { recursive: true });
    writeFileSync(
      join(planDir, "plan.md"),
      "## User Stories\nTest\n\n## What to Build\nStuff\n",
    );

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "implement",
      features: [
        { id: "bm-1.1", slug: "feat-a", status: "pending", plan: "plan.md" },
      ],
    };

    await syncGitHub(
      epic,
      { "bm-1": { issue: 10 } },
      makeConfig(),
      makeResolved(),
      { logger, projectRoot: tmpDir },
    );

    const debugCalls = logger.calls.filter((c) => c.level === "debug");
    const planLog = debugCalls.find(
      (c) => c.msg.includes("plan") && c.msg.includes("stored"),
    );
    expect(planLog).toBeDefined();
  });
});

// ============================================================================
// Feature 2: Log level classification
// ============================================================================

describe("sync log level classification", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "sync-level-"));
  });

  test("readPrdSections file read exception logged at warn, not error", async () => {
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    // Create a directory where a file is expected — readFileSync throws on directories
    mkdirSync(join(designDir, "2026-04-06-abc.md"), { recursive: true });

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "implement",
      features: [],
      artifacts: { design: ["2026-04-06-abc.md"] },
    };

    await syncGitHub(epic, { "bm-1": { issue: 10 } }, makeConfig(), makeResolved(), {
      logger,
      projectRoot: tmpDir,
    });

    const errorCalls = logger.calls.filter(
      (c) =>
        c.level === "error" &&
        c.msg.includes("readPrdSections") &&
        c.msg.includes("failed"),
    );
    expect(errorCalls).toHaveLength(0);

    const warnCalls = logger.calls.filter(
      (c) =>
        c.level === "warn" &&
        c.msg.includes("readPrdSections") &&
        c.msg.includes("failed"),
    );
    expect(warnCalls).toHaveLength(1);
  });
});

// ============================================================================
// Feature 3: Phase context enrichment
// ============================================================================

describe("sync warning phase context", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "sync-ctx-"));
  });

  test("sync warning includes phase in log context", async () => {
    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "implement",
      features: [],
      artifacts: { design: ["missing.md"] },
    };

    await syncGitHub(epic, { "bm-1": { issue: 10 } }, makeConfig(), makeResolved(), {
      logger,
      projectRoot: tmpDir,
    });

    const warns = logger.calls.filter((c) => c.level === "warn");
    const withPhase = warns.filter((c) => c.data?.phase === "implement");
    expect(withPhase.length).toBeGreaterThan(0);
  });

  test("debug entries from sync also carry phase context", async () => {
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    writeFileSync(
      join(designDir, "2026-04-06-abc.md"),
      "## Problem Statement\nTest\n",
    );

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "implement",
      features: [],
      artifacts: { design: ["2026-04-06-abc.md"] },
    };

    await syncGitHub(epic, { "bm-1": { issue: 10 } }, makeConfig(), makeResolved(), {
      logger,
      projectRoot: tmpDir,
    });

    const debugCalls = logger.calls.filter((c) => c.level === "debug");
    const withPhase = debugCalls.filter((c) => c.data?.phase === "implement");
    expect(withPhase.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails (RED state)**

Run: `npx vitest run src/__tests__/sync-log-cleanup.integration.test.ts --reporter=verbose`
Expected: FAIL — phase gates, log level downgrades, and phase context not yet implemented

- [ ] **Step 3: Commit**

```bash
git add cli/src/__tests__/sync-log-cleanup.integration.test.ts
git commit -m "test(sync-log-cleanup): add integration tests (RED)"
```

---

### Task 1: Phase Ordering Utility

**Wave:** 1
**Depends on:** -

**Files:**
- Modify: `cli/src/types.ts:82-85`
- Create: `cli/src/__tests__/phase-ordering.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
/**
 * Unit tests for isPhaseAtOrPast utility.
 */

import { describe, test, expect } from "vitest";
import { isPhaseAtOrPast } from "../types";

describe("isPhaseAtOrPast", () => {
  test("design is not at or past plan", () => {
    expect(isPhaseAtOrPast("design", "plan")).toBe(false);
  });

  test("plan is at or past plan", () => {
    expect(isPhaseAtOrPast("plan", "plan")).toBe(true);
  });

  test("implement is at or past plan", () => {
    expect(isPhaseAtOrPast("implement", "plan")).toBe(true);
  });

  test("release is at or past implement", () => {
    expect(isPhaseAtOrPast("release", "implement")).toBe(true);
  });

  test("design is at or past design", () => {
    expect(isPhaseAtOrPast("design", "design")).toBe(true);
  });

  test("done returns false (terminal phase)", () => {
    expect(isPhaseAtOrPast("done", "plan")).toBe(false);
  });

  test("cancelled returns false (terminal phase)", () => {
    expect(isPhaseAtOrPast("cancelled", "plan")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/phase-ordering.test.ts --reporter=verbose`
Expected: FAIL with "isPhaseAtOrPast is not a function" or similar

- [ ] **Step 3: Write the implementation**

Add `isPhaseAtOrPast` to `cli/src/types.ts` after the existing `phaseIndex` function:

```typescript
/**
 * Check if the current phase is at or past the threshold phase.
 * Returns false for terminal phases (done, cancelled) since they
 * are not part of the ordered workflow progression.
 */
export function isPhaseAtOrPast(current: Phase, threshold: Phase): boolean {
  const currentIdx = phaseIndex(current);
  const thresholdIdx = phaseIndex(threshold);
  if (currentIdx < 0 || thresholdIdx < 0) return false;
  return currentIdx >= thresholdIdx;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/phase-ordering.test.ts --reporter=verbose`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cli/src/types.ts cli/src/__tests__/phase-ordering.test.ts
git commit -m "feat(sync-log-cleanup): add isPhaseAtOrPast utility"
```

---

### Task 2: Phase Gates and Log Level Fixes in sync.ts

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/github/sync.ts:353-400` (readPrdSections)
- Modify: `cli/src/github/sync.ts:478-512` (syncGitHub — child logger)
- Modify: `cli/src/github/sync.ts:687-722` (syncFeature — plan gate)

- [ ] **Step 1: Write targeted unit tests**

Create `cli/src/__tests__/sync-phase-gates.test.ts`:

```typescript
/**
 * Unit tests for phase gates in sync.ts.
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// --- Mock Bun globals ---
try {
  Object.defineProperty(globalThis, "Bun", {
    value: {
      CryptoHasher: class {
        constructor(_algo: string) {}
        update(_data: string) {}
        digest(_format: string) {
          return "abc123";
        }
      },
      spawnSync: (_args: string[]) => ({
        success: true,
        stdout: "",
        stderr: "",
      }),
    },
    configurable: true,
  });
} catch {
  // already set
}

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

function createSpyLogger(): Logger & {
  calls: { level: string; msg: string; data?: Record<string, unknown> }[];
} {
  const calls: {
    level: string;
    msg: string;
    data?: Record<string, unknown>;
  }[] = [];
  const logger: any = {
    calls,
    info: (msg: string, data?: Record<string, unknown>) =>
      calls.push({ level: "info", msg, data }),
    debug: (msg: string, data?: Record<string, unknown>) =>
      calls.push({ level: "debug", msg, data }),
    warn: (msg: string, data?: Record<string, unknown>) =>
      calls.push({ level: "warn", msg, data }),
    error: (msg: string, data?: Record<string, unknown>) =>
      calls.push({ level: "error", msg, data }),
    child: (ctx: Record<string, unknown>) => {
      const childLogger: any = {
        calls,
        info: (msg: string, data?: Record<string, unknown>) =>
          calls.push({ level: "info", msg, data: { ...ctx, ...data } }),
        debug: (msg: string, data?: Record<string, unknown>) =>
          calls.push({ level: "debug", msg, data: { ...ctx, ...data } }),
        warn: (msg: string, data?: Record<string, unknown>) =>
          calls.push({ level: "warn", msg, data: { ...ctx, ...data } }),
        error: (msg: string, data?: Record<string, unknown>) =>
          calls.push({ level: "error", msg, data: { ...ctx, ...data } }),
        child: (ctx2: Record<string, unknown>) => childLogger,
      };
      return childLogger;
    },
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

describe("readPrdSections phase gate", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "prd-gate-"));
  });

  test("skips at design phase with debug log", async () => {
    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "design",
      features: [],
      artifacts: { design: ["missing.md"] },
    };

    await syncGitHub(epic, {}, makeConfig(), makeResolved(), {
      logger,
      projectRoot: tmpDir,
    });

    const warns = logger.calls.filter(
      (c) => c.level === "warn" && c.msg.includes("readPrdSections"),
    );
    expect(warns).toHaveLength(0);

    const debugs = logger.calls.filter(
      (c) => c.level === "debug" && c.msg.includes("skipped"),
    );
    expect(debugs.length).toBeGreaterThan(0);
  });

  test("reads at plan phase", async () => {
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    writeFileSync(
      join(designDir, "2026-04-06-abc.md"),
      "## Problem Statement\nTest\n",
    );

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "plan",
      features: [],
      artifacts: { design: ["2026-04-06-abc.md"] },
    };

    await syncGitHub(
      epic,
      { "bm-1": { issue: 10 } },
      makeConfig(),
      makeResolved(),
      { logger, projectRoot: tmpDir },
    );

    const debugCalls = logger.calls.filter((c) => c.level === "debug");
    const extracted = debugCalls.find(
      (c) => c.msg.includes("extracted") || c.msg.includes("sections"),
    );
    expect(extracted).toBeDefined();
  });
});

describe("syncFeature plan file phase gate", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "plan-gate-"));
  });

  test("skips at design phase with debug log", async () => {
    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "design",
      features: [
        { id: "bm-1.1", slug: "feat-a", status: "pending", plan: "plan.md" },
      ],
    };

    await syncGitHub(
      epic,
      { "bm-1": { issue: 10 } },
      makeConfig(),
      makeResolved(),
      { logger, projectRoot: tmpDir },
    );

    const warns = logger.calls.filter(
      (c) =>
        c.level === "warn" &&
        c.msg.includes("plan") &&
        c.msg.includes("does not exist"),
    );
    expect(warns).toHaveLength(0);
  });

  test("skips at plan phase with debug log", async () => {
    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "plan",
      features: [
        { id: "bm-1.1", slug: "feat-a", status: "pending", plan: "plan.md" },
      ],
    };

    await syncGitHub(
      epic,
      { "bm-1": { issue: 10 } },
      makeConfig(),
      makeResolved(),
      { logger, projectRoot: tmpDir },
    );

    const warns = logger.calls.filter(
      (c) =>
        c.level === "warn" &&
        c.msg.includes("plan") &&
        c.msg.includes("does not exist"),
    );
    expect(warns).toHaveLength(0);
  });

  test("reads at implement phase", async () => {
    const planDir = join(tmpDir, ".beastmode", "artifacts", "plan");
    mkdirSync(planDir, { recursive: true });
    writeFileSync(join(planDir, "plan.md"), "## User Stories\nTest\n");

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "implement",
      features: [
        { id: "bm-1.1", slug: "feat-a", status: "pending", plan: "plan.md" },
      ],
    };

    await syncGitHub(
      epic,
      { "bm-1": { issue: 10 } },
      makeConfig(),
      makeResolved(),
      { logger, projectRoot: tmpDir },
    );

    const debugCalls = logger.calls.filter((c) => c.level === "debug");
    const planLog = debugCalls.find(
      (c) => c.msg.includes("plan") && c.msg.includes("stored"),
    );
    expect(planLog).toBeDefined();
  });
});

describe("readPrdSections error downgrade", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "prd-level-"));
  });

  test("file read exception logged at warn, not error", async () => {
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    mkdirSync(join(designDir, "2026-04-06-abc.md"), { recursive: true });

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "implement",
      features: [],
      artifacts: { design: ["2026-04-06-abc.md"] },
    };

    await syncGitHub(
      epic,
      { "bm-1": { issue: 10 } },
      makeConfig(),
      makeResolved(),
      { logger, projectRoot: tmpDir },
    );

    const errors = logger.calls.filter(
      (c) => c.level === "error" && c.msg.includes("readPrdSections"),
    );
    expect(errors).toHaveLength(0);

    const warns = logger.calls.filter(
      (c) =>
        c.level === "warn" &&
        c.msg.includes("readPrdSections") &&
        c.msg.includes("failed"),
    );
    expect(warns).toHaveLength(1);
  });
});

describe("phase context enrichment", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "phase-ctx-"));
  });

  test("warn calls carry phase in context data", async () => {
    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "implement",
      features: [],
      artifacts: { design: ["missing.md"] },
    };

    await syncGitHub(
      epic,
      { "bm-1": { issue: 10 } },
      makeConfig(),
      makeResolved(),
      { logger, projectRoot: tmpDir },
    );

    const warns = logger.calls.filter((c) => c.level === "warn");
    // All sync-engine warns should carry phase
    for (const w of warns) {
      expect(w.data?.phase).toBe("implement");
    }
  });

  test("debug calls carry phase in context data", async () => {
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    writeFileSync(
      join(designDir, "2026-04-06-abc.md"),
      "## Problem Statement\nTest\n",
    );

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "implement",
      features: [],
      artifacts: { design: ["2026-04-06-abc.md"] },
    };

    await syncGitHub(
      epic,
      { "bm-1": { issue: 10 } },
      makeConfig(),
      makeResolved(),
      { logger, projectRoot: tmpDir },
    );

    const debugCalls = logger.calls.filter(
      (c) => c.level === "debug" && c.msg.includes("readPrdSections"),
    );
    for (const d of debugCalls) {
      expect(d.data?.phase).toBe("implement");
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/sync-phase-gates.test.ts --reporter=verbose`
Expected: FAIL — gates, level fixes, and phase context not yet implemented

- [ ] **Step 3: Implement phase gates and log level fixes in sync.ts**

Modify `cli/src/github/sync.ts`:

1. Add import for `isPhaseAtOrPast`:
   ```typescript
   import { isPhaseAtOrPast } from "../types.js";
   ```
   (Add next to the existing `import type { Phase } from "../types.js";`)

2. Add phase parameter and gate to `readPrdSections` (lines 353-400):
   - Add `phase: Phase` parameter after `projectRoot`
   - Add early return when `!isPhaseAtOrPast(phase, "plan")` with debug log
   - Change `logger?.error(...)` on line 397 to `logger?.warn(...)`

3. Update `syncGitHub` function (line 478+):
   - Create child logger with phase context: `const log = opts.logger?.child({ phase: epic.phase });`
   - Pass `log` instead of `opts.logger` to all internal calls
   - Pass `epic.phase` to `readPrdSections`

4. Add phase gate to `syncFeature` plan file reads (lines 698-722):
   - Add `epicPhase: Phase` parameter
   - Guard plan file reads with `isPhaseAtOrPast(epicPhase, "implement")`
   - Log skip at debug level

5. Update `syncFeature` call in `syncGitHub` to pass phase:
   ```typescript
   await syncFeature(repo, owner, epicNumber, epic.name, feature, syncRefs, resolved, result, { ...opts, logger: log }, epic.phase);
   ```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/sync-phase-gates.test.ts --reporter=verbose`
Expected: PASS

- [ ] **Step 5: Run existing sync tests to verify no regressions**

Run: `npx vitest run src/__tests__/github-sync.test.ts src/__tests__/sync-prd-logging.test.ts src/__tests__/sync-feature-logging.test.ts --reporter=verbose`
Expected: PASS (existing tests may need minor updates due to log level change)

- [ ] **Step 6: Commit**

```bash
git add cli/src/github/sync.ts cli/src/types.ts cli/src/__tests__/sync-phase-gates.test.ts
git commit -m "feat(sync-log-cleanup): add phase gates and log level fixes to sync.ts"
```

---

### Task 3: Branch-Link Log Downgrade and Phase Context

**Wave:** 2
**Depends on:** Task 1

**Files:**
- Modify: `cli/src/github/branch-link.ts:39-123`

- [ ] **Step 1: Write the failing test**

Create `cli/src/__tests__/branch-link-log-levels.test.ts`:

```typescript
/**
 * Unit tests for branch-link log level downgrade.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

const mockGhRepoNodeId = vi.hoisted(() => vi.fn());
const mockGhIssueNodeId = vi.hoisted(() => vi.fn());
const mockGhCreateLinkedBranch = vi.hoisted(() => vi.fn());

vi.mock("../github/cli.js", () => ({
  ghRepoNodeId: mockGhRepoNodeId,
  ghIssueNodeId: mockGhIssueNodeId,
  ghCreateLinkedBranch: mockGhCreateLinkedBranch,
}));

const mockGit = vi.hoisted(() =>
  vi.fn(async () => ({ stdout: "abc123", stderr: "", exitCode: 0 })),
);

vi.mock("../git/worktree.js", () => ({
  git: mockGit,
  implBranchName: (slug: string, feature: string) =>
    `impl/${slug}--${feature}`,
}));

import { linkBranches } from "../github/branch-link.js";
import type { Logger } from "../logger";

function createSpyLogger(): Logger & {
  calls: { level: string; msg: string; data?: Record<string, unknown> }[];
} {
  const calls: {
    level: string;
    msg: string;
    data?: Record<string, unknown>;
  }[] = [];
  const logger: any = {
    calls,
    info: (msg: string, data?: Record<string, unknown>) =>
      calls.push({ level: "info", msg, data }),
    debug: (msg: string, data?: Record<string, unknown>) =>
      calls.push({ level: "debug", msg, data }),
    warn: (msg: string, data?: Record<string, unknown>) =>
      calls.push({ level: "warn", msg, data }),
    error: (msg: string, data?: Record<string, unknown>) =>
      calls.push({ level: "error", msg, data }),
    child: (ctx: Record<string, unknown>) => {
      const childLogger: any = {
        calls,
        info: (msg: string, data?: Record<string, unknown>) =>
          calls.push({ level: "info", msg, data: { ...ctx, ...data } }),
        debug: (msg: string, data?: Record<string, unknown>) =>
          calls.push({ level: "debug", msg, data: { ...ctx, ...data } }),
        warn: (msg: string, data?: Record<string, unknown>) =>
          calls.push({ level: "warn", msg, data: { ...ctx, ...data } }),
        error: (msg: string, data?: Record<string, unknown>) =>
          calls.push({ level: "error", msg, data: { ...ctx, ...data } }),
        child: (ctx2: Record<string, unknown>) => childLogger,
      };
      return childLogger;
    },
  };
  return logger;
}

describe("branch-link log levels", () => {
  beforeEach(() => {
    mockGhRepoNodeId.mockReset();
    mockGhIssueNodeId.mockReset();
    mockGhCreateLinkedBranch.mockReset();
    mockGit.mockReset();
    mockGit.mockImplementation(async () => ({
      stdout: "abc123def456",
      stderr: "",
      exitCode: 0,
    }));
  });

  it("createLinkedBranch null result logged at debug, not warn", async () => {
    mockGhRepoNodeId.mockResolvedValue("R_repo123");
    mockGhIssueNodeId.mockResolvedValue("I_epic456");
    mockGhCreateLinkedBranch.mockResolvedValue(undefined);

    const logger = createSpyLogger();

    await linkBranches({
      repo: "org/repo",
      epicSlug: "my-epic",
      epicIssueNumber: 100,
      phase: "plan",
      logger,
    });

    const warns = logger.calls.filter(
      (c) =>
        c.level === "warn" && c.msg.includes("createLinkedBranch returned null"),
    );
    expect(warns).toHaveLength(0);

    const debugs = logger.calls.filter(
      (c) =>
        c.level === "debug" &&
        c.msg.includes("createLinkedBranch returned null"),
    );
    expect(debugs).toHaveLength(1);
  });

  it("warn calls include phase in context data", async () => {
    mockGhRepoNodeId.mockResolvedValue(undefined);

    const logger = createSpyLogger();

    await linkBranches({
      repo: "org/repo",
      epicSlug: "my-epic",
      epicIssueNumber: 100,
      phase: "implement",
      logger,
    });

    const warns = logger.calls.filter((c) => c.level === "warn");
    expect(warns.length).toBeGreaterThan(0);
    for (const w of warns) {
      expect(w.data?.phase).toBe("implement");
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/branch-link-log-levels.test.ts --reporter=verbose`
Expected: FAIL — log level still warn, no phase context

- [ ] **Step 3: Implement changes in branch-link.ts**

Modify `cli/src/github/branch-link.ts`:

1. In `linkBranches()` (line 40), create a child logger with phase context:
   ```typescript
   const log = (opts.logger ?? createLogger(createStdioSink(0), {})).child({ phase: opts.phase });
   ```

2. In `linkOneBranch()` (line 121), change `log?.warn?.(...)` to `log?.debug?.(...)` for the "createLinkedBranch returned null" message.

DO NOT change any other warn calls — the repo node ID and issue node ID failures are genuine errors.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/branch-link-log-levels.test.ts --reporter=verbose`
Expected: PASS

- [ ] **Step 5: Run existing branch-link tests**

Run: `npx vitest run src/__tests__/branch-link.test.ts --reporter=verbose`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add cli/src/github/branch-link.ts cli/src/__tests__/branch-link-log-levels.test.ts
git commit -m "feat(sync-log-cleanup): downgrade branch-link null to debug, add phase context"
```

---

### Task 4: Update Existing Test Expectations

**Wave:** 3
**Depends on:** Task 2

**Files:**
- Modify: `cli/src/__tests__/sync-prd-logging.test.ts:169-191`

- [ ] **Step 1: Update test expectation**

In `sync-prd-logging.test.ts`, test "logs error with path context when file read throws" (line 169):
- Change `const errorCalls = logger.calls.filter(c => c.level === "error");` to `const errorCalls = logger.calls.filter(c => c.level === "warn");`
- Update the test description from checking "error" to checking "warn"

The test creates a directory where a file is expected, causing `readFileSync` to throw. After our change, this is logged at `warn` instead of `error`.

Note: The test at line 169 currently expects `error` level. After our change in Task 2, `readPrdSections` catch block logs at `warn`. But also: this test runs with `phase: "design"`, so with the phase gate, `readPrdSections` will early-return before even hitting the file read. We need to change the test's phase to `"implement"` or later so the file read path is still exercised.

Updated test:

```typescript
  test("logs warn with path context when file read throws", async () => {
    const designDir = join(tmpDir, ".beastmode", "artifacts", "design");
    mkdirSync(designDir, { recursive: true });
    // Create a subdirectory where a file is expected — readFileSync throws on directories
    mkdirSync(join(designDir, "2026-04-06-abc.md"), { recursive: true });

    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "implement",
      features: [],
      artifacts: { design: ["2026-04-06-abc.md"] },
    };

    await syncGitHub(epic, { "bm-1": { issue: 10 } }, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const warnCalls = logger.calls.filter(c => c.level === "warn");
    const readWarn = warnCalls.find(c => c.data?.path !== undefined);
    expect(readWarn).toBeDefined();
  });
```

Also update the "logs warning when design artifact file does not exist" test (line 126) — this uses `phase: "design"`, so with the gate it will early-return before checking the file. Change phase to `"implement"`:

```typescript
  test("logs warning when design artifact file does not exist", async () => {
    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "implement",
      features: [],
      artifacts: { design: ["missing.md"] },
    };

    await syncGitHub(epic, { "bm-1": { issue: 10 } }, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const warns = logger.calls.filter(c => c.level === "warn");
    const missingWarn = warns.find(c => c.data?.path !== undefined && (c.msg.includes("not found") || c.msg.includes("does not exist")));
    expect(missingWarn).toBeDefined();
  });
```

Also update `sync-feature-logging.test.ts` — the "logs warning when feature plan file does not exist" test (line 82) uses `phase: "plan"`. With the gate, plan phase skips plan file reads. Change phase to `"implement"`:

```typescript
  test("logs warning when feature plan file does not exist", async () => {
    const logger = createSpyLogger();
    const epic: EpicSyncInput = {
      id: "bm-1",
      slug: "s",
      name: "N",
      phase: "implement",
      features: [{ id: "bm-1.1", slug: "feat-a", status: "pending", plan: "nonexistent.md" }],
    };

    await syncGitHub(epic, { "bm-1": { issue: 10 } }, makeConfig(), makeResolved(), { logger, projectRoot: tmpDir });

    const warns = logger.calls.filter(c => c.level === "warn");
    const planWarn = warns.find(c => c.msg.includes("plan") && (c.msg.includes("not found") || c.msg.includes("does not exist")));
    expect(planWarn).toBeDefined();
  });
```

- [ ] **Step 2: Run all sync tests to verify they pass**

Run: `npx vitest run src/__tests__/github-sync.test.ts src/__tests__/sync-prd-logging.test.ts src/__tests__/sync-feature-logging.test.ts src/__tests__/branch-link.test.ts src/__tests__/sync-phase-gates.test.ts src/__tests__/branch-link-log-levels.test.ts src/__tests__/sync-log-cleanup.integration.test.ts src/__tests__/phase-ordering.test.ts --reporter=verbose`
Expected: PASS (all tests)

- [ ] **Step 3: Commit**

```bash
git add cli/src/__tests__/sync-prd-logging.test.ts cli/src/__tests__/sync-feature-logging.test.ts
git commit -m "test(sync-log-cleanup): update test expectations for phase gates and log level changes"
```

---

### Task 5: Integration Test Verification (GREEN)

**Wave:** 4
**Depends on:** Task 2, Task 3, Task 4

**Files:**
- Test: `cli/src/__tests__/sync-log-cleanup.integration.test.ts`

- [ ] **Step 1: Run the integration test**

Run: `npx vitest run src/__tests__/sync-log-cleanup.integration.test.ts --reporter=verbose`
Expected: PASS (GREEN state — all phase gates, log levels, and phase context working)

- [ ] **Step 2: Run full sync test suite**

Run: `npx vitest run src/__tests__/github-sync.test.ts src/__tests__/sync-prd-logging.test.ts src/__tests__/sync-feature-logging.test.ts src/__tests__/branch-link.test.ts src/__tests__/sync-phase-gates.test.ts src/__tests__/branch-link-log-levels.test.ts src/__tests__/sync-log-cleanup.integration.test.ts src/__tests__/phase-ordering.test.ts --reporter=verbose`
Expected: PASS (all tests green, no regressions)
