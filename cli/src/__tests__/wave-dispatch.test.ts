import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { WatchLoop } from "../commands/watch-loop.js";
import type { WatchDeps } from "../commands/watch-loop.js";
import type { EnrichedEpic } from "../store/types.js";

const TEST_ROOT = resolve(import.meta.dirname, "../../.test-wave-dispatch-tmp");

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
    sessionFactory: {
      create: async (opts) => ({
        id: `${opts.epicSlug}-${opts.phase}-${Date.now()}`,
        worktreeSlug: `${opts.epicSlug}-${opts.phase}`,
        promise: Promise.resolve({
          success: true,
          exitCode: 0,
          durationMs: 500,
        }),
      }),
    },
    ...overrides,
  };
}

describe("wave-aware dispatch", () => {
  beforeEach(setupTestRoot);
  afterEach(teardownTestRoot);

  it("only dispatches features from wave 1 when wave 2 features exist", async () => {
    const dispatched: string[] = [];
    let scanCount = 0;

    const epic: EnrichedEpic = {
      id: "bm-wave",
      type: "epic",
      slug: "my-epic",
      name: "My Epic",
      status: "implement",
      depends_on: [],
      created_at: "2026-03-31T00:00:00Z",
      updated_at: "2026-03-31T00:00:00Z",
      nextAction: {
        phase: "implement",
        args: ["my-epic"],
        type: "fan-out",
        features: ["feat-a", "feat-b"],
      },
      features: [
        { id: "f1", type: "feature", parent: "bm-wave", slug: "feat-a", name: "Feature A", status: "pending" as const, plan: "feat-a.md", depends_on: [], created_at: "2026-03-31T00:00:00Z", updated_at: "2026-03-31T00:00:00Z" },
        { id: "f2", type: "feature", parent: "bm-wave", slug: "feat-b", name: "Feature B", status: "pending" as const, plan: "feat-b.md", depends_on: [], created_at: "2026-03-31T00:00:00Z", updated_at: "2026-03-31T00:00:00Z" },
        { id: "f3", type: "feature", parent: "bm-wave", slug: "feat-c", name: "Feature C", status: "pending" as const, plan: "feat-c.md", depends_on: [], created_at: "2026-03-31T00:00:00Z", updated_at: "2026-03-31T00:00:00Z" },
      ],
    };

    const deps = mockDeps({
      scanEpics: async () => {
        scanCount++;
        if (scanCount === 1) return [epic];
        return [{ ...epic, nextAction: null }];
      },
      sessionFactory: {
        create: async (opts) => {
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
        },
      },
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

    const epic: EnrichedEpic = {
      id: "bm-wave2",
      type: "epic",
      slug: "my-epic",
      name: "My Epic",
      status: "implement",
      depends_on: [],
      created_at: "2026-03-31T00:00:00Z",
      updated_at: "2026-03-31T00:00:00Z",
      nextAction: {
        phase: "implement",
        args: ["my-epic"],
        type: "fan-out",
        features: ["feat-a", "feat-b", "feat-c"],
      },
      features: [
        { id: "f1", type: "feature", parent: "bm-wave2", slug: "feat-a", name: "Feature A", status: "pending" as const, plan: "feat-a.md", depends_on: [], created_at: "2026-03-31T00:00:00Z", updated_at: "2026-03-31T00:00:00Z" },
        { id: "f2", type: "feature", parent: "bm-wave2", slug: "feat-b", name: "Feature B", status: "pending" as const, plan: "feat-b.md", depends_on: [], created_at: "2026-03-31T00:00:00Z", updated_at: "2026-03-31T00:00:00Z" },
        { id: "f3", type: "feature", parent: "bm-wave2", slug: "feat-c", name: "Feature C", status: "pending" as const, plan: "feat-c.md", depends_on: [], created_at: "2026-03-31T00:00:00Z", updated_at: "2026-03-31T00:00:00Z" },
      ],
    };

    const deps = mockDeps({
      scanEpics: async () => {
        scanCount++;
        if (scanCount === 1) return [epic];
        return [{ ...epic, nextAction: null }];
      },
      sessionFactory: {
        create: async (opts) => {
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
        },
      },
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
