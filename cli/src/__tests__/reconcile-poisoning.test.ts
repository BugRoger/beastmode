/**
 * Regression test: first feature completing must NOT poison other features.
 *
 * Exercises reconcileFeature directly with real filesystem state.
 * The bug: the old reconcileState loaded the epic-level output (which matched
 * any feature output), and enrich() would overwrite all feature statuses.
 *
 * After the fix: reconcileFeature loads feature-specific output only,
 * and only marks the feature completed if the output says so.
 */

import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { reconcileFeature } from "../manifest/reconcile";
import type { PipelineManifest } from "../manifest/pure";

const TEST_ROOT = resolve(import.meta.dirname, "../../.test-reconcile");
const WORKTREE = resolve(TEST_ROOT, "worktree");
const EPIC = "my-epic";
const DATE = new Date().toISOString().slice(0, 10);

function setup(): void {
  if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true });
  mkdirSync(TEST_ROOT, { recursive: true });
  mkdirSync(WORKTREE, { recursive: true });

  // Config with GitHub disabled
  const configDir = resolve(TEST_ROOT, ".beastmode");
  mkdirSync(configDir, { recursive: true });
  writeFileSync(resolve(configDir, "config.yaml"), "github:\n  enabled: false\n");
}

function writeManifest(manifest: PipelineManifest): void {
  const dir = resolve(TEST_ROOT, ".beastmode", "state");
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, `${DATE}-${EPIC}.manifest.json`), JSON.stringify(manifest, null, 2));
}

function readManifest(): PipelineManifest {
  const dir = resolve(TEST_ROOT, ".beastmode", "state");
  const files = require("fs").readdirSync(dir) as string[];
  const match = files.find((f: string) => f.endsWith(`-${EPIC}.manifest.json`));
  if (!match) throw new Error(`No manifest for ${EPIC}`);
  return JSON.parse(readFileSync(resolve(dir, match), "utf-8"));
}

/** Write a feature-level output.json to the worktree artifacts dir. */
function writeFeatureOutput(
  featureSlug: string,
  output: { status: string; artifacts: unknown },
): void {
  const dir = resolve(WORKTREE, ".beastmode", "artifacts", "implement");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    resolve(dir, `${DATE}-${EPIC}-${featureSlug}.output.json`),
    JSON.stringify(output, null, 2),
  );
}

/** Write an epic-level output.json (the old buggy path would pick this up). */
function writeEpicOutput(
  output: { status: string; artifacts: unknown },
): void {
  const dir = resolve(WORKTREE, ".beastmode", "artifacts", "implement");
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    resolve(dir, `${DATE}-${EPIC}.output.json`),
    JSON.stringify(output, null, 2),
  );
}

function makeManifest(features: Array<{ slug: string; status: string }>): PipelineManifest {
  return {
    slug: EPIC,
    phase: "implement",
    features: features.map((f) => ({
      slug: f.slug,
      plan: `${f.slug}.md`,
      status: f.status as "pending" | "completed",
    })),
    artifacts: {},
    lastUpdated: new Date().toISOString(),
  };
}

