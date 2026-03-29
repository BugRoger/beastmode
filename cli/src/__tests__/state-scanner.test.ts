import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import { scanEpics, slugFromDesign } from "../state-scanner";

const TEST_ROOT = resolve(import.meta.dir, "../../.test-state-scanner");

function setupTestRoot(): void {
  if (existsSync(TEST_ROOT)) {
    rmSync(TEST_ROOT, { recursive: true });
  }
  mkdirSync(resolve(TEST_ROOT, ".beastmode", "state", "design"), { recursive: true });
  mkdirSync(resolve(TEST_ROOT, ".beastmode", "state", "plan"), { recursive: true });
  // Minimal config so gate checks don't crash
  writeFileSync(
    resolve(TEST_ROOT, ".beastmode", "config.yaml"),
    `gates:\n  implement:\n    architectural-deviation: auto\n`,
  );
}

const TEST_DATE = "2026-03-29";

/** Write a design file for the given slug (required by scanner for epic discovery). */
function writeDesign(slug: string): void {
  writeFileSync(
    resolve(TEST_ROOT, ".beastmode", "state", "design", `${TEST_DATE}-${slug}.md`),
    `# ${slug}\n`,
  );
}

/** Write a manifest into state/plan/ (lower priority source). */
function writePlanManifest(
  slug: string,
  features: Array<{ slug: string; status: string }>,
  extra?: { github?: { epic: number; repo: string } },
): void {
  const manifest = {
    design: `.beastmode/state/design/${TEST_DATE}-${slug}.md`,
    architecturalDecisions: [],
    features: features.map((f) => ({
      slug: f.slug,
      plan: `${TEST_DATE}-${slug}-${f.slug}.md`,
      status: f.status,
    })),
    github: extra?.github,
    lastUpdated: `${TEST_DATE}T00:00:00Z`,
  };
  writeFileSync(
    resolve(TEST_ROOT, ".beastmode", "state", "plan", `${TEST_DATE}-${slug}.manifest.json`),
    JSON.stringify(manifest, null, 2),
  );
}

/** Write a manifest into pipeline/<slug>/ (higher priority source, wins dedup). */
function writePipelineManifest(
  slug: string,
  features: Array<{ slug: string; status: string }>,
  extra?: { github?: { epic: number; repo: string } },
): void {
  const dir = resolve(TEST_ROOT, ".beastmode", "pipeline", slug);
  mkdirSync(dir, { recursive: true });
  const manifest = {
    design: `.beastmode/state/design/${TEST_DATE}-${slug}.md`,
    architecturalDecisions: [],
    features: features.map((f) => ({
      slug: f.slug,
      plan: `${TEST_DATE}-${slug}-${f.slug}.md`,
      status: f.status,
    })),
    github: extra?.github,
    lastUpdated: `${TEST_DATE}T12:00:00Z`,
  };
  writeFileSync(resolve(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
}

/** Write a phase marker file in the pipeline directory. */
function writePipelinePhaseMarker(slug: string, phase: string): void {
  const dir = resolve(TEST_ROOT, ".beastmode", "pipeline");
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, `${phase}-${slug}`), "");
}

describe("slugFromDesign", () => {
  test("extracts slug from dated filename", () => {
    expect(slugFromDesign("2026-03-28-my-epic.md")).toBe("my-epic");
  });

  test("handles multi-segment slugs", () => {
    expect(slugFromDesign("2026-03-28-typescript-pipeline-orchestrator.md")).toBe(
      "typescript-pipeline-orchestrator",
    );
  });

  test("handles filename without date prefix", () => {
    expect(slugFromDesign("my-epic.md")).toBe("my-epic");
  });
});

