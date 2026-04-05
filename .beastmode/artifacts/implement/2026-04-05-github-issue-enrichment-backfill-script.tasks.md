# Backfill Script — Implementation Tasks

## Goal

A throwaway script that iterates all existing manifests with `github.epic` set and re-syncs them through the enrichment pipeline. One-time migration, not a permanent CLI command.

## Architecture

- `syncGitHubForEpic()` in `cli/src/github/sync.ts` already wraps the full flow: load config, discover GitHub, load manifest, call syncGitHub, apply mutations
- `store.list()` in `cli/src/manifest/store.ts` returns all valid manifests
- The script filters to manifests with `github?.epic`, calls `syncGitHubForEpic()` for each, logs results
- Error handling: warn-and-continue per manifest, summary at the end

## Tech Stack

- TypeScript, Bun runtime
- Vitest for unit tests
- Imports from existing `cli/src/` modules

## File Structure

| File | Responsibility |
|------|---------------|
| `cli/scripts/backfill-enrichment.ts` | Main backfill script — iterates manifests, calls syncGitHubForEpic, prints summary |
| `cli/src/__tests__/backfill-enrichment.test.ts` | Unit tests — filtering logic, error handling, summary output |

---

### Task 0: Create the backfill script with tests

**Wave:** 1
**Depends on:** -

**Files:**
- Create: `cli/scripts/backfill-enrichment.ts`
- Create: `cli/src/__tests__/backfill-enrichment.test.ts`

- [x] **Step 1: Write the test file with core test cases**

```typescript
// cli/src/__tests__/backfill-enrichment.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// We'll test the backfill logic by extracting it into a testable function
// The script file exports a `backfill` function for testability

describe("backfill-enrichment", () => {
  let mockList: ReturnType<typeof vi.fn>;
  let mockSyncForEpic: ReturnType<typeof vi.fn>;
  let mockLoadConfig: ReturnType<typeof vi.fn>;
  let logs: string[];

  beforeEach(() => {
    mockList = vi.fn();
    mockSyncForEpic = vi.fn();
    mockLoadConfig = vi.fn();
    logs = [];
  });

  // Import the backfill function dynamically to inject mocks
  async function runBackfill(projectRoot: string) {
    // We inline the logic here to test with injected dependencies
    const { backfill } = await import("../scripts/backfill-enrichment.js");
    return backfill(projectRoot, {
      list: mockList,
      syncGitHubForEpic: mockSyncForEpic,
      loadConfig: mockLoadConfig,
    });
  }

  it("skips manifests without github.epic", async () => {
    mockLoadConfig.mockReturnValue({ github: { enabled: true } });
    mockList.mockReturnValue([
      { slug: "no-github", phase: "design", features: [], artifacts: {}, lastUpdated: "" },
      { slug: "has-github", phase: "design", features: [], artifacts: {}, lastUpdated: "", github: { epic: 42, repo: "owner/repo" } },
    ]);
    mockSyncForEpic.mockResolvedValue(undefined);

    const result = await runBackfill("/project");

    expect(mockSyncForEpic).toHaveBeenCalledTimes(1);
    expect(mockSyncForEpic).toHaveBeenCalledWith(expect.objectContaining({
      projectRoot: "/project",
      epicSlug: "has-github",
    }));
    expect(result.skipped).toBe(1);
    expect(result.synced).toBe(1);
  });

  it("reports errors without stopping", async () => {
    mockLoadConfig.mockReturnValue({ github: { enabled: true } });
    mockList.mockReturnValue([
      { slug: "epic-a", phase: "plan", features: [], artifacts: {}, lastUpdated: "", github: { epic: 1, repo: "o/r" } },
      { slug: "epic-b", phase: "plan", features: [], artifacts: {}, lastUpdated: "", github: { epic: 2, repo: "o/r" } },
    ]);
    mockSyncForEpic
      .mockRejectedValueOnce(new Error("API rate limit"))
      .mockResolvedValueOnce(undefined);

    const result = await runBackfill("/project");

    expect(result.errored).toBe(1);
    expect(result.synced).toBe(1);
    expect(result.errors[0]).toContain("epic-a");
  });

  it("returns early when github is not enabled", async () => {
    mockLoadConfig.mockReturnValue({ github: { enabled: false } });

    const result = await runBackfill("/project");

    expect(mockList).not.toHaveBeenCalled();
    expect(result.skipped).toBe(0);
    expect(result.synced).toBe(0);
    expect(result.errored).toBe(0);
  });

  it("handles empty manifest list", async () => {
    mockLoadConfig.mockReturnValue({ github: { enabled: true } });
    mockList.mockReturnValue([]);

    const result = await runBackfill("/project");

    expect(result.synced).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errored).toBe(0);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `cd cli && bun --bun vitest run src/__tests__/backfill-enrichment.test.ts`
Expected: FAIL — module not found

- [x] **Step 3: Write the backfill script**

```typescript
// cli/scripts/backfill-enrichment.ts
/**
 * One-time backfill script — re-syncs all existing manifests with GitHub issues
 * through the enrichment pipeline so bare issues get full PRD content.
 *
 * Usage: bun run scripts/backfill-enrichment.ts [project-root]
 *
 * Delete after migration is complete.
 */

import * as store from "../src/manifest/store.js";
import { syncGitHubForEpic } from "../src/github/sync.js";
import { loadConfig } from "../src/config.js";
import { createLogger } from "../src/logger.js";
import { resolve } from "path";

export interface BackfillDeps {
  list: typeof store.list;
  syncGitHubForEpic: typeof syncGitHubForEpic;
  loadConfig: typeof loadConfig;
}

export interface BackfillResult {
  synced: number;
  skipped: number;
  errored: number;
  errors: string[];
}

export async function backfill(
  projectRoot: string,
  deps: BackfillDeps = { list: store.list, syncGitHubForEpic, loadConfig },
): Promise<BackfillResult> {
  const result: BackfillResult = { synced: 0, skipped: 0, errored: 0, errors: [] };

  const config = deps.loadConfig(projectRoot);
  if (!config.github.enabled) {
    console.log("GitHub sync is disabled in config — nothing to backfill.");
    return result;
  }

  const manifests = deps.list(projectRoot);
  console.log(`Found ${manifests.length} manifest(s).`);

  for (const manifest of manifests) {
    if (!manifest.github?.epic) {
      console.log(`  SKIP  ${manifest.slug} — no GitHub issue`);
      result.skipped++;
      continue;
    }

    try {
      await deps.syncGitHubForEpic({ projectRoot, epicSlug: manifest.slug });
      console.log(`  SYNC  ${manifest.slug} (#${manifest.github.epic})`);
      result.synced++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ERROR ${manifest.slug} (#${manifest.github.epic}): ${message}`);
      result.errored++;
      result.errors.push(`${manifest.slug}: ${message}`);
    }
  }

  console.log(`\nBackfill complete: ${result.synced} synced, ${result.skipped} skipped, ${result.errored} errored.`);
  return result;
}

// CLI entry point
if (import.meta.main) {
  const projectRoot = resolve(process.argv[2] ?? process.cwd());
  backfill(projectRoot).catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
}
```

- [x] **Step 4: Run tests to verify they pass**

Run: `cd cli && bun --bun vitest run src/__tests__/backfill-enrichment.test.ts`
Expected: PASS — all 4 tests pass

- [x] **Step 5: Commit**

```bash
git add cli/scripts/backfill-enrichment.ts cli/src/__tests__/backfill-enrichment.test.ts
git commit -m "feat(backfill-script): add backfill-enrichment script with tests"
```
