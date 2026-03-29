import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import {
  scanEpics,
  slugFromDesign,
  slugFromManifest,
  validateManifest,
} from "../state-scanner";

const TEST_ROOT = resolve(import.meta.dir, "../../.test-state-scanner");
const TEST_DATE = "2026-03-29";

function setupTestRoot(): void {
  if (existsSync(TEST_ROOT)) {
    rmSync(TEST_ROOT, { recursive: true });
  }
  mkdirSync(resolve(TEST_ROOT, ".beastmode", "pipeline"), { recursive: true });
  // Minimal config so gate checks don't crash.
  // design phase has a human gate; implement phase has only auto gates.
  writeFileSync(
    resolve(TEST_ROOT, ".beastmode", "config.yaml"),
    `gates:\n  design:\n    decision-tree: human\n  implement:\n    architectural-deviation: auto\n`,
  );
}

function writePipelineManifest(
  slug: string,
  phase: string,
  features: Array<{ slug: string; status: string }>,
  github?: { epic: number; repo: string },
): void {
  const manifest = {
    phase,
    design: `.beastmode/state/design/${TEST_DATE}-${slug}.md`,
    features: features.map((f) => ({
      slug: f.slug,
      plan: `${TEST_DATE}-${slug}-${f.slug}.md`,
      status: f.status,
    })),
    github,
    lastUpdated: `${TEST_DATE}T00:00:00Z`,
  };
  writeFileSync(
    resolve(
      TEST_ROOT,
      ".beastmode",
      "pipeline",
      `${TEST_DATE}-${slug}.manifest.json`,
    ),
    JSON.stringify(manifest, null, 2),
  );
}

/** Write a raw manifest (for testing validation failures) */
function writeRawManifest(slug: string, content: unknown): void {
  writeFileSync(
    resolve(
      TEST_ROOT,
      ".beastmode",
      "pipeline",
      `${TEST_DATE}-${slug}.manifest.json`,
    ),
    typeof content === "string" ? content : JSON.stringify(content, null, 2),
  );
}

// ---------------------------------------------------------------------------
// slugFromDesign — backward-compat export
// ---------------------------------------------------------------------------

describe("slugFromDesign", () => {
  test("extracts slug from dated design filename", () => {
    expect(slugFromDesign("2026-03-28-my-epic.md")).toBe("my-epic");
  });

  test("handles multi-segment slugs", () => {
    expect(
      slugFromDesign("2026-03-28-typescript-pipeline-orchestrator.md"),
    ).toBe("typescript-pipeline-orchestrator");
  });

  test("handles filename without date prefix", () => {
    expect(slugFromDesign("my-epic.md")).toBe("my-epic");
  });
});

// ---------------------------------------------------------------------------
// slugFromManifest
// ---------------------------------------------------------------------------

describe("slugFromManifest", () => {
  test("extracts slug from dated manifest filename", () => {
    expect(slugFromManifest("2026-03-28-my-epic.manifest.json")).toBe(
      "my-epic",
    );
  });

  test("handles multi-segment slugs", () => {
    expect(
      slugFromManifest(
        "2026-03-28-typescript-pipeline-orchestrator.manifest.json",
      ),
    ).toBe("typescript-pipeline-orchestrator");
  });

  test("handles manifest filename without date prefix", () => {
    expect(slugFromManifest("my-epic.manifest.json")).toBe("my-epic");
  });
});

// ---------------------------------------------------------------------------
// validateManifest
// ---------------------------------------------------------------------------

