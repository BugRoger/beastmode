import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from "fs";
import { resolve } from "path";
import {
  seed,
  enrich,
  advancePhase,
  reconstruct,
  readManifest,
  writeManifest,
  loadManifest,
  manifestExists,
  manifestPath,
  getPendingFeatures,
  findLegacyManifestPath,
  readLegacyManifest,
  type PipelineManifest,
} from "../src/manifest";

const TEST_ROOT = resolve(import.meta.dir, "../.test-manifest");

function setupTestRoot(): void {
  if (existsSync(TEST_ROOT)) {
    rmSync(TEST_ROOT, { recursive: true });
  }
  mkdirSync(TEST_ROOT, { recursive: true });
}

describe("manifestPath", () => {
  beforeEach(setupTestRoot);
  afterEach(() => rmSync(TEST_ROOT, { recursive: true, force: true }));

  test("returns undefined when no state dir exists", () => {
    expect(manifestPath(TEST_ROOT, "my-epic")).toBeUndefined();
  });

  test("returns undefined when no manifest exists for slug", () => {
    mkdirSync(resolve(TEST_ROOT, ".beastmode/state"), { recursive: true });
    expect(manifestPath(TEST_ROOT, "my-epic")).toBeUndefined();
  });

  test("finds flat-file manifest by slug", () => {
    const dir = resolve(TEST_ROOT, ".beastmode/state");
    mkdirSync(dir, { recursive: true });
    writeFileSync(resolve(dir, "2026-03-29-my-epic.manifest.json"), "{}");
    const path = manifestPath(TEST_ROOT, "my-epic");
    expect(path).toBe(resolve(dir, "2026-03-29-my-epic.manifest.json"));
  });
});

describe("seed", () => {
  beforeEach(setupTestRoot);
  afterEach(() => rmSync(TEST_ROOT, { recursive: true, force: true }));

  test("creates manifest with design phase", () => {
    const manifest = seed(TEST_ROOT, "test-epic");
    expect(manifest.slug).toBe("test-epic");
    expect(manifest.phase).toBe("design");
    expect(manifest.features).toEqual([]);
    expect(manifest.artifacts).toEqual({});
    expect(manifest.worktree).toBeUndefined();
    expect(manifest.github).toBeUndefined();

    // File was written to flat path
    expect(manifestExists(TEST_ROOT, "test-epic")).toBe(true);
  });

  test("creates manifest with worktree and github options", () => {
    const manifest = seed(TEST_ROOT, "test-epic", {
      worktree: { branch: "feature/test-epic", path: "/tmp/worktree" },
      github: { epic: 42, repo: "org/repo" },
    });
    expect(manifest.worktree).toEqual({
      branch: "feature/test-epic",
      path: "/tmp/worktree",
    });
    expect(manifest.github).toEqual({ epic: 42, repo: "org/repo" });
  });

  test("creates state directory if missing", () => {
    const dir = resolve(TEST_ROOT, ".beastmode/state");
    expect(existsSync(dir)).toBe(false);
    seed(TEST_ROOT, "test-epic");
    expect(existsSync(dir)).toBe(true);
  });
});

