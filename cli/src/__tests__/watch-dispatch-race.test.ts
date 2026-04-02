/**
 * Regression test for the dispatch race condition.
 *
 * When multiple implement sessions complete simultaneously, their
 * watchSession callbacks all call rescanEpic concurrently. Without
 * the reservation mechanism in DispatchTracker, each rescan would
 * see pending features with no active session and dispatch duplicates.
 *
 * This test verifies that the reserve/unreserve mechanism prevents
 * double-dispatch even when rescans interleave at await points.
 */

import { describe, test, expect } from "bun:test";
import { WatchLoop } from "../watch";
import type { WatchDeps } from "../watch";
import type { EnrichedManifest } from "../manifest-store";
import type { SessionHandle, SessionCreateOpts } from "../session";
import type { SessionResult } from "../watch-types";

function makeEpic(features: Array<{ slug: string; status: string }>): EnrichedManifest {
  return {
    slug: "test-epic",
    phase: "implement",
    manifestPath: "/tmp/test-epic/manifest.json",
    features: features.map((f) => ({
      slug: f.slug,
      plan: `${f.slug}.md`,
      status: f.status as "pending" | "completed",
    })),
    artifacts: {},
    lastUpdated: new Date().toISOString(),
    blocked: null,
    nextAction: {
      phase: "implement",
      args: ["test-epic"],
      type: "fan-out" as const,
      features: features.filter((f) => f.status === "pending").map((f) => f.slug),
    },
  };
}

describe("watch dispatch race prevention", () => {
  test("concurrent session completions do not cause duplicate dispatches", async () => {
    const dispatched: string[] = [];
    const sessionResolvers: Array<(result: SessionResult) => void> = [];

    // Track all sessions created — each has a manually-controlled promise
    const sessionFactory = {
      async create(opts: SessionCreateOpts): Promise<SessionHandle> {
        dispatched.push(opts.featureSlug ?? opts.phase);

        // Simulate async session creation (the await that causes the race)
        await new Promise((r) => setTimeout(r, 1));

        let resolver!: (result: SessionResult) => void;
        const promise = new Promise<SessionResult>((resolve) => {
          resolver = resolve;
        });
        sessionResolvers.push(resolver);

        return {
          id: `${opts.epicSlug}-${opts.featureSlug}-${Date.now()}`,
          worktreeSlug: opts.epicSlug,
          promise,
        };
      },
    };

    let scanCount = 0;
    const deps: WatchDeps = {
      scanEpics: async () => {
        scanCount++;
        // After features complete, return them as still pending
        // (simulates the race window where manifest hasn't been updated yet)
        return [
          makeEpic([
            { slug: "feat-a", status: "pending" },
            { slug: "feat-b", status: "pending" },
            { slug: "feat-c", status: "pending" },
          ]),
        ];
      },
      sessionFactory,
      logRun: async () => {},
    };

    const loop = new WatchLoop(
      { intervalSeconds: 9999, projectRoot: "/tmp/test" },
      deps,
    );
    loop.setRunning(true);

    // Initial dispatch — should create 3 sessions
    await loop.tick();
    expect(dispatched).toEqual(["feat-a", "feat-b", "feat-c"]);

    // Now complete all 3 sessions simultaneously
    const result: SessionResult = {
      success: true,
      exitCode: 0,
      costUsd: 0,
      durationMs: 100,
    };
    for (const resolve of sessionResolvers) {
      resolve(result);
    }

    // Let all microtasks and rescans settle
    await new Promise((r) => setTimeout(r, 50));

    // The rescans will try to dispatch feat-a, feat-b, feat-c again
    // (since our mock scanner always returns them as pending).
    // Without the reservation fix, each of the 3 concurrent rescans
    // would dispatch all 3 features = 9 additional dispatches.
    // With the fix, only 3 additional dispatches should happen
    // (one per feature, deduplicated by reservations).
    const redispatched = dispatched.slice(3);

    // Count dispatches per feature
    const counts = new Map<string, number>();
    for (const slug of redispatched) {
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }

    // Each feature should be dispatched at most once in the rescan wave
    for (const [, count] of counts) {
      expect(count).toBe(1);
    }
  });

  test("reservation is cleared on session create failure", async () => {
    let callCount = 0;
    const sessionFactory = {
      async create(opts: SessionCreateOpts): Promise<SessionHandle> {
        callCount++;
        if (callCount === 1) {
          // Simulate async work then failure
          await new Promise((r) => setTimeout(r, 1));
          throw new Error("session create failed");
        }
        return {
          id: `session-${callCount}`,
          worktreeSlug: opts.epicSlug,
          promise: new Promise(() => {}), // Never resolves
        };
      },
    };

    const deps: WatchDeps = {
      scanEpics: async () => [
        makeEpic([{ slug: "feat-x", status: "pending" }]),
      ],
      sessionFactory,
      logRun: async () => {},
    };

    const loop = new WatchLoop(
      { intervalSeconds: 9999, projectRoot: "/tmp/test" },
      deps,
    );
    loop.on("error", () => {}); // Prevent ERR_UNHANDLED_ERROR from emitTyped
    loop.setRunning(true);

    // First tick: create fails, reservation should be cleared
    await loop.tick();
    expect(callCount).toBe(1);

    // Second tick: should retry because reservation was cleared
    await loop.tick();
    expect(callCount).toBe(2);
  });
});