describe("validateManifest", () => {
  test("accepts valid manifest with all required fields", () => {
    expect(
      validateManifest({
        phase: "implement",
        design: "path/to/design.md",
        features: [{ slug: "f1", status: "pending" }],
        lastUpdated: "2026-03-29T00:00:00Z",
      }),
    ).toBe(true);
  });

  test("rejects manifest missing phase field", () => {
    expect(
      validateManifest({
        design: "path/to/design.md",
        features: [{ slug: "f1", status: "pending" }],
        lastUpdated: "2026-03-29T00:00:00Z",
      }),
    ).toBe(false);
  });

  test("rejects manifest with invalid phase value", () => {
    expect(
      validateManifest({
        phase: "not-a-phase",
        design: "path/to/design.md",
        features: [{ slug: "f1", status: "pending" }],
        lastUpdated: "2026-03-29T00:00:00Z",
      }),
    ).toBe(false);
  });

  test("rejects manifest with non-string design", () => {
    expect(
      validateManifest({
        phase: "plan",
        design: 42,
        features: [{ slug: "f1", status: "pending" }],
        lastUpdated: "2026-03-29T00:00:00Z",
      }),
    ).toBe(false);
  });

  test("rejects manifest with missing features array", () => {
    expect(
      validateManifest({
        phase: "implement",
        design: "path/to/design.md",
        lastUpdated: "2026-03-29T00:00:00Z",
      }),
    ).toBe(false);
  });

  test("rejects manifest with unknown feature status", () => {
    expect(
      validateManifest({
        phase: "implement",
        design: "path/to/design.md",
        features: [{ slug: "f1", status: "unknown_value" }],
        lastUpdated: "2026-03-29T00:00:00Z",
      }),
    ).toBe(false);
  });

  test("rejects null", () => {
    expect(validateManifest(null)).toBe(false);
  });

  test("rejects non-object", () => {
    expect(validateManifest("string")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// scanEpics — pipeline-only discovery, ScanResult shape
// ---------------------------------------------------------------------------

describe("scanEpics", () => {
  beforeEach(() => {
    setupTestRoot();
  });

  afterEach(() => {
    if (existsSync(TEST_ROOT)) {
      rmSync(TEST_ROOT, { recursive: true });
    }
  });

  // --- Empty / missing states ---

  test("returns empty when no pipeline dir exists", async () => {
    rmSync(resolve(TEST_ROOT, ".beastmode", "pipeline"), { recursive: true });
    const result = await scanEpics(TEST_ROOT);
    expect(result.epics).toEqual([]);
    expect(result.skipped).toEqual([]);
  });

  test("returns empty arrays when pipeline dir exists but no manifests", async () => {
    const result = await scanEpics(TEST_ROOT);
    expect(result.epics).toEqual([]);
    expect(result.skipped).toEqual([]);
  });

  // --- Phase / next-action derivation ---

  test("design phase returns next-action: plan", async () => {
    writePipelineManifest("my-epic", "design", []);
    const { epics } = await scanEpics(TEST_ROOT);

    expect(epics).toHaveLength(1);
    expect(epics[0].slug).toBe("my-epic");
    expect(epics[0].phase).toBe("design");
    expect(epics[0].nextAction).toEqual({
      phase: "plan",
      args: ["my-epic"],
      type: "single",
    });
  });

  test("plan phase with empty features returns next-action: plan", async () => {
    writePipelineManifest("my-epic", "plan", []);
    const { epics } = await scanEpics(TEST_ROOT);

    expect(epics[0].phase).toBe("plan");
    expect(epics[0].nextAction?.phase).toBe("plan");
  });

  test("implement phase with pending features returns fan-out action", async () => {
    writePipelineManifest("my-epic", "implement", [
      { slug: "feature-a", status: "pending" },
      { slug: "feature-b", status: "pending" },
    ]);
    const { epics } = await scanEpics(TEST_ROOT);

    expect(epics[0].phase).toBe("implement");
    expect(epics[0].nextAction).toEqual({
      phase: "implement",
      args: ["my-epic"],
      type: "fan-out",
      features: ["feature-a", "feature-b"],
    });
  });

  test("mix of completed and pending features returns implement with pending only", async () => {
    writePipelineManifest("my-epic", "implement", [
      { slug: "feature-a", status: "completed" },
      { slug: "feature-b", status: "pending" },
      { slug: "feature-c", status: "in-progress" },
    ]);
    const { epics } = await scanEpics(TEST_ROOT);

    expect(epics[0].phase).toBe("implement");
    expect(epics[0].nextAction?.features).toEqual([
      "feature-b",
      "feature-c",
    ]);
  });

  test("implement phase with all features completed returns null next-action", async () => {
    writePipelineManifest("my-epic", "implement", [
      { slug: "feature-a", status: "completed" },
      { slug: "feature-b", status: "completed" },
    ]);
    const { epics } = await scanEpics(TEST_ROOT);

    expect(epics[0].phase).toBe("implement");
    expect(epics[0].nextAction).toBeNull();
  });

  test("validate phase returns next-action: validate", async () => {
    writePipelineManifest("my-epic", "validate", [
      { slug: "feature-a", status: "completed" },
      { slug: "feature-b", status: "completed" },
    ]);
    const { epics } = await scanEpics(TEST_ROOT);

    expect(epics[0].phase).toBe("validate");
    expect(epics[0].nextAction).toEqual({
      phase: "validate",
      args: ["my-epic"],
      type: "single",
    });
  });

  test("release phase returns next-action: release", async () => {
    writePipelineManifest("my-epic", "release", [
      { slug: "f1", status: "completed" },
    ]);
    const { epics } = await scanEpics(TEST_ROOT);

    expect(epics[0].phase).toBe("release");
    expect(epics[0].nextAction).toEqual({
      phase: "release",
      args: ["my-epic"],
      type: "single",
    });
  });

  // --- Feature progress extraction ---

  test("extracts feature progress from manifest", async () => {
    writePipelineManifest("my-epic", "implement", [
      { slug: "feature-a", status: "completed" },
      { slug: "feature-b", status: "in-progress" },
      { slug: "feature-c", status: "pending" },
    ]);
    const { epics } = await scanEpics(TEST_ROOT);

    expect(epics[0].features).toEqual([
      { slug: "feature-a", status: "completed", githubIssue: undefined },
      { slug: "feature-b", status: "in-progress", githubIssue: undefined },
      { slug: "feature-c", status: "pending", githubIssue: undefined },
    ]);
  });

  // --- Validation / skipping ---

  test("manifest without phase field is skipped — appears in skipped array", async () => {
    writeRawManifest("no-phase-epic", {
      design: `.beastmode/state/design/${TEST_DATE}-no-phase-epic.md`,
      features: [{ slug: "f1", plan: "plan.md", status: "pending" }],
      lastUpdated: `${TEST_DATE}T00:00:00Z`,
    });
    const { epics, skipped } = await scanEpics(TEST_ROOT);

    expect(epics.filter((e) => e.slug === "no-phase-epic")).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].path).toContain("no-phase-epic");
  });

  test("manifest with invalid phase 'bogus' is skipped", async () => {
    writeRawManifest("bogus-phase-epic", {
      phase: "bogus",
      design: `.beastmode/state/design/${TEST_DATE}-bogus-phase-epic.md`,
      features: [{ slug: "f1", plan: "plan.md", status: "pending" }],
      lastUpdated: `${TEST_DATE}T00:00:00Z`,
    });
    const { epics, skipped } = await scanEpics(TEST_ROOT);

    expect(epics.filter((e) => e.slug === "bogus-phase-epic")).toHaveLength(0);
    expect(skipped.some((s) => s.path.includes("bogus-phase-epic"))).toBe(
      true,
    );
  });

  test("invalid JSON manifest is skipped", async () => {
    writeRawManifest("broken-json", "this is not valid json {{{");
    const { epics, skipped } = await scanEpics(TEST_ROOT);

    expect(epics).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].path).toContain("broken-json");
  });

  test("manifest with wrong-typed fields is skipped", async () => {
    writeRawManifest("wrong-types", {
      phase: "implement",
      design: 42, // should be string
      features: [{ slug: "f1", status: "pending" }],
      lastUpdated: "2026-03-29T00:00:00Z",
    });
    const { epics, skipped } = await scanEpics(TEST_ROOT);

    expect(epics).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].path).toContain("wrong-types");
  });

  test("malformed manifest missing required fields is skipped", async () => {
    writeRawManifest("malformed", { design: "something" });
    const { epics, skipped } = await scanEpics(TEST_ROOT);

    expect(epics).toHaveLength(0);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].path).toContain("malformed");
  });

  test("feature status validation rejects unknown values — entire manifest skipped", async () => {
    writeRawManifest("bad-status-epic", {
      phase: "implement",
      design: `.beastmode/state/design/${TEST_DATE}-bad-status-epic.md`,
      features: [
        { slug: "f1", plan: "plan.md", status: "pending" },
        { slug: "f2", plan: "plan.md", status: "unknown_value" },
      ],
      lastUpdated: `${TEST_DATE}T00:00:00Z`,
    });
    const { epics, skipped } = await scanEpics(TEST_ROOT);

    expect(epics.filter((e) => e.slug === "bad-status-epic")).toHaveLength(0);
    expect(skipped.some((s) => s.path.includes("bad-status-epic"))).toBe(true);
  });

  test("skipped manifests are tracked in ScanResult.skipped with path and reason", async () => {
    writeRawManifest("bad-one", "not json");
    writeRawManifest("bad-two", { phase: "nope" });
    writePipelineManifest("good-one", "implement", [
      { slug: "f1", status: "pending" },
    ]);

    const { epics, skipped } = await scanEpics(TEST_ROOT);

    expect(epics).toHaveLength(1);
    expect(epics[0].slug).toBe("good-one");
    expect(skipped).toHaveLength(2);
    for (const s of skipped) {
      expect(s.path).toBeTruthy();
      expect(s.reason).toBeTruthy();
    }
  });

  // --- Blocked detection ---

  test("features with status blocked sets blocked=true", async () => {
    writePipelineManifest("my-epic", "implement", [
      { slug: "feature-a", status: "blocked" },
      { slug: "feature-b", status: "pending" },
    ]);
    const { epics } = await scanEpics(TEST_ROOT);

    expect(epics[0].blocked).toBe(true);
  });

  test("design phase with human gates sets blocked=true", async () => {
    // Default config has design.decision-tree: human
    writePipelineManifest("gated-epic", "design", []);
    const { epics } = await scanEpics(TEST_ROOT);

    const gated = epics.find((e) => e.slug === "gated-epic");
    expect(gated).toBeDefined();
    expect(gated!.blocked).toBe(true);
  });

  test("implement phase with only auto gates sets blocked=false", async () => {
    // Default config has implement.architectural-deviation: auto (no human gates)
    writePipelineManifest("auto-epic", "implement", [
      { slug: "f1", status: "pending" },
    ]);
    const { epics } = await scanEpics(TEST_ROOT);

    const autoEpic = epics.find((e) => e.slug === "auto-epic");
    expect(autoEpic).toBeDefined();
    expect(autoEpic!.blocked).toBe(false);
  });

  test("validate phase human gate blocks epic", async () => {
    writeFileSync(
      resolve(TEST_ROOT, ".beastmode", "config.yaml"),
      `gates:\n  validate:\n    qa-review: human\n`,
    );

    writePipelineManifest("val-epic", "validate", [
      { slug: "f1", status: "completed" },
    ]);
    const { epics } = await scanEpics(TEST_ROOT);

    const valEpic = epics.find((e) => e.slug === "val-epic");
    expect(valEpic).toBeDefined();
    expect(valEpic!.blocked).toBe(true);
  });

  test("multiple gates — one human gate is enough to block", async () => {
    writeFileSync(
      resolve(TEST_ROOT, ".beastmode", "config.yaml"),
      `gates:\n  validate:\n    lint-check: auto\n    security-review: human\n`,
    );

    writePipelineManifest("multi-gate-epic", "validate", [
      { slug: "f1", status: "completed" },
    ]);
    const { epics } = await scanEpics(TEST_ROOT);

    const epic = epics.find((e) => e.slug === "multi-gate-epic");
    expect(epic).toBeDefined();
    expect(epic!.blocked).toBe(true);
  });

  // --- Pipeline-only discovery ---

  test("only pipeline manifests appear — design files are not discovered", async () => {
    // Create a design file but NO pipeline manifest for this slug
    const designDir = resolve(TEST_ROOT, ".beastmode", "state", "design");
    mkdirSync(designDir, { recursive: true });
    writeFileSync(
      resolve(designDir, `${TEST_DATE}-orphan-epic.md`),
      "# Orphan Epic\n",
    );

    const { epics } = await scanEpics(TEST_ROOT);

    // Scanner only looks in pipeline/, so design-only epics never appear
    expect(epics.filter((e) => e.slug === "orphan-epic")).toHaveLength(0);
  });

  test("only pipeline manifests appear — legacy plan directory is ignored", async () => {
    // Place a manifest in state/plan/ (legacy location)
    const legacyPlanDir = resolve(TEST_ROOT, ".beastmode", "state", "plan");
    mkdirSync(legacyPlanDir, { recursive: true });
    writeFileSync(
      resolve(legacyPlanDir, `${TEST_DATE}-orphan-epic.manifest.json`),
      JSON.stringify({
        phase: "plan",
        design: `.beastmode/state/design/${TEST_DATE}-orphan-epic.md`,
        features: [{ slug: "f1", plan: "plan.md", status: "pending" }],
        lastUpdated: `${TEST_DATE}T00:00:00Z`,
      }),
    );

    const { epics } = await scanEpics(TEST_ROOT);

    // Scanner only looks in pipeline/, so the legacy manifest is invisible
    expect(epics.filter((e) => e.slug === "orphan-epic")).toHaveLength(0);
  });

  // --- Multiple epics ---

  test("handles multiple epics simultaneously", async () => {
    writePipelineManifest("epic-one", "validate", [
      { slug: "f1", status: "completed" },
    ]);
    writePipelineManifest("epic-two", "design", []);

    const { epics } = await scanEpics(TEST_ROOT);
    expect(epics).toHaveLength(2);

    const one = epics.find((e) => e.slug === "epic-one")!;
    const two = epics.find((e) => e.slug === "epic-two")!;

    expect(one.phase).toBe("validate");
    expect(two.phase).toBe("design");
  });

  // --- GitHub integration ---

  test("preserves github epic issue from manifest", async () => {
    writePipelineManifest(
      "my-epic",
      "implement",
      [{ slug: "f1", status: "pending" }],
      { epic: 42, repo: "user/repo" },
    );
    const { epics } = await scanEpics(TEST_ROOT);
    expect(epics[0].githubEpicIssue).toBe(42);
  });

  // --- manifestPath ---

  test("manifestPath is the absolute path of the pipeline manifest", async () => {
    writePipelineManifest("my-epic", "implement", [
      { slug: "f1", status: "pending" },
    ]);
    const { epics } = await scanEpics(TEST_ROOT);

    expect(epics[0].manifestPath).toBe(
      resolve(
        TEST_ROOT,
        ".beastmode",
        "pipeline",
        `${TEST_DATE}-my-epic.manifest.json`,
      ),
    );
  });

  // --- Pure read-only ---

  test("pure read-only — does not write to filesystem", async () => {
    writePipelineManifest("my-epic", "implement", [
      { slug: "f1", status: "pending" },
    ]);

    const manifestBefore = Bun.file(
      resolve(
        TEST_ROOT,
        ".beastmode",
        "pipeline",
        `${TEST_DATE}-my-epic.manifest.json`,
      ),
    ).lastModified;

    await scanEpics(TEST_ROOT);

    const manifestAfter = Bun.file(
      resolve(
        TEST_ROOT,
        ".beastmode",
        "pipeline",
        `${TEST_DATE}-my-epic.manifest.json`,
      ),
    ).lastModified;

    expect(manifestAfter).toBe(manifestBefore);
  });

  // --- Valid manifest loads correctly ---

  test("valid manifest passes validation and loads correctly", async () => {
    writePipelineManifest("my-epic", "implement", [
      { slug: "feature-a", status: "pending" },
    ]);
    const { epics } = await scanEpics(TEST_ROOT);

    expect(epics).toHaveLength(1);
    expect(epics[0].phase).toBe("implement");
    expect(epics[0].features).toHaveLength(1);
    expect(epics[0].features[0].slug).toBe("feature-a");
  });
});