describe("enrich", () => {
  beforeEach(() => {
    setupTestRoot();
    seed(TEST_ROOT, "test-epic");
  });
  afterEach(() => rmSync(TEST_ROOT, { recursive: true, force: true }));

  test("adds features from phase output", () => {
    const manifest = enrich(TEST_ROOT, "test-epic", {
      phase: "plan",
      features: [
        { slug: "feature-a", plan: "plan-a.md", status: "pending" },
        { slug: "feature-b", plan: "plan-b.md", status: "pending" },
      ],
    });
    expect(manifest.features).toHaveLength(2);
    expect(manifest.features[0].slug).toBe("feature-a");
  });

  test("accumulates artifacts under phase key", () => {
    const manifest = enrich(TEST_ROOT, "test-epic", {
      phase: "design",
      artifacts: ["design.md", "prd.md"],
    });
    expect(manifest.artifacts.design).toEqual(["design.md", "prd.md"]);
  });

  test("merges features preserving github info", () => {
    enrich(TEST_ROOT, "test-epic", {
      phase: "plan",
      features: [
        { slug: "feat-a", plan: "plan-a.md", status: "pending", github: { issue: 10 } },
      ],
    });

    const manifest = enrich(TEST_ROOT, "test-epic", {
      phase: "plan",
      features: [
        { slug: "feat-a", plan: "plan-a-v2.md", status: "in-progress" },
      ],
    });

    expect(manifest.features).toHaveLength(1);
    expect(manifest.features[0].plan).toBe("plan-a-v2.md");
    expect(manifest.features[0].status).toBe("in-progress");
    expect(manifest.features[0].github).toEqual({ issue: 10 });
  });

  test("appends new features without removing existing", () => {
    enrich(TEST_ROOT, "test-epic", {
      phase: "plan",
      features: [{ slug: "feat-a", plan: "plan-a.md", status: "pending" }],
    });

    const manifest = enrich(TEST_ROOT, "test-epic", {
      phase: "plan",
      features: [{ slug: "feat-b", plan: "plan-b.md", status: "pending" }],
    });

    expect(manifest.features).toHaveLength(2);
  });

  test("accumulates artifacts across multiple enrichments", () => {
    enrich(TEST_ROOT, "test-epic", {
      phase: "design",
      artifacts: ["file1.md"],
    });
    const manifest = enrich(TEST_ROOT, "test-epic", {
      phase: "design",
      artifacts: ["file2.md"],
    });
    expect(manifest.artifacts.design).toEqual(["file1.md", "file2.md"]);
  });
});

describe("advancePhase", () => {
  beforeEach(() => {
    setupTestRoot();
    seed(TEST_ROOT, "test-epic");
  });
  afterEach(() => rmSync(TEST_ROOT, { recursive: true, force: true }));

  test("advances phase and persists", () => {
    const manifest = advancePhase(TEST_ROOT, "test-epic", "plan");
    expect(manifest.phase).toBe("plan");

    const reread = readManifest(TEST_ROOT, "test-epic");
    expect(reread.phase).toBe("plan");
  });

  test("can advance through all phases", () => {
    advancePhase(TEST_ROOT, "test-epic", "plan");
    advancePhase(TEST_ROOT, "test-epic", "implement");
    advancePhase(TEST_ROOT, "test-epic", "validate");
    const manifest = advancePhase(TEST_ROOT, "test-epic", "release");
    expect(manifest.phase).toBe("release");
  });
});

