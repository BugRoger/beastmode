# Early Issue Creation

## Goal

Add a pre-dispatch step in the pipeline runner that creates GitHub stub issues before the phase skill runs. Epic issues are created before design phase; feature issues before implement phase. Issue numbers are recorded in the manifest immediately so they're available from the first commit.

## Architecture

- **New module:** `cli/src/github/early-issues.ts` — pure pre-dispatch logic, separated from the full sync engine
- **Integration point:** `cli/src/pipeline/runner.ts` — new step 3.5 between settings.create (step 3) and dispatch.run (step 4)
- **Dependencies:** `cli/src/github/cli.ts` (`ghIssueCreate`), `cli/src/manifest/store.ts` (load/transact), `cli/src/github/discovery.ts` (`discoverGitHub`)
- **Pattern:** Warn-and-continue — failures log a warning and return gracefully, never block dispatch
- **Idempotency:** If manifest already has an issue number (epic or feature), skip creation

## Tech Stack

- TypeScript, Bun runtime
- Vitest for tests (import from "vitest", NOT "bun:test")
- `gh` CLI wrapper via `cli/src/github/cli.ts`

## Locked Decisions (from design)

- Stub issues contain slug as title, phase badge label, and type label
- Body is a minimal placeholder — full enrichment happens at the post-dispatch sync
- Epic issues created before design phase only
- Feature issues created before implement phase only (after plan produces features in manifest)
- Warn-and-continue on GitHub API failure — never blocks dispatch
- Idempotent — no duplicates on re-run

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `cli/src/github/early-issues.ts` | Create | Pre-dispatch stub issue creation logic |
| `cli/src/__tests__/early-issues.test.ts` | Create | Unit tests for early issue creation |
| `cli/src/pipeline/runner.ts` | Modify | Add pre-dispatch early issue creation step |
| `cli/src/__tests__/pipeline-runner.test.ts` | Modify | Add tests for early issue creation integration |

---

### Task 0: Create early-issues module with epic stub creation

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/src/github/early-issues.ts`
- Test: `cli/src/__tests__/early-issues.test.ts`

- [x] **Step 1: Write the failing test for ensureEpicIssue**

Create `cli/src/__tests__/early-issues.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Module-level mocks (hoisted) ---
const mockGhIssueCreate = vi.hoisted(() => vi.fn());
vi.mock("../github/cli.js", () => ({
  ghIssueCreate: mockGhIssueCreate,
}));

const mockStoreLoad = vi.hoisted(() => vi.fn());
const mockStoreTransact = vi.hoisted(() => vi.fn());
vi.mock("../manifest/store.js", () => ({
  load: mockStoreLoad,
  transact: mockStoreTransact,
}));

const mockDiscoverGitHub = vi.hoisted(() => vi.fn());
vi.mock("../github/discovery.js", () => ({
  discoverGitHub: mockDiscoverGitHub,
}));

import { ensureEarlyIssues } from "../github/early-issues.js";

const nullLogger = {
  log: () => {},
  detail: () => {},
  debug: () => {},
  trace: () => {},
  warn: () => {},
  error: () => {},
  child: () => nullLogger,
} as any;

