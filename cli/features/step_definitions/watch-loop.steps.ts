/**
 * Step definitions for the watch-loop happy-path integration test.
 *
 * Tests the WatchLoop class with two epics running in parallel through
 * design → plan → implement → validate → release. Mock boundary: both
 * scanEpics and SessionFactory are mocked. No git, no filesystem.
 */

import { Given, When, Then, DataTable } from "@cucumber/cucumber";
import { strict as assert } from "node:assert";
import type { WatchLoopWorld } from "../support/watch-world.js";

// -- Given --

Given(
  "epic {string} with features:",
  function (this: WatchLoopWorld, epicSlug: string, table: DataTable) {
    const features = table.hashes().map((row) => {
      const feature: any = {
        slug: row.feature,
        wave: row.wave ? parseInt(row.wave, 10) : 1,
      };
      if (row.depends_on) {
        feature.depends_on = row.depends_on
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
      return feature;
    });
    this.epicDefs.set(epicSlug, { slug: epicSlug, features });
  },
);

Given("the watch loop is initialized", function (this: WatchLoopWorld) {
  this.initLoop();
});

// -- When --

When(
  "both epics are seeded in {string} phase with next action {string}",
  function (this: WatchLoopWorld, phase: string, nextPhase: string) {
    this.seedEpics(phase, nextPhase);
  },
);

When("the watch loop ticks", async function (this: WatchLoopWorld) {
  await this.loop.tick();
  // Brief wait for session dispatch to complete
  await new Promise((r) => setTimeout(r, 20));
});

When(
  "all active sessions complete successfully",
  async function (this: WatchLoopWorld) {
    await this.completeAllSessions();
  },
);

When(
  "the active release session completes successfully",
  async function (this: WatchLoopWorld) {
    await this.completeReleaseSession();
  },
);

// -- Then --

Then(
  "sessions should be active for:",
  function (this: WatchLoopWorld, table: DataTable) {
    const expected = table.hashes().map((row) => ({
      epicSlug: row.epic,
      phase: row.phase,
    }));

    const active = this.getActiveSessions();

    for (const exp of expected) {
      const found = active.some(
        (s) => s.epicSlug === exp.epicSlug && s.phase === exp.phase,
      );
      assert.ok(
        found,
        `Expected active session for ${exp.epicSlug}/${exp.phase} but found: ${JSON.stringify(active)}`,
      );
    }

    // Also check no unexpected non-implement sessions
    const nonImplementActive = active.filter((s) => s.phase !== "implement");
    const nonImplementExpected = expected.filter((e) => e.phase !== "implement");
    assert.strictEqual(
      nonImplementActive.length,
      nonImplementExpected.length,
      `Expected ${nonImplementExpected.length} non-implement sessions, got ${nonImplementActive.length}: ${JSON.stringify(nonImplementActive)}`,
    );
  },
);

Then(
  "implement sessions should respect wave ordering:",
  function (this: WatchLoopWorld, table: DataTable) {
    for (const row of table.hashes()) {
      const epicSlug = row.epic;
      const expectedActive = row["active features"]
        ? row["active features"].split(",").map((s: string) => s.trim())
        : [];
      const expectedHeld = row["held features"]
        ? row["held features"].split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];

      const activeFeatures = this.getActiveFeatureSessions(epicSlug);

      // All expected active features should be dispatched
      for (const feat of expectedActive) {
        assert.ok(
          activeFeatures.includes(feat),
          `Expected feature "${feat}" to be active for ${epicSlug}, active: [${activeFeatures}]`,
        );
      }

      // No held features should be dispatched
      for (const feat of expectedHeld) {
        assert.ok(
          !activeFeatures.includes(feat),
          `Feature "${feat}" should be held for ${epicSlug} but is active`,
        );
      }

      assert.strictEqual(
        activeFeatures.length,
        expectedActive.length,
        `${epicSlug}: expected ${expectedActive.length} active implement sessions, got ${activeFeatures.length}: [${activeFeatures}]`,
      );
    }
  },
);

Then(
  "implement sessions should respect dependency ordering:",
  function (this: WatchLoopWorld, table: DataTable) {
    for (const row of table.hashes()) {
      const epicSlug = row.epic;
      const expectedActive = row["active features"]
        ? row["active features"].split(",").map((s: string) => s.trim())
        : [];
      const expectedHeld = row["held features"]
        ? row["held features"].split(",").map((s: string) => s.trim()).filter(Boolean)
        : [];

      const activeFeatures = this.getActiveFeatureSessions(epicSlug);

      for (const feat of expectedActive) {
        assert.ok(
          activeFeatures.includes(feat),
          `Expected feature "${feat}" to be active for ${epicSlug}, active: [${activeFeatures}]`,
        );
      }

      for (const feat of expectedHeld) {
        assert.ok(
          !activeFeatures.includes(feat),
          `Feature "${feat}" should be held for ${epicSlug} but is active`,
        );
      }

      assert.strictEqual(
        activeFeatures.length,
        expectedActive.length,
        `${epicSlug}: expected ${expectedActive.length} active implement sessions, got ${activeFeatures.length}: [${activeFeatures}]`,
      );
    }
  },
);

Then(
  "{int} release session(s) should be active",
  function (this: WatchLoopWorld, count: number) {
    const tracker = this.loop.getTracker();
    const releaseSessions = tracker.getAll().filter((s) => s.phase === "release");
    assert.strictEqual(
      releaseSessions.length,
      count,
      `Expected ${count} release session(s), got ${releaseSessions.length}`,
    );
  },
);

Then(
  "{int} release(s) should be held",
  function (this: WatchLoopWorld, count: number) {
    assert.strictEqual(
      this.heldReleases.length,
      count,
      `Expected ${count} held release(s), got ${this.heldReleases.length}: ${JSON.stringify(this.heldReleases)}`,
    );
  },
);

Then(
  "the dispatch log should have {int} total dispatches",
  function (this: WatchLoopWorld, count: number) {
    assert.strictEqual(
      this.dispatchLog.length,
      count,
      `Expected ${count} total dispatches, got ${this.dispatchLog.length}:\n${this.dispatchLog.map((d) => `  ${d.phase} ${d.epicSlug} ${d.featureSlug ?? ""}`).join("\n")}`,
    );
  },
);

Then(
  "both epics should be at phase {string}",
  function (this: WatchLoopWorld, phase: string) {
    for (const [slug, manifest] of this.manifests) {
      assert.strictEqual(
        manifest.phase,
        phase,
        `Epic "${slug}" is at phase "${manifest.phase}", expected "${phase}"`,
      );
    }
  },
);
