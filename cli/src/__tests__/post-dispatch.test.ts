import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { runPostDispatch } from "../post-dispatch";
import type { PipelineManifest } from "../manifest";

const TEST_ROOT = resolve(import.meta.dir, "../../.test-post-dispatch");
const WORKTREE = resolve(TEST_ROOT, "worktree");
const EPIC_SLUG = "test-epic";

function setupTestRoot(): void {
  if (existsSync(TEST_ROOT)) {
    rmSync(TEST_ROOT, { recursive: true });
  }
  mkdirSync(TEST_ROOT, { recursive: true });
  mkdirSync(WORKTREE, { recursive: true });

  // Disable GitHub sync in tests
  const configDir = resolve(TEST_ROOT, ".beastmode");
  mkdirSync(configDir, { recursive: true });
  writeFileSync(
    resolve(configDir, "config.yaml"),
    "github:\n  enabled: false\n",
  );
}

function writeTestManifest(slug: string, manifest: object): void {
  const dir = resolve(TEST_ROOT, ".beastmode", "state");
  mkdirSync(dir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  writeFileSync(resolve(dir, `${date}-${slug}.manifest.json`), JSON.stringify(manifest, null, 2));
}

function readTestManifest(slug: string): PipelineManifest {
  const dir = resolve(TEST_ROOT, ".beastmode", "state");
  const files = require("fs").readdirSync(dir) as string[];
  const match = files.find((f: string) => f.endsWith(`-${slug}.manifest.json`));
  if (!match) throw new Error(`No manifest for ${slug}`);
  return JSON.parse(readFileSync(resolve(dir, match), "utf-8"));
}

function writePhaseOutput(
  root: string,
  phase: string,
  slug: string,
  output: object,
): void {
  const date = new Date().toISOString().slice(0, 10);
  // Stop hook writes to artifacts/<phase>/, not state/<phase>/
  const dir = resolve(root, ".beastmode", "artifacts", phase);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    resolve(dir, `${date}-${slug}.output.json`),
    JSON.stringify(output, null, 2),
  );
}

function makeManifest(overrides: Partial<PipelineManifest> = {}): PipelineManifest {
  return {
    slug: EPIC_SLUG,
    phase: "design",
    features: [],
    artifacts: {},
    lastUpdated: new Date().toISOString(),
    ...overrides,
  };
}

