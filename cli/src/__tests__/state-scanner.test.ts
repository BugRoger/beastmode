import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { resolve } from "path";
import { listEnriched, slugFromDesign, slugFromManifest, validate } from "../manifest-store";

const TEST_ROOT = resolve(import.meta.dir, "../../.test-state-scanner");
const TEST_DATE = "2026-03-29";

function setupTestRoot(): void {
  if (existsSync(TEST_ROOT)) { rmSync(TEST_ROOT, { recursive: true }); }
  mkdirSync(resolve(TEST_ROOT, ".beastmode", "state"), { recursive: true });
  writeFileSync(
    resolve(TEST_ROOT, ".beastmode", "config.yaml"),
    `gates:\n  design:\n    decision-tree: human\n  implement:\n    architectural-deviation: auto\n`,
  );
}

function writePipelineManifest(
  slug: string, phase: string,
  features: Array<{ slug: string; status: string }>,
  github?: { epic: number; repo: string },
): void {
  const manifest = {
    slug, phase,
    features: features.map((f) => ({ slug: f.slug, plan: `${TEST_DATE}-${slug}-${f.slug}.md`, status: f.status })),
    artifacts: {}, github,
    lastUpdated: `${TEST_DATE}T00:00:00Z`,
  };
  writeFileSync(
    resolve(TEST_ROOT, ".beastmode", "state", `${TEST_DATE}-${slug}.manifest.json`),
    JSON.stringify(manifest, null, 2),
  );
}

function writeRawManifest(slug: string, content: unknown): void {
  writeFileSync(
    resolve(TEST_ROOT, ".beastmode", "state", `${TEST_DATE}-${slug}.manifest.json`),
    typeof content === "string" ? content : JSON.stringify(content, null, 2),
  );
}

describe("slugFromDesign", () => {
  test("extracts slug from dated design filename", () => {
    expect(slugFromDesign("2026-03-28-my-epic.md")).toBe("my-epic");
  });
  test("handles multi-segment slugs", () => {
    expect(slugFromDesign("2026-03-28-typescript-pipeline-orchestrator.md")).toBe("typescript-pipeline-orchestrator");
  });
  test("handles filename without date prefix", () => {
    expect(slugFromDesign("my-epic.md")).toBe("my-epic");
  });
});

describe("slugFromManifest", () => {
  test("extracts slug from dated manifest filename", () => {
    expect(slugFromManifest("2026-03-28-my-epic.manifest.json")).toBe("my-epic");
  });
  test("handles multi-segment slugs", () => {
    expect(slugFromManifest("2026-03-28-typescript-pipeline-orchestrator.manifest.json")).toBe("typescript-pipeline-orchestrator");
  });
  test("handles manifest filename without date prefix", () => {
    expect(slugFromManifest("my-epic.manifest.json")).toBe("my-epic");
  });
});

describe("validate", () => {
  test("accepts valid manifest", () => {
    expect(validate({ slug: "x", phase: "implement", features: [{ slug: "f1", status: "pending" }], lastUpdated: "2026-03-29T00:00:00Z" })).toBe(true);
  });
  test("rejects missing phase", () => {
    expect(validate({ slug: "x", features: [{ slug: "f1", status: "pending" }], lastUpdated: "2026-03-29T00:00:00Z" })).toBe(false);
  });
  test("rejects invalid phase", () => {
    expect(validate({ slug: "x", phase: "nope", features: [], lastUpdated: "2026-03-29T00:00:00Z" })).toBe(false);
  });
  test("rejects missing slug", () => {
    expect(validate({ phase: "plan", features: [], lastUpdated: "2026-03-29T00:00:00Z" })).toBe(false);
  });
  test("rejects missing features", () => {
    expect(validate({ slug: "x", phase: "implement", lastUpdated: "2026-03-29T00:00:00Z" })).toBe(false);
  });
  test("rejects unknown feature status", () => {
    expect(validate({ slug: "x", phase: "implement", features: [{ slug: "f1", status: "bad" }], lastUpdated: "2026-03-29T00:00:00Z" })).toBe(false);
  });
  test("rejects null", () => { expect(validate(null)).toBe(false); });
  test("rejects non-object", () => { expect(validate("string")).toBe(false); });
});

