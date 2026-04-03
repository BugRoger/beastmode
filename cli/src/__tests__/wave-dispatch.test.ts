import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { WatchLoop } from "../watch.js";
import type { WatchDeps } from "../watch.js";
import type { EnrichedManifest } from "../manifest/store.js";
import { SdkSessionFactory } from "../dispatch/factory.js";

const TEST_ROOT = resolve(import.meta.dir, "../../.test-wave-dispatch-tmp");

function setupTestRoot(): void {
  rmSync(TEST_ROOT, { recursive: true, force: true });
  mkdirSync(resolve(TEST_ROOT, "cli"), { recursive: true });
  mkdirSync(resolve(TEST_ROOT, ".beastmode"), { recursive: true });
}

function teardownTestRoot(): void {
  rmSync(TEST_ROOT, { recursive: true, force: true });
}

function mockDeps(overrides: Partial<WatchDeps> = {}): WatchDeps {
  return {
    scanEpics: async () => [],
    sessionFactory: new SdkSessionFactory(async (opts) => ({
      id: `${opts.epicSlug}-${opts.phase}-${Date.now()}`,
      worktreeSlug: `${opts.epicSlug}-${opts.phase}`,
      promise: Promise.resolve({
        success: true,
        exitCode: 0,
        durationMs: 500,
      }),
    })),
    ...overrides,
  };
}

describe("wave-aware dispatch", () => {
  beforeEach(setupTestRoot);
  afterEach(teardownTestRoot);

  it("only dispatches features from wave 1 when wave 2 features exist", async () => {
    const dispatched: string[] = [];
    let scanCount = 0;

    const epic: EnrichedManifest = {
      slug: "my-epic",
      manifestPath: "pipeline/my-epic.manifest.json",
      phase: "implement",
      nextAction: {
        phase: "implement",
        args: ["my-epic"],
        type: "fan-out",
        features: ["feat-a", "feat-b"], // Only wave 1 features
      },
      features: [
        { slug: "feat-a", plan: "feat-a.md", wave: 1, status: "pending" },
        { slug: "feat-b", plan: "feat-b.md", wave: 1, status: "pending" },
        { slug: "feat-c", plan: "feat-c.md", wave: 2, status: "pending" },
      ],
      artifacts: {},
      lastUpdated: "2026-03-31T00:00:00Z",
      blocked: null,
    };

    const deps = mockDeps({
      scanEpics: async () => {
        scanCount++;
        if (scanCount === 1) return [epic];
        return [{ ...epic, nextAction: null }];
      },
      sessionFactory: new SdkSessionFactory(async (opts) => {
        dispatched.push(opts.featureSlug ?? "unknown");
        return {
          id: `dispatch-${opts.featureSlug}-${Date.now()}`,
          worktreeSlug: opts.epicSlug,
          promise: Promise.resolve({
            success: true,
            exitCode: 0,
            durationMs: 500,
          }),
        };
      }),
    });

    const loop = new WatchLoop(
      { intervalSeconds: 999, projectRoot: TEST_ROOT },
      deps,
    );
    loop.setRunning(true);

    await loop.tick();

    // Only wave 1 features dispatched (feat-a, feat-b), not wave 2 (feat-c)
    expect(dispatched).toHaveLength(2);
    expect(dispatched).toContain("feat-a");
    expect(dispatched).toContain("feat-b");
    expect(dispatched).not.toContain("feat-c");

    await new Promise((r) => setTimeout(r, 50));
    await loop.stop();
  });

  it("features without wave field default to wave 1", async () => {
    const dispatched: string[] = [];
    let scanCount = 0;

    const epic: EnrichedManifest = {
      slug: "my-epic",
      manifestPath: "pipeline/my-epic.manifest.json",
      phase: "implement",
      nextAction: {
        phase: "implement",
        args: ["my-epic"],
        type: "fan-out",
        // deriveNextAction would include all of these since they all default to wave 1
        features: ["feat-a", "feat-b", "feat-c"],
      },
      features: [
        { slug: "feat-a", plan: "feat-a.md", status: "pending" },
        { slug: "feat-b", plan: "feat-b.md", status: "pending" },
        { slug: "feat-c", plan: "feat-c.md", status: "pending" },
      ],
      artifacts: {},
      lastUpdated: "2026-03-31T00:00:00Z",
      blocked: null,
    };

    const deps = mockDeps({
      scanEpics: async () => {
        scanCount++;
        if (scanCount === 1) return [epic];
        return [{ ...epic, nextAction: null }];
      },
      sessionFactory: new SdkSessionFactory(async (opts) => {
        dispatched.push(opts.featureSlug ?? "unknown");
        return {
          id: `dispatch-${opts.featureSlug}-${Date.now()}`,
          worktreeSlug: opts.epicSlug,
          promise: Promise.resolve({
            success: true,
            exitCode: 0,
            durationMs: 500,
          }),
        };
      }),
    });

    const loop = new WatchLoop(
      { intervalSeconds: 999, projectRoot: TEST_ROOT },
      deps,
    );
    loop.setRunning(true);

    await loop.tick();

    // All three dispatch since they all default to wave 1
    expect(dispatched).toHaveLength(3);

    await new Promise((r) => setTimeout(r, 50));
    await loop.stop();
  });
});