describe("reconcileFeature — feature isolation", () => {
  beforeEach(setup);
  afterEach(() => {
    if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true });
  });

  test("first feature completing does not mark other features completed", async () => {
    // 6 features, all pending — mirrors the real scenario
    writeManifest(makeManifest([
      { slug: "render-extract", status: "pending" },
      { slug: "poll-loop", status: "pending" },
      { slug: "watch-loop", status: "pending" },
      { slug: "render-refactor", status: "pending" },
      { slug: "change-highlight", status: "pending" },
      { slug: "dashboard-header", status: "pending" },
    ]));

    // Only render-extract wrote its output
    writeFeatureOutput("render-extract", {
      status: "completed",
      artifacts: {
        features: [{ slug: "render-extract", status: "completed" }],
      },
    });

    // Reconcile for render-extract only
    const result = await reconcileFeature(TEST_ROOT, EPIC, "render-extract", WORKTREE);

    const manifest = readManifest();

    // render-extract: completed
    expect(manifest.features.find((f) => f.slug === "render-extract")?.status).toBe("completed");

    // ALL others: still pending
    for (const slug of ["poll-loop", "watch-loop", "render-refactor", "change-highlight", "dashboard-header"]) {
      expect(manifest.features.find((f) => f.slug === slug)?.status).toBe("pending");
    }

    // Phase must NOT advance — 5 features still pending
    expect(manifest.phase).toBe("implement");

    // Progress: 1/6
    expect(result?.progress).toEqual({ completed: 1, total: 6 });
  });

  test("sequential completions accumulate correctly without poisoning", async () => {
    writeManifest(makeManifest([
      { slug: "feat-a", status: "pending" },
      { slug: "feat-b", status: "pending" },
      { slug: "feat-c", status: "pending" },
    ]));

    // feat-a completes first
    writeFeatureOutput("feat-a", {
      status: "completed",
      artifacts: { features: [{ slug: "feat-a", status: "completed" }] },
    });

    await reconcileFeature(TEST_ROOT, EPIC, "feat-a", WORKTREE);

    let manifest = readManifest();
    expect(manifest.features.find((f) => f.slug === "feat-a")?.status).toBe("completed");
    expect(manifest.features.find((f) => f.slug === "feat-b")?.status).toBe("pending");
    expect(manifest.features.find((f) => f.slug === "feat-c")?.status).toBe("pending");
    expect(manifest.phase).toBe("implement");

    // feat-b completes second
    writeFeatureOutput("feat-b", {
      status: "completed",
      artifacts: { features: [{ slug: "feat-b", status: "completed" }] },
    });

    await reconcileFeature(TEST_ROOT, EPIC, "feat-b", WORKTREE);

    manifest = readManifest();
    expect(manifest.features.find((f) => f.slug === "feat-a")?.status).toBe("completed");
    expect(manifest.features.find((f) => f.slug === "feat-b")?.status).toBe("completed");
    expect(manifest.features.find((f) => f.slug === "feat-c")?.status).toBe("pending");
    expect(manifest.phase).toBe("implement");

    // feat-c completes last — NOW phase should advance
    writeFeatureOutput("feat-c", {
      status: "completed",
      artifacts: { features: [{ slug: "feat-c", status: "completed" }] },
    });

    await reconcileFeature(TEST_ROOT, EPIC, "feat-c", WORKTREE);

    manifest = readManifest();
    expect(manifest.features.find((f) => f.slug === "feat-a")?.status).toBe("completed");
    expect(manifest.features.find((f) => f.slug === "feat-b")?.status).toBe("completed");
    expect(manifest.features.find((f) => f.slug === "feat-c")?.status).toBe("completed");
    expect(manifest.phase).toBe("validate");
  });

  test("epic-level output cannot poison features via enrich", async () => {
    // This is the EXACT bug scenario: an epic-level output.json exists
    // that lists all features as completed. reconcileFeature should only
    // read the feature-specific output, never the epic-level one.
    writeManifest(makeManifest([
      { slug: "feat-a", status: "pending" },
      { slug: "feat-b", status: "pending" },
      { slug: "feat-c", status: "pending" },
    ]));

    // Poison: epic-level output claiming all features completed
    writeEpicOutput({
      status: "completed",
      artifacts: {
        features: [
          { slug: "feat-a", status: "completed" },
          { slug: "feat-b", status: "completed" },
          { slug: "feat-c", status: "completed" },
        ],
      },
    });

    // Feature A also has its own output
    writeFeatureOutput("feat-a", {
      status: "completed",
      artifacts: { features: [{ slug: "feat-a", status: "completed" }] },
    });

    // Reconcile for feat-a — should ONLY read feat-a's output, NOT the epic-level one
    await reconcileFeature(TEST_ROOT, EPIC, "feat-a", WORKTREE);

    const manifest = readManifest();
    expect(manifest.features.find((f) => f.slug === "feat-a")?.status).toBe("completed");
    expect(manifest.features.find((f) => f.slug === "feat-b")?.status).toBe("pending");
    expect(manifest.features.find((f) => f.slug === "feat-c")?.status).toBe("pending");
    expect(manifest.phase).toBe("implement");
  });

  test("feature without output.json is not marked completed", async () => {
    writeManifest(makeManifest([
      { slug: "lazy-feat", status: "pending" },
    ]));

    // Session exited 0 but no output.json written — reconcileFeature returns undefined
    const result = await reconcileFeature(TEST_ROOT, EPIC, "lazy-feat", WORKTREE);

    const manifest = readManifest();
    expect(manifest.features.find((f) => f.slug === "lazy-feat")?.status).toBe("pending");
    expect(manifest.phase).toBe("implement");
    expect(result).toBeUndefined();
  });
});