describe("ensureEarlyIssues", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDiscoverGitHub.mockResolvedValue({ repo: "owner/repo" });
  });

  describe("epic stub creation (design phase)", () => {
    it("creates epic stub issue before design phase when manifest has no epic issue", async () => {
      mockStoreLoad.mockReturnValue({
        slug: "my-epic",
        phase: "design",
        features: [],
        artifacts: {},
        lastUpdated: new Date().toISOString(),
      });
      mockGhIssueCreate.mockResolvedValue(42);
      mockStoreTransact.mockImplementation(async (_root: string, _slug: string, fn: Function) => {
        return fn({ slug: "my-epic", phase: "design", features: [], artifacts: {}, lastUpdated: new Date().toISOString() });
      });

      await ensureEarlyIssues({
        phase: "design",
        epicSlug: "my-epic",
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        logger: nullLogger,
      });

      expect(mockGhIssueCreate).toHaveBeenCalledWith(
        "owner/repo",
        "my-epic",
        expect.any(String),
        ["type/epic", "phase/design"],
        { logger: nullLogger },
      );
      expect(mockStoreTransact).toHaveBeenCalled();
    });

    it("skips epic creation when manifest already has epic issue number", async () => {
      mockStoreLoad.mockReturnValue({
        slug: "my-epic",
        phase: "design",
        features: [],
        artifacts: {},
        github: { epic: 42, repo: "owner/repo" },
        lastUpdated: new Date().toISOString(),
      });

      await ensureEarlyIssues({
        phase: "design",
        epicSlug: "my-epic",
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        logger: nullLogger,
      });

      expect(mockGhIssueCreate).not.toHaveBeenCalled();
    });

    it("skips epic creation for non-design phases", async () => {
      mockStoreLoad.mockReturnValue({
        slug: "my-epic",
        phase: "plan",
        features: [],
        artifacts: {},
        lastUpdated: new Date().toISOString(),
      });

      await ensureEarlyIssues({
        phase: "plan",
        epicSlug: "my-epic",
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        logger: nullLogger,
      });

      expect(mockGhIssueCreate).not.toHaveBeenCalled();
    });

    it("warns and continues when epic creation fails", async () => {
      mockStoreLoad.mockReturnValue({
        slug: "my-epic",
        phase: "design",
        features: [],
        artifacts: {},
        lastUpdated: new Date().toISOString(),
      });
      mockGhIssueCreate.mockResolvedValue(undefined);

      const warnSpy = vi.fn();
      const logger = { ...nullLogger, warn: warnSpy };

      await ensureEarlyIssues({
        phase: "design",
        epicSlug: "my-epic",
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        logger,
      });

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("epic stub"));
      expect(mockStoreTransact).not.toHaveBeenCalled();
    });
  });

  describe("feature stub creation (implement phase)", () => {
    it("creates feature stub issues before implement phase", async () => {
      mockStoreLoad.mockReturnValue({
        slug: "my-epic",
        phase: "implement",
        features: [
          { slug: "feat-a", plan: "plan-a", status: "pending" },
          { slug: "feat-b", plan: "plan-b", status: "pending" },
        ],
        artifacts: {},
        github: { epic: 10, repo: "owner/repo" },
        lastUpdated: new Date().toISOString(),
      });
      mockGhIssueCreate
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(21);
      mockStoreTransact.mockImplementation(async (_root: string, _slug: string, fn: Function) => {
        return fn(mockStoreLoad());
      });

      await ensureEarlyIssues({
        phase: "implement",
        epicSlug: "my-epic",
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        logger: nullLogger,
      });

      expect(mockGhIssueCreate).toHaveBeenCalledTimes(2);
      expect(mockStoreTransact).toHaveBeenCalled();
    });

    it("skips features that already have issue numbers", async () => {
      mockStoreLoad.mockReturnValue({
        slug: "my-epic",
        phase: "implement",
        features: [
          { slug: "feat-a", plan: "plan-a", status: "pending", github: { issue: 20 } },
          { slug: "feat-b", plan: "plan-b", status: "pending" },
        ],
        artifacts: {},
        github: { epic: 10, repo: "owner/repo" },
        lastUpdated: new Date().toISOString(),
      });
      mockGhIssueCreate.mockResolvedValue(21);
      mockStoreTransact.mockImplementation(async (_root: string, _slug: string, fn: Function) => {
        return fn(mockStoreLoad());
      });

      await ensureEarlyIssues({
        phase: "implement",
        epicSlug: "my-epic",
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        logger: nullLogger,
      });

      expect(mockGhIssueCreate).toHaveBeenCalledTimes(1);
      expect(mockGhIssueCreate).toHaveBeenCalledWith(
        "owner/repo",
        "feat-b",
        expect.any(String),
        ["type/feature", "status/ready"],
        { logger: nullLogger },
      );
    });

    it("skips feature creation for non-implement phases", async () => {
      mockStoreLoad.mockReturnValue({
        slug: "my-epic",
        phase: "validate",
        features: [
          { slug: "feat-a", plan: "plan-a", status: "pending" },
        ],
        artifacts: {},
        github: { epic: 10, repo: "owner/repo" },
        lastUpdated: new Date().toISOString(),
      });

      await ensureEarlyIssues({
        phase: "validate",
        epicSlug: "my-epic",
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        logger: nullLogger,
      });

      expect(mockGhIssueCreate).not.toHaveBeenCalled();
    });

    it("skips feature creation when epic has no issue number", async () => {
      mockStoreLoad.mockReturnValue({
        slug: "my-epic",
        phase: "implement",
        features: [
          { slug: "feat-a", plan: "plan-a", status: "pending" },
        ],
        artifacts: {},
        lastUpdated: new Date().toISOString(),
      });

      await ensureEarlyIssues({
        phase: "implement",
        epicSlug: "my-epic",
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        logger: nullLogger,
      });

      expect(mockGhIssueCreate).not.toHaveBeenCalled();
    });
  });

  describe("guards", () => {
    it("skips entirely when github.enabled is false", async () => {
      await ensureEarlyIssues({
        phase: "design",
        epicSlug: "my-epic",
        projectRoot: "/tmp/test",
        config: { github: { enabled: false } } as any,
        logger: nullLogger,
      });

      expect(mockStoreLoad).not.toHaveBeenCalled();
      expect(mockDiscoverGitHub).not.toHaveBeenCalled();
    });

    it("skips when GitHub discovery fails", async () => {
      mockDiscoverGitHub.mockResolvedValue(undefined);

      await ensureEarlyIssues({
        phase: "design",
        epicSlug: "my-epic",
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        logger: nullLogger,
      });

      expect(mockGhIssueCreate).not.toHaveBeenCalled();
    });

    it("skips when manifest not found", async () => {
      mockStoreLoad.mockReturnValue(null);

      await ensureEarlyIssues({
        phase: "design",
        epicSlug: "my-epic",
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        logger: nullLogger,
      });

      expect(mockGhIssueCreate).not.toHaveBeenCalled();
    });

    it("uses pre-resolved GitHub data when provided", async () => {
      mockStoreLoad.mockReturnValue({
        slug: "my-epic",
        phase: "design",
        features: [],
        artifacts: {},
        lastUpdated: new Date().toISOString(),
      });
      mockGhIssueCreate.mockResolvedValue(42);
      mockStoreTransact.mockImplementation(async (_root: string, _slug: string, fn: Function) => {
        return fn(mockStoreLoad());
      });

      await ensureEarlyIssues({
        phase: "design",
        epicSlug: "my-epic",
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        resolved: { repo: "pre/resolved" } as any,
        logger: nullLogger,
      });

      expect(mockDiscoverGitHub).not.toHaveBeenCalled();
      expect(mockGhIssueCreate).toHaveBeenCalledWith(
        "pre/resolved",
        expect.any(String),
        expect.any(String),
        expect.any(Array),
        expect.any(Object),
      );
    });

    it("never throws — catches exceptions and warns", async () => {
      mockStoreLoad.mockImplementation(() => { throw new Error("kaboom"); });

      const warnSpy = vi.fn();
      const logger = { ...nullLogger, warn: warnSpy };

      await ensureEarlyIssues({
        phase: "design",
        epicSlug: "my-epic",
        projectRoot: "/tmp/test",
        config: { github: { enabled: true } } as any,
        logger,
      });

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("kaboom"));
    });
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/early-issues.test.ts`
Expected: FAIL — module `../github/early-issues.js` not found

- [x] **Step 3: Write the ensureEarlyIssues implementation**

Create `cli/src/github/early-issues.ts`:

```typescript
/**
 * Early Issue Creation — pre-dispatch stub issue creation.
 *
 * Creates minimal GitHub stub issues before the phase skill runs,
 * so issue numbers are available from the first commit.
 *
 * Epic stubs: created before design phase.
 * Feature stubs: created before implement phase.
 *
 * Follows warn-and-continue — never blocks dispatch on failure.
 */

import type { Phase } from "../types.js";
import type { BeastmodeConfig } from "../config.js";
import type { ResolvedGitHub } from "./discovery.js";
import type { Logger } from "../logger.js";
import { discoverGitHub } from "./discovery.js";
import { ghIssueCreate } from "./cli.js";
import * as store from "../manifest/store.js";
import { setGitHubEpic, setFeatureGitHubIssue } from "../manifest/pure.js";

/** Options for the pre-dispatch early issue creation step. */
export interface EarlyIssueOpts {
  phase: Phase;
  epicSlug: string;
  projectRoot: string;
  config: BeastmodeConfig;
  resolved?: ResolvedGitHub;
  logger?: Logger;
}

/**
 * Ensure GitHub stub issues exist before dispatch.
 *
 * - Design phase: creates epic stub issue (slug as title, type/epic + phase/design labels).
 * - Implement phase: creates feature stub issues (slug as title, type/feature + status/ready labels).
 * - Other phases: no-op.
 *
 * Idempotent — skips creation if manifest already has the issue number.
 * Never throws — all errors are caught and logged as warnings.
 */
export async function ensureEarlyIssues(opts: EarlyIssueOpts): Promise<void> {
  const { phase, epicSlug, projectRoot, config, logger } = opts;

  // Guard: GitHub must be enabled
  if (!config.github.enabled) return;

  // Guard: only design and implement phases need early issues
  if (phase !== "design" && phase !== "implement") return;

  try {
    // Resolve GitHub repo
    const resolved = opts.resolved ?? await discoverGitHub(projectRoot, config.github["project-name"]);
    if (!resolved) {
      logger?.warn("early issues: GitHub discovery failed — skipping");
      return;
    }
    const repo = resolved.repo;

    // Load manifest
    const manifest = store.load(projectRoot, epicSlug);
    if (!manifest) {
      logger?.detail?.("early issues: no manifest — skipping");
      return;
    }

    if (phase === "design") {
      await ensureEpicStub(manifest, repo, epicSlug, projectRoot, logger);
    } else if (phase === "implement") {
      await ensureFeatureStubs(manifest, repo, epicSlug, projectRoot, logger);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger?.warn(`early issues failed (non-blocking): ${message}`);
  }
}

/** Create a minimal epic stub issue if one doesn't exist yet. */
async function ensureEpicStub(
  manifest: store.PipelineManifest,
  repo: string,
  epicSlug: string,
  projectRoot: string,
  logger?: Logger,
): Promise<void> {
  if (manifest.github?.epic) {
    logger?.detail?.("early issues: epic already has issue number — skipping");
    return;
  }

  const stubBody = `**Phase:** design\n\n_Stub issue — content will be enriched after the design phase completes._`;

  const epicNumber = await ghIssueCreate(
    repo,
    manifest.slug,
    stubBody,
    ["type/epic", "phase/design"],
    { logger },
  );

  if (!epicNumber) {
    logger?.warn("early issues: epic stub creation failed — sync will retry at post-dispatch");
    return;
  }

  await store.transact(projectRoot, epicSlug, (m) => {
    return setGitHubEpic(m, epicNumber, repo);
  });

  logger?.log(`early issues: epic stub created (#${epicNumber})`);
}

/** Create minimal feature stub issues for features missing issue numbers. */
async function ensureFeatureStubs(
  manifest: store.PipelineManifest,
  repo: string,
  epicSlug: string,
  projectRoot: string,
  logger?: Logger,
): Promise<void> {
  // Guard: need an epic issue number for feature back-reference
  if (!manifest.github?.epic) {
    logger?.detail?.("early issues: no epic issue — skipping feature stubs");
    return;
  }

  const epicNumber = manifest.github.epic;
  const featuresToCreate = manifest.features.filter((f) => !f.github?.issue);

  if (featuresToCreate.length === 0) {
    logger?.detail?.("early issues: all features already have issue numbers");
    return;
  }

  // Create stubs and collect mutations
  const mutations: Array<{ featureSlug: string; issueNumber: number }> = [];

  for (const feature of featuresToCreate) {
    const stubBody = `**Epic:** #${epicNumber}\n\n_Stub issue — content will be enriched after the implement phase completes._`;

    const issueNumber = await ghIssueCreate(
      repo,
      feature.slug,
      stubBody,
      ["type/feature", "status/ready"],
      { logger },
    );

    if (issueNumber) {
      mutations.push({ featureSlug: feature.slug, issueNumber });
      logger?.log(`early issues: feature stub created for ${feature.slug} (#${issueNumber})`);
    } else {
      logger?.warn(`early issues: feature stub creation failed for ${feature.slug} — sync will retry at post-dispatch`);
    }
  }

  // Apply all mutations in a single transaction
  if (mutations.length > 0) {
    await store.transact(projectRoot, epicSlug, (m) => {
      let updated = m;
      for (const mut of mutations) {
        updated = setFeatureGitHubIssue(updated, mut.featureSlug, mut.issueNumber);
      }
      return updated;
    });
  }
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd cli && bun --bun vitest run src/__tests__/early-issues.test.ts`
Expected: PASS — all tests green

- [x] **Step 5: Commit**

```bash
git add cli/src/github/early-issues.ts cli/src/__tests__/early-issues.test.ts
git commit -m "feat(early-issue-creation): add ensureEarlyIssues module with tests"
```

---

### Task 1: Integrate early issue creation into pipeline runner

**Wave:** 2
**Depends on:** Task 0

**Files:**
- Modify: `cli/src/pipeline/runner.ts`
- Modify: `cli/src/__tests__/pipeline-runner.test.ts`

- [x] **Step 1: Write the failing tests for runner integration**

Add to `cli/src/__tests__/pipeline-runner.test.ts`:

In the mock section (after the existing mocks), add the early-issues mock:

```typescript
// Mock github/early-issues
const mockEnsureEarlyIssues = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("../github/early-issues.js", () => ({
  ensureEarlyIssues: mockEnsureEarlyIssues,
}));
```

In the `resetAllMocks` function, add: `mockEnsureEarlyIssues.mockClear();`

Add a new describe block:

```typescript
describe("early issue creation", () => {
  it("calls ensureEarlyIssues before dispatch for design phase", async () => {
    const callOrder: string[] = [];

    mockEnsureEarlyIssues.mockImplementation(async () => {
      callOrder.push("early-issues");
    });
    const dispatch = async () => {
      callOrder.push("dispatch");
      return { success: true };
    };

    await run(makeConfig({ phase: "design", dispatch }));

    expect(callOrder).toEqual(["early-issues", "dispatch"]);
  });

  it("calls ensureEarlyIssues before dispatch for implement phase", async () => {
    const callOrder: string[] = [];

    mockEnsureEarlyIssues.mockImplementation(async () => {
      callOrder.push("early-issues");
    });
    const dispatch = async () => {
      callOrder.push("dispatch");
      return { success: true };
    };

    await run(makeConfig({ phase: "implement", featureSlug: "my-feat", dispatch }));

    expect(callOrder).toEqual(["early-issues", "dispatch"]);
  });

  it("passes correct arguments to ensureEarlyIssues", async () => {
    await run(makeConfig({
      phase: "design",
      epicSlug: "my-epic",
      config: {
        hitl: { model: "claude-sonnet-4-5-20250514", timeout: 30, design: "", plan: "", implement: "", validate: "", release: "" },
        "file-permissions": { timeout: 60, "claude-settings": "test" },
        github: { enabled: true },
        cli: {},
      } as any,
    }));

    expect(mockEnsureEarlyIssues).toHaveBeenCalledWith({
      phase: "design",
      epicSlug: "my-epic",
      projectRoot: "/tmp/test-project",
      config: expect.objectContaining({ github: { enabled: true } }),
      resolved: undefined,
      logger: expect.anything(),
    });
  });

  it("passes pre-resolved GitHub data to ensureEarlyIssues", async () => {
    const resolved = { repo: "test/repo" } as any;

    await run(makeConfig({ phase: "design", resolved }));

    expect(mockEnsureEarlyIssues).toHaveBeenCalledWith(
      expect.objectContaining({ resolved }),
    );
  });

  it("continues dispatch even when ensureEarlyIssues throws", async () => {
    mockEnsureEarlyIssues.mockRejectedValue(new Error("early issues kaboom"));

    const result = await run(makeConfig({ phase: "design" }));

    expect(result.success).toBe(true);
  });

  it("skips ensureEarlyIssues when skipPreDispatch is true", async () => {
    await run(makeConfig({ phase: "design", skipPreDispatch: true }));

    expect(mockEnsureEarlyIssues).not.toHaveBeenCalled();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/pipeline-runner.test.ts`
Expected: FAIL — ensureEarlyIssues not called (not imported yet in runner)

- [x] **Step 3: Add early issue creation step to runner.ts**

In `cli/src/pipeline/runner.ts`:

Add import after existing imports:
```typescript
import { ensureEarlyIssues } from "../github/early-issues.js";
```

Add the pre-dispatch early issue creation step after the impl branch creation block (line 166) and before Step 4 dispatch (line 168). Insert between the closing `}` of the impl branch block and the `// -- Step 4:` comment:

```typescript
  // -- Step 3.5: github.early-issues -----------------------------------------
  // Create stub GitHub issues before dispatch so issue numbers are available
  // for commit references from the first commit.
  try {
    await ensureEarlyIssues({
      phase: config.phase,
      epicSlug,
      projectRoot: config.projectRoot,
      config: config.config,
      resolved: config.resolved,
      logger,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`early issue creation failed (non-blocking): ${message}`);
  }
```

- [x] **Step 4: Run test to verify it passes**

Run: `cd cli && bun --bun vitest run src/__tests__/pipeline-runner.test.ts`
Expected: PASS — all tests green (including existing tests)

- [x] **Step 5: Run full test suite to check for regressions**

Run: `cd cli && bun --bun vitest run`
Expected: PASS — no regressions

- [x] **Step 6: Commit**

```bash
git add cli/src/pipeline/runner.ts cli/src/__tests__/pipeline-runner.test.ts
git commit -m "feat(early-issue-creation): integrate pre-dispatch issue creation into pipeline runner"
```