describe("reconstruct", () => {
  beforeEach(setupTestRoot);
  afterEach(() => rmSync(TEST_ROOT, { recursive: true, force: true }));

  test("returns undefined when no design artifact exists", () => {
    const manifest = reconstruct(TEST_ROOT, "nonexistent");
    expect(manifest).toBeUndefined();
  });

  test("reconstructs design-only manifest", () => {
    mkdirSync(resolve(TEST_ROOT, ".beastmode/state/design"), { recursive: true });
    writeFileSync(
      resolve(TEST_ROOT, ".beastmode/artifacts/design/2026-03-29-test-epic.md"),
      "# Test Epic",
    );

    const manifest = reconstruct(TEST_ROOT, "test-epic");
    expect(manifest).toBeDefined();
    expect(manifest!.slug).toBe("test-epic");
    expect(manifest!.phase).toBe("design");
    expect(manifest!.features).toEqual([]);
  });

  test("reconstructs with features from plan dir", () => {
    mkdirSync(resolve(TEST_ROOT, ".beastmode/state/design"), { recursive: true });
    mkdirSync(resolve(TEST_ROOT, ".beastmode/state/plan"), { recursive: true });
    writeFileSync(
      resolve(TEST_ROOT, ".beastmode/artifacts/design/2026-03-29-test-epic.md"),
      "# Test",
    );
    writeFileSync(
      resolve(TEST_ROOT, ".beastmode/artifacts/plan/2026-03-29-test-epic-feat-a.md"),
      "# Feature A",
    );
    writeFileSync(
      resolve(TEST_ROOT, ".beastmode/artifacts/plan/2026-03-29-test-epic-feat-b.md"),
      "# Feature B",
    );

    const manifest = reconstruct(TEST_ROOT, "test-epic");
    expect(manifest).toBeDefined();
    expect(manifest!.phase).toBe("plan");
    expect(manifest!.features).toHaveLength(2);
    expect(manifest!.features.map((f) => f.slug).sort()).toEqual(["feat-a", "feat-b"]);
  });

  test("detects implement phase from state markers", () => {
    mkdirSync(resolve(TEST_ROOT, ".beastmode/state/design"), { recursive: true });
    mkdirSync(resolve(TEST_ROOT, ".beastmode/state/implement"), { recursive: true });
    writeFileSync(
      resolve(TEST_ROOT, ".beastmode/artifacts/design/2026-03-29-test-epic.md"),
      "# Test",
    );
    writeFileSync(
      resolve(TEST_ROOT, ".beastmode/artifacts/implement/2026-03-29-test-epic.md"),
      "# Implement",
    );

    const manifest = reconstruct(TEST_ROOT, "test-epic");
    expect(manifest!.phase).toBe("implement");
  });

  test("writes reconstructed manifest to state dir", () => {
    mkdirSync(resolve(TEST_ROOT, ".beastmode/state/design"), { recursive: true });
    writeFileSync(
      resolve(TEST_ROOT, ".beastmode/artifacts/design/2026-03-29-test-epic.md"),
      "# Test",
    );

    reconstruct(TEST_ROOT, "test-epic");
    expect(manifestExists(TEST_ROOT, "test-epic")).toBe(true);
  });
});

describe("readManifest", () => {
  beforeEach(() => {
    setupTestRoot();
    seed(TEST_ROOT, "test-epic");
  });
  afterEach(() => rmSync(TEST_ROOT, { recursive: true, force: true }));

  test("reads and parses valid manifest", () => {
    const manifest = readManifest(TEST_ROOT, "test-epic");
    expect(manifest.slug).toBe("test-epic");
    expect(manifest.phase).toBe("design");
  });

  test("throws on missing manifest", () => {
    expect(() => readManifest(TEST_ROOT, "nonexistent")).toThrow(/Manifest not found/);
  });
});

describe("loadManifest", () => {
  beforeEach(() => {
    setupTestRoot();
    seed(TEST_ROOT, "test-epic");
  });
  afterEach(() => rmSync(TEST_ROOT, { recursive: true, force: true }));

  test("loads existing manifest", () => {
    const manifest = loadManifest(TEST_ROOT, "test-epic");
    expect(manifest).toBeDefined();
    expect(manifest!.slug).toBe("test-epic");
  });

  test("returns undefined for missing manifest", () => {
    const manifest = loadManifest(TEST_ROOT, "nonexistent");
    expect(manifest).toBeUndefined();
  });
});

describe("manifestExists", () => {
  beforeEach(setupTestRoot);
  afterEach(() => rmSync(TEST_ROOT, { recursive: true, force: true }));

  test("returns true for existing manifest", () => {
    seed(TEST_ROOT, "test-epic");
    expect(manifestExists(TEST_ROOT, "test-epic")).toBe(true);
  });

  test("returns false for missing manifest", () => {
    expect(manifestExists(TEST_ROOT, "nonexistent")).toBe(false);
  });
});