describe("scanEpics", () => {
  beforeEach(() => {
    setupTestRoot();
  });

  afterEach(() => {
    if (existsSync(TEST_ROOT)) {
      rmSync(TEST_ROOT, { recursive: true });
    }
  });

  test("returns empty array when no manifests exist", async () => {
    const epics = await scanEpics(TEST_ROOT);
    expect(epics).toEqual([]);
  });

  test("discovers epic from plan manifest", async () => {
    writeDesign("my-epic");
    writePlanManifest("my-epic", [{ slug: "f1", status: "pending" }]);
    const epics = await scanEpics(TEST_ROOT);
    expect(epics).toHaveLength(1);
    expect(epics[0].slug).toBe("my-epic");
    expect(epics[0].phase).toBe("implement");
  });

  test("discovers epic from pipeline manifest", async () => {
    writeDesign("my-epic");
    writePipelineManifest("my-epic", [{ slug: "f1", status: "pending" }]);
    const epics = await scanEpics(TEST_ROOT);
    expect(epics).toHaveLength(1);
    expect(epics[0].slug).toBe("my-epic");
  });

  test("pipeline manifest wins dedup over plan manifest", async () => {
    writeDesign("my-epic");
    // Plan: feature is pending
    writePlanManifest("my-epic", [{ slug: "f1", status: "pending" }]);
    // Pipeline: feature is completed (more up-to-date)
    writePipelineManifest("my-epic", [{ slug: "f1", status: "completed" }]);

    const epics = await scanEpics(TEST_ROOT);
    expect(epics).toHaveLength(1);
    // Should use pipeline data (completed), not plan data (pending)
    expect(epics[0].features[0].status).toBe("completed");
    // lastUpdated should be from pipeline manifest (12:00:00Z not 00:00:00Z)
    expect(epics[0].lastUpdated).toContain("12:00:00");
  });

  test("manifest with empty features returns phase plan", async () => {
    writeDesign("my-epic");
    writePlanManifest("my-epic", []);
    const epics = await scanEpics(TEST_ROOT);
    expect(epics[0].phase).toBe("plan");
    expect(epics[0].nextAction?.phase).toBe("plan");
  });

  test("manifest with pending features returns next-action: implement", async () => {
    writeDesign("my-epic");
    writePlanManifest("my-epic", [
      { slug: "feature-a", status: "pending" },
      { slug: "feature-b", status: "pending" },
    ]);
    const epics = await scanEpics(TEST_ROOT);
    expect(epics[0].phase).toBe("implement");
    expect(epics[0].nextAction).toEqual({
      phase: "implement",
      args: ["my-epic"],
      type: "fan-out",
      features: ["feature-a", "feature-b"],
    });
  });

  test("manifest with mix of completed and pending features returns implement with pending only", async () => {
    writeDesign("my-epic");
    writePlanManifest("my-epic", [
      { slug: "feature-a", status: "completed" },
      { slug: "feature-b", status: "pending" },
      { slug: "feature-c", status: "in-progress" },
    ]);
    const epics = await scanEpics(TEST_ROOT);
    expect(epics[0].phase).toBe("implement");
    expect(epics[0].nextAction?.features).toEqual(["feature-b", "feature-c"]);
  });

  test("all features completed returns phase validate", async () => {
    writeDesign("my-epic");
    writePlanManifest("my-epic", [
      { slug: "feature-a", status: "completed" },
      { slug: "feature-b", status: "completed" },
    ]);
    const epics = await scanEpics(TEST_ROOT);
    expect(epics[0].phase).toBe("validate");
    expect(epics[0].nextAction).toEqual({
      phase: "validate",
      args: ["my-epic"],
      type: "single",
    });
  });

  test("all features completed + validate phase marker returns phase release", async () => {
    writeDesign("my-epic");
    writePlanManifest("my-epic", [{ slug: "feature-a", status: "completed" }]);
    writePipelinePhaseMarker("my-epic", "validate");
    const epics = await scanEpics(TEST_ROOT);
    expect(epics[0].phase).toBe("release");
    expect(epics[0].nextAction).toEqual({
      phase: "release",
      args: ["my-epic"],
      type: "single",
    });
  });

  test("release phase marker with completed features returns done", async () => {
    writeDesign("my-epic");
    writePlanManifest("my-epic", [{ slug: "feature-a", status: "completed" }]);
    writePipelinePhaseMarker("my-epic", "release");
    const epics = await scanEpics(TEST_ROOT);
    expect(epics[0].phase).toBe("release");
    expect(epics[0].nextAction).toBeNull();
  });

  test("identifies blocked features", async () => {
    writeDesign("my-epic");
    writePlanManifest("my-epic", [
      { slug: "feature-a", status: "blocked" },
      { slug: "feature-b", status: "pending" },
    ]);
    const epics = await scanEpics(TEST_ROOT);
    expect(epics[0].blocked).toBe(true);
    expect(epics[0].gateBlocked).toBe(true);
  });

  test("extracts feature progress from manifest", async () => {
    writeDesign("my-epic");
    writePlanManifest("my-epic", [
      { slug: "feature-a", status: "completed" },
      { slug: "feature-b", status: "in-progress" },
      { slug: "feature-c", status: "pending" },
    ]);
    const epics = await scanEpics(TEST_ROOT);
    expect(epics[0].features).toEqual([
      { slug: "feature-a", status: "completed", githubIssue: undefined },
      { slug: "feature-b", status: "in-progress", githubIssue: undefined },
      { slug: "feature-c", status: "pending", githubIssue: undefined },
    ]);
  });

  test("handles multiple epics from plan dir", async () => {
    writeDesign("epic-one");
    writeDesign("epic-two");
    writePlanManifest("epic-one", [{ slug: "f1", status: "completed" }]);
    writePlanManifest("epic-two", [{ slug: "f1", status: "pending" }]);
    const epics = await scanEpics(TEST_ROOT);
    expect(epics).toHaveLength(2);
    const one = epics.find((e) => e.slug === "epic-one")!;
    const two = epics.find((e) => e.slug === "epic-two")!;
    expect(one.phase).toBe("validate");
    expect(two.phase).toBe("implement");
  });

  test("preserves github epic issue from manifest", async () => {
    writeDesign("my-epic");
    writePlanManifest("my-epic", [{ slug: "f1", status: "pending" }], {
      github: { epic: 42, repo: "user/repo" },
    });
    const epics = await scanEpics(TEST_ROOT);
    expect(epics[0].githubEpicIssue).toBe(42);
  });

  test("includes lastUpdated from manifest", async () => {
    writeDesign("my-epic");
    writePlanManifest("my-epic", [{ slug: "f1", status: "pending" }]);
    const epics = await scanEpics(TEST_ROOT);
    expect(epics[0].lastUpdated).toBe(`${TEST_DATE}T00:00:00Z`);
  });

  test("designPath comes from manifest.design field", async () => {
    writeDesign("my-epic");
    writePlanManifest("my-epic", [{ slug: "f1", status: "pending" }]);
    const epics = await scanEpics(TEST_ROOT);
    // designPath is the absolute resolved path from the scanner
    expect(epics[0].designPath).toContain(`${TEST_DATE}-my-epic.md`);
  });

  test("pure read-only — does not write to filesystem", async () => {
    writeDesign("my-epic");
    writePlanManifest("my-epic", [{ slug: "f1", status: "pending" }]);
    const manifestPath = resolve(
      TEST_ROOT,
      ".beastmode",
      "state",
      "plan",
      `${TEST_DATE}-my-epic.manifest.json`,
    );
    const before = Bun.file(manifestPath).lastModified;
    await scanEpics(TEST_ROOT);
    const after = Bun.file(manifestPath).lastModified;
    expect(after).toBe(before);
  });
});
