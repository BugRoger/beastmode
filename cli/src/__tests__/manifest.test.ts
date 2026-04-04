import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { existsSync, rmSync, mkdirSync, writeFileSync, readdirSync } from "fs";
import { resolve } from "path";
import {
  manifestPath,
  create,
  get,
  load,
  manifestExists,
  save,
} from "../manifest/store";
import type { PipelineManifest, ManifestFeature } from "../manifest/store";
import {
  enrich,
  getPendingFeatures,
} from "../manifest/pure";

const TEST_ROOT = resolve(import.meta.dirname, "../../.test-manifest");

function cleanup(): void {
  if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true });
}

describe("manifest path conventions", () => {
  beforeEach(() => cleanup());
  afterEach(() => cleanup());

  test("manifestPath returns undefined when pipeline dir missing", () => {
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

  test("manifest-store and scanner use same flat-file convention", () => {
    create(TEST_ROOT, "convention-test");
    const pipeDir = resolve(TEST_ROOT, ".beastmode", "state");
    const files = readdirSync(pipeDir);
    const match = files.find((f) => f.endsWith("-convention-test.manifest.json"));
    expect(match).toBeDefined();
    expect(match!).toMatch(/^\d{4}-\d{2}-\d{2}-convention-test\.manifest\.json$/);
  });
});

describe("manifest-store core operations", () => {
  beforeEach(() => cleanup());
  afterEach(() => cleanup());

  test("create creates manifest with design phase", () => {
    const manifest = create(TEST_ROOT, "test-epic");
    expect(manifest.slug).toBe("test-epic");
    expect(manifest.phase).toBe("design");
    expect(manifest.features).toEqual([]);
    expect(manifest.artifacts).toEqual({});
    expect(manifest.lastUpdated).toBeTruthy();

    const loaded = get(TEST_ROOT, "test-epic");
    expect(loaded.slug).toBe("test-epic");
    expect(loaded.phase).toBe("design");
  });

  test("create creates pipeline directory if missing", () => {
    const pipeDir = resolve(TEST_ROOT, ".beastmode", "state");
    expect(existsSync(pipeDir)).toBe(false);
    create(TEST_ROOT, "fresh-epic");
    expect(existsSync(pipeDir)).toBe(true);
    expect(manifestExists(TEST_ROOT, "fresh-epic")).toBe(true);
  });

  test("get throws if manifest missing", () => {
    expect(() => get(TEST_ROOT, "nonexistent")).toThrow(/Manifest not found/);
  });

  test("load returns undefined if missing", () => {
    expect(load(TEST_ROOT, "nonexistent")).toBeUndefined();
  });

  test("manifestExists returns false for missing", () => {
    expect(manifestExists(TEST_ROOT, "nonexistent")).toBe(false);
  });

  test("manifestExists returns true after create", () => {
    create(TEST_ROOT, "seeded-epic");
    expect(manifestExists(TEST_ROOT, "seeded-epic")).toBe(true);
  });

  test("save creates directories", () => {
    const pipeDir = resolve(TEST_ROOT, ".beastmode", "state");
    expect(existsSync(pipeDir)).toBe(false);

    const manifest: PipelineManifest = {
      slug: "write-test",
      phase: "plan",
      features: [],
      artifacts: {},
      lastUpdated: new Date().toISOString(),
    };

    save(TEST_ROOT, "write-test", manifest);
    expect(existsSync(pipeDir)).toBe(true);
    expect(manifestPath(TEST_ROOT, "write-test")).toBeDefined();

    const loaded = get(TEST_ROOT, "write-test");
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

  test("enrich merges features (pure, then save roundtrip)", () => {
    create(TEST_ROOT, "enrich-epic");
    const initial = get(TEST_ROOT, "enrich-epic");

    const features: ManifestFeature[] = [
      { slug: "feat-x", plan: "x.md", status: "pending" },
      { slug: "feat-y", plan: "y.md", status: "in-progress" },
    ];

    const enriched = enrich(initial, {
      phase: "plan",
      features,
      artifacts: ["plan-output.md"],
    });
    save(TEST_ROOT, "enrich-epic", enriched);

    expect(enriched.features).toHaveLength(2);
    expect(enriched.features[0].slug).toBe("feat-x");
    expect(enriched.features[1].slug).toBe("feat-y");
    expect(enriched.artifacts["plan"]).toContain("plan-output.md");

    // Verify persistence
    const loaded = get(TEST_ROOT, "enrich-epic");
    expect(loaded.features).toHaveLength(2);
  });

});