describe("writeManifest", () => {
  beforeEach(setupTestRoot);
  afterEach(() => rmSync(TEST_ROOT, { recursive: true, force: true }));

  test("writes and can be read back", () => {
    const manifest: PipelineManifest = {
      slug: "write-test",
      phase: "implement",
      features: [{ slug: "feat-1", plan: "plan.md", status: "in-progress" }],
      artifacts: { design: ["design.md"] },
      lastUpdated: "2026-03-29T00:00:00Z",
    };

    writeManifest(TEST_ROOT, "write-test", manifest);
    const reread = readManifest(TEST_ROOT, "write-test");
    expect(reread.slug).toBe("write-test");
    expect(reread.phase).toBe("implement");
    expect(reread.features).toHaveLength(1);
  });
});

describe("getPendingFeatures", () => {
  test("returns pending and in-progress features", () => {
    const manifest: PipelineManifest = {
      slug: "test",
      phase: "implement",
      features: [
        { slug: "a", plan: "a.md", status: "pending" },
        { slug: "b", plan: "b.md", status: "completed" },
        { slug: "c", plan: "c.md", status: "in-progress" },
        { slug: "d", plan: "d.md", status: "blocked" },
      ],
      artifacts: {},
      lastUpdated: "2026-03-29T00:00:00Z",
    };
    const pending = getPendingFeatures(manifest);
    expect(pending).toHaveLength(2);
    expect(pending.map((f) => f.slug)).toEqual(["a", "c"]);
  });

  test("returns empty when all completed", () => {
    const manifest: PipelineManifest = {
      slug: "test",
      phase: "release",
      features: [
        { slug: "a", plan: "a.md", status: "completed" },
        { slug: "b", plan: "b.md", status: "completed" },
      ],
      artifacts: {},
      lastUpdated: "2026-03-29T00:00:00Z",
    };
    expect(getPendingFeatures(manifest)).toHaveLength(0);
  });
});

describe("findLegacyManifestPath", () => {
  beforeEach(setupTestRoot);
  afterEach(() => rmSync(TEST_ROOT, { recursive: true, force: true }));

  test("finds legacy manifest by slug", () => {
    mkdirSync(resolve(TEST_ROOT, ".beastmode/state/plan"), { recursive: true });
    writeFileSync(
      resolve(TEST_ROOT, ".beastmode/artifacts/plan/2026-03-28-test-epic.manifest.json"),
      "{}",
    );
    const path = findLegacyManifestPath(TEST_ROOT, "test-epic");
    expect(path).toBeDefined();
    expect(path!.endsWith("test-epic.manifest.json")).toBe(true);
  });

  test("returns latest when multiple exist", () => {
    mkdirSync(resolve(TEST_ROOT, ".beastmode/state/plan"), { recursive: true });
    writeFileSync(
      resolve(TEST_ROOT, ".beastmode/artifacts/plan/2026-03-27-test-epic.manifest.json"),
      "{}",
    );
    writeFileSync(
      resolve(TEST_ROOT, ".beastmode/artifacts/plan/2026-03-28-test-epic.manifest.json"),
      "{}",
    );
    const path = findLegacyManifestPath(TEST_ROOT, "test-epic");
    expect(path!).toContain("2026-03-28");
  });

  test("returns undefined when none exist", () => {
    expect(findLegacyManifestPath(TEST_ROOT, "nonexistent")).toBeUndefined();
  });
});

describe("readLegacyManifest", () => {
  beforeEach(setupTestRoot);
  afterEach(() => rmSync(TEST_ROOT, { recursive: true, force: true }));

  test("reads legacy manifest as generic object", () => {
    const path = resolve(TEST_ROOT, "legacy.json");
    writeFileSync(
      path,
      JSON.stringify({
        design: "test.md",
        architecturalDecisions: [{ decision: "x", choice: "y" }],
        features: [],
      }),
    );
    const manifest = readLegacyManifest(path);
    expect(manifest.design).toBe("test.md");
    expect((manifest.architecturalDecisions as unknown[]).length).toBe(1);
  });

  test("throws on missing file", () => {
    expect(() => readLegacyManifest("/nonexistent")).toThrow("Manifest not found");
  });
});
