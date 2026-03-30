import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "fs";
import { resolve, join } from "path";
import {
  parseFrontmatter,
  buildOutput,
  scanPlanFeatures,
  processArtifact,
  generateAll,
} from "../generate-output";

const TEST_ROOT = resolve(import.meta.dir, "../../.test-generate-output");
const ARTIFACTS_DIR = join(TEST_ROOT, ".beastmode", "artifacts");

function setup(): void {
  if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true });
  for (const phase of ["design", "plan", "implement", "validate", "release"]) {
    mkdirSync(join(ARTIFACTS_DIR, phase), { recursive: true });
  }
}

function teardown(): void {
  if (existsSync(TEST_ROOT)) rmSync(TEST_ROOT, { recursive: true });
}

function writeArtifact(phase: string, filename: string, content: string): string {
  const path = join(ARTIFACTS_DIR, phase, filename);
  writeFileSync(path, content);
  return path;
}

function readOutputJson(phase: string, basename: string): Record<string, unknown> {
  const path = join(ARTIFACTS_DIR, phase, `${basename}.output.json`);
  return JSON.parse(readFileSync(path, "utf-8"));
}

// --- parseFrontmatter ---

describe("parseFrontmatter", () => {
  test("parses basic frontmatter", () => {
    const fm = parseFrontmatter("---\nphase: design\nslug: my-epic\n---\n\n# Content");
    expect(fm.phase).toBe("design");
    expect(fm.slug).toBe("my-epic");
  });

  test("strips quotes from values", () => {
    const fm = parseFrontmatter('---\nslug: "my-epic"\nphase: \'plan\'\n---\n');
    expect(fm.slug).toBe("my-epic");
    expect(fm.phase).toBe("plan");
  });

  test("returns empty object when no frontmatter", () => {
    const fm = parseFrontmatter("# Just a heading\nSome content");
    expect(fm).toEqual({});
  });

  test("returns empty object when frontmatter is malformed (no closing ---)", () => {
    const fm = parseFrontmatter("---\nphase: design\nslug: test\n\n# No closing");
    expect(fm).toEqual({});
  });

  test("handles all known fields", () => {
    const fm = parseFrontmatter(
      "---\nphase: implement\nslug: s\nepic: e\nfeature: f\nstatus: completed\nbump: minor\n---\n",
    );
    expect(fm.phase).toBe("implement");
    expect(fm.epic).toBe("e");
    expect(fm.feature).toBe("f");
    expect(fm.status).toBe("completed");
    expect(fm.bump).toBe("minor");
  });
});

// --- buildOutput ---

describe("buildOutput", () => {
  test("design phase output", () => {
    const output = buildOutput("path/to/design.md", { phase: "design" }, ARTIFACTS_DIR);
    expect(output).toEqual({
      status: "completed",
      artifacts: { design: "path/to/design.md" },
    });
  });

  test("design phase with explicit status", () => {
    const output = buildOutput("design.md", { phase: "design", status: "error" }, ARTIFACTS_DIR);
    expect(output?.status).toBe("error");
  });

  test("implement phase output", () => {
    const output = buildOutput("impl.md", { phase: "implement", feature: "auth", status: "completed" }, ARTIFACTS_DIR);
    expect(output).toEqual({
      status: "completed",
      artifacts: { features: [{ slug: "auth", status: "completed" }] },
    });
  });

  test("implement phase defaults to unknown feature", () => {
    const output = buildOutput("impl.md", { phase: "implement" }, ARTIFACTS_DIR);
    expect(output?.artifacts).toEqual({ features: [{ slug: "unknown", status: "completed" }] });
  });

  test("validate phase output — passed", () => {
    const output = buildOutput("validate.md", { phase: "validate" }, ARTIFACTS_DIR);
    expect(output).toEqual({
      status: "completed",
      artifacts: { report: "validate.md", passed: true },
    });
  });

  test("validate phase output — failed", () => {
    const output = buildOutput("validate.md", { phase: "validate", status: "failed" }, ARTIFACTS_DIR);
    expect(output).toEqual({
      status: "error",
      artifacts: { report: "validate.md", passed: false },
    });
  });

  test("release phase output", () => {
    const output = buildOutput("release.md", { phase: "release", bump: "minor" }, ARTIFACTS_DIR);
    expect(output).toEqual({
      status: "completed",
      artifacts: { version: "minor", changelog: "release.md" },
    });
  });

  test("release phase defaults to patch bump", () => {
    const output = buildOutput("release.md", { phase: "release" }, ARTIFACTS_DIR);
    expect(output?.artifacts).toEqual({ version: "patch", changelog: "release.md" });
  });

  test("unknown phase returns undefined", () => {
    const output = buildOutput("x.md", { phase: "unknown" }, ARTIFACTS_DIR);
    expect(output).toBeUndefined();
  });
});

