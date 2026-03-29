import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { existsSync, rmSync, mkdirSync, writeFileSync, readdirSync } from "fs";
import { resolve } from "path";
import {
  manifestPath,
  seed,
  readManifest,
  loadManifest,
  manifestExists,
  writeManifest,
  getPendingFeatures,
  enrich,
  advancePhase,
} from "../manifest";
import type { PipelineManifest, ManifestFeature } from "../manifest";

const TEST_ROOT = resolve(import.meta.dir, "../../.test-manifest");

function cleanup(): void {
  if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true });
}

describe("manifest path conventions", () => {
  beforeEach(() => cleanup());
  afterEach(() => cleanup());

  test("manifestPath returns undefined when state dir missing", () => {
    expect(manifestPath(TEST_ROOT, "my-epic")).toBeUndefined();
  });

  test("manifestPath returns undefined when no matching manifest exists", () => {
    const dir = resolve(TEST_ROOT, ".beastmode", "state");
    mkdirSync(dir, { recursive: true });
    expect(manifestPath(TEST_ROOT, "my-epic")).toBeUndefined();
  });

  test("manifestPath finds flat-file manifest by slug suffix", () => {
    const dir = resolve(TEST_ROOT, ".beastmode", "state");
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, "2026-03-29-my-epic.manifest.json"), "{}");
    const found = manifestPath(TEST_ROOT, "my-epic");
    expect(found).toBe(resolve(dir, "2026-03-29-my-epic.manifest.json"));
  });

  test("manifestPath returns latest when multiple date-prefixed manifests exist", () => {
    const dir = resolve(TEST_ROOT, ".beastmode", "state");
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, "2026-03-28-my-epic.manifest.json"), "{}");
    writeFileSync(resolve(dir, "2026-03-29-my-epic.manifest.json"), "{}");
    const found = manifestPath(TEST_ROOT, "my-epic");
    expect(found).toBe(resolve(dir, "2026-03-29-my-epic.manifest.json"));
  });

  test("manifest.ts and scanner use same flat-file convention", () => {
    // Both use .beastmode/state/YYYY-MM-DD-<slug>.manifest.json
    // Seed a manifest, then verify the file is in the flat state dir
    seed(TEST_ROOT, "convention-test");
    const pipeDir = resolve(TEST_ROOT, ".beastmode", "state");
    const files = readdirSync(pipeDir);
    const match = files.find((f) => f.endsWith("-convention-test.manifest.json"));
    expect(match).toBeDefined();
    // No subdirectory — flat file directly in state/
    expect(match!).toMatch(/^\d{4}-\d{2}-\d{2}-convention-test\.manifest\.json$/);
  });
});

describe("manifest core operations", () => {
  beforeEach(() => cleanup());
  afterEach(() => cleanup());

  test("seed creates manifest with design phase", () => {
    const manifest = seed(TEST_ROOT, "test-epic");
    expect(manifest.slug).toBe("test-epic");
    expect(manifest.phase).toBe("design");
    expect(manifest.features).toEqual([]);
    expect(manifest.artifacts).toEqual({});
    expect(manifest.lastUpdated).toBeTruthy();

    // Read it back from disk to confirm persistence
    const loaded = readManifest(TEST_ROOT, "test-epic");
    expect(loaded.slug).toBe("test-epic");
    expect(loaded.phase).toBe("design");
    expect(loaded.features).toEqual([]);
  });

  test("seed creates state directory if missing", () => {
    const pipeDir = resolve(TEST_ROOT, ".beastmode", "state");
    expect(existsSync(pipeDir)).toBe(false);

    seed(TEST_ROOT, "fresh-epic");

    expect(existsSync(pipeDir)).toBe(true);
    expect(manifestExists(TEST_ROOT, "fresh-epic")).toBe(true);
  });

  test("readManifest throws if manifest missing", () => {
    expect(() => readManifest(TEST_ROOT, "nonexistent")).toThrow(
      /Manifest not found/,
    );
  });

  test("loadManifest returns undefined if missing", () => {
    const result = loadManifest(TEST_ROOT, "nonexistent");
    expect(result).toBeUndefined();
  });

  test("manifestExists returns false for missing", () => {
    expect(manifestExists(TEST_ROOT, "nonexistent")).toBe(false);
  });

  test("manifestExists returns true after seed", () => {
    seed(TEST_ROOT, "seeded-epic");
    expect(manifestExists(TEST_ROOT, "seeded-epic")).toBe(true);
  });

  test("writeManifest creates directories", () => {
    const pipeDir = resolve(TEST_ROOT, ".beastmode", "state");
    expect(existsSync(pipeDir)).toBe(false);

    const manifest: PipelineManifest = {
      slug: "write-test",
      phase: "plan",
      features: [],
      artifacts: {},
      lastUpdated: new Date().toISOString(),
    };

    writeManifest(TEST_ROOT, "write-test", manifest);

    expect(existsSync(pipeDir)).toBe(true);
    // Should be findable via manifestPath after write
    expect(manifestPath(TEST_ROOT, "write-test")).toBeDefined();

    const loaded = readManifest(TEST_ROOT, "write-test");
    expect(loaded.slug).toBe("write-test");
    expect(loaded.phase).toBe("plan");
  });

  test("getPendingFeatures filters correctly", () => {
    const manifest: PipelineManifest = {
      slug: "filter-test",
      phase: "implement",
      features: [
        { slug: "feat-a", plan: "a.md", status: "pending" },
        { slug: "feat-b", plan: "b.md", status: "completed" },
        { slug: "feat-c", plan: "c.md", status: "in-progress" },
        { slug: "feat-d", plan: "d.md", status: "blocked" },
      ],
      artifacts: {},
      lastUpdated: new Date().toISOString(),
    };

    const pending = getPendingFeatures(manifest);

    expect(pending).toHaveLength(2);
    expect(pending.map((f) => f.slug).sort()).toEqual(["feat-a", "feat-c"]);
  });

  test("enrich merges features", () => {
    seed(TEST_ROOT, "enrich-epic");

    const features: ManifestFeature[] = [
      { slug: "feat-x", plan: "x.md", status: "pending" },
      { slug: "feat-y", plan: "y.md", status: "in-progress" },
    ];

    const enriched = enrich(TEST_ROOT, "enrich-epic", {
      phase: "plan",
      features,
      artifacts: ["plan-output.md"],
    });

    expect(enriched.features).toHaveLength(2);
    expect(enriched.features[0].slug).toBe("feat-x");
    expect(enriched.features[1].slug).toBe("feat-y");
    expect(enriched.artifacts["plan"]).toContain("plan-output.md");

    // Verify persistence
    const loaded = readManifest(TEST_ROOT, "enrich-epic");
    expect(loaded.features).toHaveLength(2);
  });

  test("advancePhase updates phase field", () => {
    seed(TEST_ROOT, "advance-epic");

    const advanced = advancePhase(TEST_ROOT, "advance-epic", "plan");
    expect(advanced.phase).toBe("plan");

    // Verify persistence
    const loaded = readManifest(TEST_ROOT, "advance-epic");
    expect(loaded.phase).toBe("plan");
  });
});