describe("listEnriched", () => {
  beforeEach(setupTestRoot);
  afterEach(() => { if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true }); });

  test("returns empty when no pipeline dir", async () => {
    rmSync(resolve(TEST_ROOT, ".beastmode", "state"), { recursive: true });
    const result = listEnriched(TEST_ROOT);
    expect(result.epics).toEqual([]);
  });

  test("returns empty when no manifests", async () => {
    const result = listEnriched(TEST_ROOT);
    expect(result.epics).toEqual([]);
  });

  test("design phase with human gate is blocked", async () => {
    writePipelineManifest("my-epic", "design", []);
    const { epics } = listEnriched(TEST_ROOT);
    expect(epics).toHaveLength(1);
    expect(epics[0].slug).toBe("my-epic");
    expect(epics[0].blocked).toBeTruthy();
    expect(epics[0].nextAction).toBeNull();
  });

  test("plan phase with empty features returns next-action: plan", async () => {
    writePipelineManifest("my-epic", "plan", []);
    const { epics } = listEnriched(TEST_ROOT);
    expect(epics[0].nextAction?.phase).toBe("plan");
  });

  test("implement phase with pending features returns fan-out", async () => {
    writePipelineManifest("my-epic", "implement", [
      { slug: "feature-a", status: "pending" },
      { slug: "feature-b", status: "pending" },
    ]);
    const { epics } = listEnriched(TEST_ROOT);
    expect(epics[0].nextAction).toEqual({
      phase: "implement", args: ["my-epic"], type: "fan-out",
      features: ["feature-a", "feature-b"],
    });
  });

  test("mix of completed and pending features", async () => {
    writePipelineManifest("my-epic", "implement", [
      { slug: "feature-a", status: "completed" },
      { slug: "feature-b", status: "pending" },
      { slug: "feature-c", status: "in-progress" },
    ]);
    const { epics } = listEnriched(TEST_ROOT);
    expect(epics[0].nextAction?.features).toEqual(["feature-b", "feature-c"]);
  });

  test("all features completed returns null next-action", async () => {
    writePipelineManifest("my-epic", "implement", [
      { slug: "feature-a", status: "completed" },
      { slug: "feature-b", status: "completed" },
    ]);
    const { epics } = listEnriched(TEST_ROOT);
    expect(epics[0].nextAction).toBeNull();
  });

  test("validate phase returns next-action: validate", async () => {
    writePipelineManifest("my-epic", "validate", [
      { slug: "f-a", status: "completed" },
      { slug: "f-b", status: "completed" },
    ]);
    const { epics } = listEnriched(TEST_ROOT);
    expect(epics[0].nextAction).toEqual({ phase: "validate", args: ["my-epic"], type: "single" });
  });

  test("release phase returns next-action: release", async () => {
    writePipelineManifest("my-epic", "release", [{ slug: "f1", status: "completed" }]);
    const { epics } = listEnriched(TEST_ROOT);
    expect(epics[0].nextAction).toEqual({ phase: "release", args: ["my-epic"], type: "single" });
  });

  test("extracts features from manifest", async () => {
    writePipelineManifest("my-epic", "implement", [
      { slug: "feature-a", status: "completed" },
      { slug: "feature-b", status: "in-progress" },
      { slug: "feature-c", status: "pending" },
    ]);
    const { epics } = listEnriched(TEST_ROOT);
    expect(epics[0].features).toHaveLength(3);
    expect(epics[0].features[0].slug).toBe("feature-a");
    expect(epics[0].features[0].status).toBe("completed");
  });

  test("invalid manifests are silently skipped", async () => {
    writePipelineManifest("good-one", "implement", [{ slug: "f1", status: "pending" }]);
    writeRawManifest("broken-json", "not json {{{");
    writeRawManifest("bad-phase", { slug: "bad", phase: "nope", features: [], lastUpdated: "2026-03-29T00:00:00Z" });
    const { epics } = listEnriched(TEST_ROOT);
    expect(epics).toHaveLength(1);
    expect(epics[0].slug).toBe("good-one");
  });

  test("implement phase with only auto gates is not blocked", async () => {
    writePipelineManifest("auto-epic", "implement", [{ slug: "f1", status: "pending" }]);
    const { epics } = listEnriched(TEST_ROOT);
    const autoEpic = epics.find((e) => e.slug === "auto-epic");
    expect(autoEpic!.blocked).toBeFalsy();
    expect(autoEpic!.nextAction).not.toBeNull();
  });

  test("validate phase human gate blocks epic", async () => {
    writeFileSync(resolve(TEST_ROOT, ".beastmode", "config.yaml"), `gates:\n  validate:\n    qa-review: human\n`);
    writePipelineManifest("val-epic", "validate", [{ slug: "f1", status: "completed" }]);
    const { epics } = listEnriched(TEST_ROOT);
    const valEpic = epics.find((e) => e.slug === "val-epic");
    expect(valEpic!.blocked).toBeTruthy();
    expect(valEpic!.nextAction).toBeNull();
  });

  test("only pipeline manifests appear — design files ignored", async () => {
    const designDir = resolve(TEST_ROOT, ".beastmode", "state", "design");
    mkdirSync(designDir, { recursive: true });
    writeFileSync(resolve(designDir, `${TEST_DATE}-orphan-epic.md`), "# Orphan\n");
    const { epics } = listEnriched(TEST_ROOT);
    expect(epics.filter((e) => e.slug === "orphan-epic")).toHaveLength(0);
  });

  test("handles multiple epics simultaneously", async () => {
    writePipelineManifest("epic-one", "validate", [{ slug: "f1", status: "completed" }]);
    writePipelineManifest("epic-two", "plan", []);
    const { epics } = listEnriched(TEST_ROOT);
    expect(epics).toHaveLength(2);
    const one = epics.find((e) => e.slug === "epic-one")!;
    const two = epics.find((e) => e.slug === "epic-two")!;
    expect(one.phase).toBe("validate");
    expect(two.phase).toBe("plan");
  });

  test("preserves github info from manifest", async () => {
    writePipelineManifest("my-epic", "implement", [{ slug: "f1", status: "pending" }], { epic: 42, repo: "user/repo" });
    const { epics } = listEnriched(TEST_ROOT);
    expect(epics[0].github?.epic).toBe(42);
  });

  test("manifestPath is absolute path of pipeline manifest", async () => {
    writePipelineManifest("my-epic", "implement", [{ slug: "f1", status: "pending" }]);
    const { epics } = listEnriched(TEST_ROOT);
    expect(epics[0].manifestPath).toBe(
      resolve(TEST_ROOT, ".beastmode", "state", `${TEST_DATE}-my-epic.manifest.json`),
    );
  });

  test("pure read-only — does not write to filesystem", async () => {
    writePipelineManifest("my-epic", "implement", [{ slug: "f1", status: "pending" }]);
    const path = resolve(TEST_ROOT, ".beastmode", "state", `${TEST_DATE}-my-epic.manifest.json`);
    const before = Bun.file(path).lastModified;
    listEnriched(TEST_ROOT);
    const after = Bun.file(path).lastModified;
    expect(after).toBe(before);
  });
});