// --- scanPlanFeatures ---

describe("scanPlanFeatures", () => {
  beforeEach(setup);
  afterEach(teardown);

  test("finds features for matching epic", () => {
    writeArtifact("plan", "2026-03-30-my-epic-auth.md",
      "---\nphase: plan\nepic: my-epic\nfeature: auth\n---\n# Auth");
    writeArtifact("plan", "2026-03-30-my-epic-db.md",
      "---\nphase: plan\nepic: my-epic\nfeature: db\n---\n# DB");

    const features = scanPlanFeatures(ARTIFACTS_DIR, "my-epic");
    expect(features).toHaveLength(2);
    expect(features.map((f) => f.slug).sort()).toEqual(["auth", "db"]);
  });

  test("rejects features from different epic (strict frontmatter match)", () => {
    writeArtifact("plan", "2026-03-29-old-epic-stale.md",
      "---\nphase: plan\nepic: old-epic\nfeature: stale\n---\n# Stale");
    writeArtifact("plan", "2026-03-30-my-epic-fresh.md",
      "---\nphase: plan\nepic: my-epic\nfeature: fresh\n---\n# Fresh");

    const features = scanPlanFeatures(ARTIFACTS_DIR, "my-epic");
    expect(features).toHaveLength(1);
    expect(features[0].slug).toBe("fresh");
  });

  test("skips files without feature field", () => {
    writeArtifact("plan", "2026-03-30-my-epic.md",
      "---\nphase: plan\nepic: my-epic\nslug: my-epic\n---\n# Epic-level plan");

    const features = scanPlanFeatures(ARTIFACTS_DIR, "my-epic");
    expect(features).toHaveLength(0);
  });

  test("returns empty for undefined epic", () => {
    expect(scanPlanFeatures(ARTIFACTS_DIR, undefined)).toEqual([]);
  });

  test("returns empty when plan directory does not exist", () => {
    rmSync(join(ARTIFACTS_DIR, "plan"), { recursive: true });
    expect(scanPlanFeatures(ARTIFACTS_DIR, "my-epic")).toEqual([]);
  });
});

// --- processArtifact ---