describe("runPostDispatch", () => {
  beforeEach(() => {
    setupTestRoot();
  });

  afterEach(() => {
    if (existsSync(TEST_ROOT)) {
      rmSync(TEST_ROOT, { recursive: true });
    }
  });

  test("skips updates on failure", async () => {
    const manifest = makeManifest({ phase: "plan" });
    writeTestManifest(EPIC_SLUG, manifest);
    const dir = resolve(TEST_ROOT, ".beastmode", "state");
    const files = require("fs").readdirSync(dir) as string[];
    const manifestFile = files.find((f: string) => f.endsWith(`-${EPIC_SLUG}.manifest.json`))!;
    const before = readFileSync(resolve(dir, manifestFile), "utf-8");

    await runPostDispatch({
      worktreePath: WORKTREE,
      projectRoot: TEST_ROOT,
      epicSlug: EPIC_SLUG,
      phase: "plan",
      success: false,
    });

    const after = readFileSync(resolve(dir, manifestFile), "utf-8");
    expect(after).toBe(before);
  });

  test("design phase with no output skips post-dispatch (abandon guard)", async () => {
    const manifest = makeManifest({ phase: "design" });
    writeTestManifest(EPIC_SLUG, manifest);

    // No output file in the worktree — abandon guard returns early
    await runPostDispatch({
      worktreePath: WORKTREE,
      projectRoot: TEST_ROOT,
      epicSlug: EPIC_SLUG,
      phase: "design",
      success: true,
    });

    // Guard returns early — manifest untouched, phase stays design
    const updated = readTestManifest(EPIC_SLUG);
    expect(updated.slug).toBe(EPIC_SLUG);
    expect(updated.phase).toBe("design");
  });

  test("design failure with no output does not advance manifest", async () => {
    const manifest = makeManifest({ phase: "design" });
    writeTestManifest(EPIC_SLUG, manifest);

    // Design failed (non-zero exit) and no output — both guards apply
    await runPostDispatch({
      worktreePath: WORKTREE,
      projectRoot: TEST_ROOT,
      epicSlug: EPIC_SLUG,
      phase: "design",
      success: false,
    });

    // Failure early-exit + abandon guard — manifest untouched
    const updated = readTestManifest(EPIC_SLUG);
    expect(updated.phase).toBe("design");
  });

  test("design phase with minimal output advances to plan (DESIGN_COMPLETED fires)", async () => {
    const manifest = makeManifest({ phase: "design" });
    writeTestManifest(EPIC_SLUG, manifest);

    // Minimal valid output — no slug, no design field, just status + artifacts
    writePhaseOutput(WORKTREE, "design", EPIC_SLUG, {
      status: "completed",
      artifacts: {},
    });

    await runPostDispatch({
      worktreePath: WORKTREE,
      projectRoot: TEST_ROOT,
      epicSlug: EPIC_SLUG,
      phase: "design",
      success: true,
    });

    // DESIGN_COMPLETED event should fire, advancing phase to plan
    const updated = readTestManifest(EPIC_SLUG);
    expect(updated.phase).toBe("plan");
  });

  test("enriches manifest from phase output", async () => {
    const manifest = makeManifest({ phase: "plan" });
    writeTestManifest(EPIC_SLUG, manifest);

    // Create a plan phase output with features in the worktree
    writePhaseOutput(WORKTREE, "plan", EPIC_SLUG, {
      status: "completed",
      artifacts: {
        features: [
          { slug: "feat-a", plan: "feat-a.md" },
          { slug: "feat-b", plan: "feat-b.md" },
        ],
      },
    });

    await runPostDispatch({
      worktreePath: WORKTREE,
      projectRoot: TEST_ROOT,
      epicSlug: EPIC_SLUG,
      phase: "plan",
      success: true,
    });

    const updated = readTestManifest(EPIC_SLUG);
    // Enrichment should have added features from the output
    expect(updated.features.length).toBe(2);
    expect(updated.features[0].slug).toBe("feat-a");
    expect(updated.features[1].slug).toBe("feat-b");
    // Plan phase with features should advance to implement
    expect(updated.phase).toBe("implement");
  });

  test("marks feature completed for implement fan-out", async () => {
    const manifest = makeManifest({
      phase: "implement",
      features: [
        { slug: "my-feature", plan: "my-feature.md", status: "pending" },
        { slug: "other-feature", plan: "other-feature.md", status: "pending" },
      ],
    });
    writeTestManifest(EPIC_SLUG, manifest);

    // Feature must produce an output.json to be marked completed
    writePhaseOutput(WORKTREE, "implement", `${EPIC_SLUG}-my-feature`, {
      status: "completed",
      artifacts: { features: [{ slug: "my-feature", status: "completed" }] },
    });

    await runPostDispatch({
      worktreePath: WORKTREE,
      projectRoot: TEST_ROOT,
      epicSlug: EPIC_SLUG,
      phase: "implement",
      featureSlug: "my-feature",
      success: true,
    });

    const updated = readTestManifest(EPIC_SLUG);
    const myFeature = updated.features.find((f) => f.slug === "my-feature");
    const otherFeature = updated.features.find((f) => f.slug === "other-feature");
    expect(myFeature?.status).toBe("completed");
    expect(otherFeature?.status).toBe("pending");
    // Should NOT advance because other-feature is still pending
    expect(updated.phase).toBe("implement");
  });

  test("does not mark feature completed when no output.json exists", async () => {
    const manifest = makeManifest({
      phase: "implement",
      features: [
        { slug: "lazy-feature", plan: "lazy-feature.md", status: "pending" },
      ],
    });
    writeTestManifest(EPIC_SLUG, manifest);

    // No output.json written — session exited 0 but did no work
    await runPostDispatch({
      worktreePath: WORKTREE,
      projectRoot: TEST_ROOT,
      epicSlug: EPIC_SLUG,
      phase: "implement",
      featureSlug: "lazy-feature",
      success: true,
    });

    const updated = readTestManifest(EPIC_SLUG);
    const feature = updated.features.find((f) => f.slug === "lazy-feature");
    expect(feature?.status).toBe("pending");
  });

  test("advances phase when all features completed", async () => {
    // One feature already completed in the manifest
    const manifest = makeManifest({
      phase: "implement",
      features: [
        { slug: "only-feature", plan: "only-feature.md", status: "completed" },
      ],
    });
    writeTestManifest(EPIC_SLUG, manifest);

    await runPostDispatch({
      worktreePath: WORKTREE,
      projectRoot: TEST_ROOT,
      epicSlug: EPIC_SLUG,
      phase: "implement",
      success: true,
    });

    const updated = readTestManifest(EPIC_SLUG);
    expect(updated.phase).toBe("validate");
  });

  test("does not advance phase when features still pending", async () => {
    const manifest = makeManifest({
      phase: "implement",
      features: [
        { slug: "done-feat", plan: "done-feat.md", status: "completed" },
        { slug: "todo-feat", plan: "todo-feat.md", status: "pending" },
      ],
    });
    writeTestManifest(EPIC_SLUG, manifest);

    await runPostDispatch({
      worktreePath: WORKTREE,
      projectRoot: TEST_ROOT,
      epicSlug: EPIC_SLUG,
      phase: "implement",
      success: true,
    });

    const updated = readTestManifest(EPIC_SLUG);
    expect(updated.phase).toBe("implement");
  });

  test("never throws even on errors", async () => {
    // Use a nonexistent projectRoot — loadManifest will return undefined,
    // but the outer try-catch should swallow all errors
    await runPostDispatch({
      worktreePath: "/nonexistent/worktree",
      projectRoot: "/nonexistent/project",
      epicSlug: "ghost-epic",
      phase: "design",
      success: true,
    });

    // If we got here without throwing, the test passes
    expect(true).toBe(true);
  });

  test("design phase with slug in output attempts rename (non-blocking on failure)", async () => {
    const manifest = makeManifest({ phase: "design" });
    writeTestManifest(EPIC_SLUG, manifest);

    // Write a design output with a slug field (simulating PRD frontmatter → output.json)
    writePhaseOutput(WORKTREE, "design", EPIC_SLUG, {
      status: "completed",
      artifacts: { design: "some-prd.md", slug: "real-feature-name" },
    });

    // store.rename() will fail (no git repo in test env).
    // The important thing: it should NOT throw and should still advance the phase.
    await runPostDispatch({
      worktreePath: WORKTREE,
      projectRoot: TEST_ROOT,
      epicSlug: EPIC_SLUG,
      phase: "design",
      success: true,
    });

    // Phase should still advance to plan despite rename failure
    const updated = readTestManifest(EPIC_SLUG);
    expect(updated.phase).toBe("plan");
  });

  test("non-design phase with slug in output does not trigger rename", async () => {
    const manifest = makeManifest({ phase: "plan" });
    writeTestManifest(EPIC_SLUG, manifest);

    // Write plan output that happens to have a slug field
    writePhaseOutput(WORKTREE, "plan", EPIC_SLUG, {
      status: "completed",
      artifacts: {
        features: [{ slug: "feat-a", plan: "feat-a.md" }],
        slug: "should-be-ignored",
      },
    });

    await runPostDispatch({
      worktreePath: WORKTREE,
      projectRoot: TEST_ROOT,
      epicSlug: EPIC_SLUG,
      phase: "plan",
      success: true,
    });

    // Manifest slug should remain unchanged — rename was not triggered
    const updated = readTestManifest(EPIC_SLUG);
    expect(updated.slug).toBe(EPIC_SLUG);
  });

  test("design phase without slug in output skips rename", async () => {
    const manifest = makeManifest({ phase: "design" });
    writeTestManifest(EPIC_SLUG, manifest);

    // Write design output WITHOUT a slug field
    writePhaseOutput(WORKTREE, "design", EPIC_SLUG, {
      status: "completed",
      artifacts: { design: "some-prd.md" },
    });

    await runPostDispatch({
      worktreePath: WORKTREE,
      projectRoot: TEST_ROOT,
      epicSlug: EPIC_SLUG,
      phase: "design",
      success: true,
    });

    // Manifest should still be under the original slug, phase advanced
    const updated = readTestManifest(EPIC_SLUG);
    expect(updated.slug).toBe(EPIC_SLUG);
    expect(updated.phase).toBe("plan");
  });

  test("design phase where slug matches epicSlug skips rename", async () => {
    const manifest = makeManifest({ phase: "design" });
    writeTestManifest(EPIC_SLUG, manifest);

    // Write design output where slug === epicSlug (no rename needed)
    writePhaseOutput(WORKTREE, "design", EPIC_SLUG, {
      status: "completed",
      artifacts: { design: "some-prd.md", slug: EPIC_SLUG },
    });

    await runPostDispatch({
      worktreePath: WORKTREE,
      projectRoot: TEST_ROOT,
      epicSlug: EPIC_SLUG,
      phase: "design",
      success: true,
    });

    // No rename, just advance
    const updated = readTestManifest(EPIC_SLUG);
    expect(updated.slug).toBe(EPIC_SLUG);
    expect(updated.phase).toBe("plan");
  });

  test("carries wave field from plan output to manifest features", async () => {
    const manifest = makeManifest({ phase: "plan" });
    writeTestManifest(EPIC_SLUG, manifest);

    writePhaseOutput(WORKTREE, "plan", EPIC_SLUG, {
      status: "completed",
      artifacts: {
        features: [
          { slug: "foundation", plan: "foundation.md", wave: 1 },
          { slug: "consumer", plan: "consumer.md", wave: 2 },
        ],
      },
    });

    await runPostDispatch({
      worktreePath: WORKTREE,
      projectRoot: TEST_ROOT,
      epicSlug: EPIC_SLUG,
      phase: "plan",
      success: true,
    });

    const updated = readTestManifest(EPIC_SLUG);
    expect(updated.features).toHaveLength(2);
    expect(updated.features.find((f) => f.slug === "foundation")?.wave).toBe(1);
    expect(updated.features.find((f) => f.slug === "consumer")?.wave).toBe(2);
  });

  test("features without wave field default to undefined in manifest", async () => {
    const manifest = makeManifest({ phase: "plan" });
    writeTestManifest(EPIC_SLUG, manifest);

    writePhaseOutput(WORKTREE, "plan", EPIC_SLUG, {
      status: "completed",
      artifacts: {
        features: [
          { slug: "no-wave", plan: "no-wave.md" },
        ],
      },
    });

    await runPostDispatch({
      worktreePath: WORKTREE,
      projectRoot: TEST_ROOT,
      epicSlug: EPIC_SLUG,
      phase: "plan",
      success: true,
    });

    const updated = readTestManifest(EPIC_SLUG);
    expect(updated.features[0].wave).toBeUndefined();
  });

  test("design phase finds output by epicSlug (hex-based lookup)", async () => {
    const manifest = makeManifest({ phase: "design" });
    writeTestManifest(EPIC_SLUG, manifest);

    // Output file is keyed to epicSlug — no commit message parsing needed
    writePhaseOutput(WORKTREE, "design", EPIC_SLUG, {
      status: "completed",
      artifacts: { design: "some-prd.md", slug: "real-feature-name" },
    });

    await runPostDispatch({
      worktreePath: WORKTREE,
      projectRoot: TEST_ROOT,
      epicSlug: EPIC_SLUG,
      phase: "design",
      success: true,
    });

    // Phase should advance — output was found by epicSlug directly
    const updated = readTestManifest(EPIC_SLUG);
    expect(updated.phase).toBe("plan");
  });
});