describe("processArtifact", () => {
  beforeEach(setup);
  afterEach(teardown);

  test("generates output.json for a design artifact", () => {
    const path = writeArtifact("design", "2026-03-30-my-epic.md",
      "---\nphase: design\nslug: my-epic\n---\n# PRD");

    const result = processArtifact(path, ARTIFACTS_DIR);
    expect(result).toBe(true);

    const output = readOutputJson("design", "2026-03-30-my-epic");
    expect(output.status).toBe("completed");
    expect((output.artifacts as Record<string, string>).design).toBe(path);
  });

  test("generates output.json for a plan artifact with features", () => {
    writeArtifact("plan", "2026-03-30-my-epic-auth.md",
      "---\nphase: plan\nepic: my-epic\nfeature: auth\n---\n# Auth");
    const planPath = writeArtifact("plan", "2026-03-30-my-epic.md",
      "---\nphase: plan\nepic: my-epic\nslug: my-epic\n---\n# Plan");

    processArtifact(planPath, ARTIFACTS_DIR);

    const output = readOutputJson("plan", "2026-03-30-my-epic");
    const features = (output.artifacts as Record<string, unknown>).features as Array<{ slug: string }>;
    expect(features).toHaveLength(1);
    expect(features[0].slug).toBe("auth");
  });

  test("skips artifact without phase frontmatter", () => {
    const path = writeArtifact("design", "no-phase.md",
      "---\nslug: test\n---\n# No phase");
    expect(processArtifact(path, ARTIFACTS_DIR)).toBe(false);
  });

  test("skips regeneration when output is newer than artifact", () => {
    const path = writeArtifact("design", "2026-03-30-cached.md",
      "---\nphase: design\nslug: cached\n---\n# Cached");

    // First generation
    processArtifact(path, ARTIFACTS_DIR);
    const firstOutput = readOutputJson("design", "2026-03-30-cached");

    // Touch the output to make it newer (it already is, but let's be sure)
    const outputPath = join(ARTIFACTS_DIR, "design", "2026-03-30-cached.output.json");
    writeFileSync(outputPath, JSON.stringify(firstOutput, null, 2) + "\n");

    // Second call should skip
    expect(processArtifact(path, ARTIFACTS_DIR)).toBe(false);
  });
});

// --- generateAll ---

describe("generateAll", () => {
  beforeEach(setup);
  afterEach(teardown);

  test("processes artifacts across multiple phases", () => {
    writeArtifact("design", "2026-03-30-epic.md",
      "---\nphase: design\nslug: epic\n---\n# PRD");
    writeArtifact("validate", "2026-03-30-epic.md",
      "---\nphase: validate\nstatus: passed\n---\n# Report");

    const count = generateAll(ARTIFACTS_DIR);
    expect(count).toBe(2);

    expect(existsSync(join(ARTIFACTS_DIR, "design", "2026-03-30-epic.output.json"))).toBe(true);
    expect(existsSync(join(ARTIFACTS_DIR, "validate", "2026-03-30-epic.output.json"))).toBe(true);
  });

  test("returns 0 when artifacts dir does not exist", () => {
    rmSync(TEST_ROOT, { recursive: true });
    expect(generateAll(ARTIFACTS_DIR)).toBe(0);
  });

  test("skips non-md files", () => {
    writeFileSync(join(ARTIFACTS_DIR, "design", "notes.txt"), "not an artifact");
    expect(generateAll(ARTIFACTS_DIR)).toBe(0);
  });

  test("the bug scenario: stale plan features are excluded by frontmatter", () => {
    // Stale artifact from old epic still in plan/ dir
    writeArtifact("plan", "2026-03-29-done-status-v2-github-sync.md",
      "---\nphase: plan\nepic: done-status-v2\nfeature: github-sync\n---\n# Old feature");

    // Current epic's plan artifact
    writeArtifact("plan", "2026-03-30-remove-persona-voice.md",
      "---\nphase: plan\nepic: remove-persona-voice\nslug: remove-persona-voice\n---\n# Plan");

    // Current epic's feature plan
    writeArtifact("plan", "2026-03-30-remove-persona-voice-strip.md",
      "---\nphase: plan\nepic: remove-persona-voice\nfeature: strip-persona-import\n---\n# Strip");

    generateAll(ARTIFACTS_DIR);

    // The stale artifact's output should only contain done-status-v2 features
    const staleOutput = readOutputJson("plan", "2026-03-29-done-status-v2-github-sync");
    const staleFeatures = (staleOutput.artifacts as Record<string, unknown>).features as Array<{ slug: string }>;
    expect(staleFeatures).toHaveLength(1);
    expect(staleFeatures[0].slug).toBe("github-sync");

    // The current epic's output should only contain remove-persona-voice features
    const currentOutput = readOutputJson("plan", "2026-03-30-remove-persona-voice");
    const currentFeatures = (currentOutput.artifacts as Record<string, unknown>).features as Array<{ slug: string }>;
    expect(currentFeatures).toHaveLength(1);
    expect(currentFeatures[0].slug).toBe("strip-persona-import");
  });
});
